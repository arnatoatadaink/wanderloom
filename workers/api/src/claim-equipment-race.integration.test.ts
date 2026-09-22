import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";

import {
  calculateClaim,
  equipItem,
  type ExplorationId,
  type ItemDefinitionId,
  type ItemInstanceId,
  type PlayerId,
  type PlayerInventorySnapshot,
  type ZoneId
} from "@wanderloom/game-core";
import { type ApiDatabase } from "./api";
import { D1AtomicMutationRepository } from "./persistence/d1-atomic-mutation-repository";
import { D1CoreSnapshotRepository } from "./persistence/d1-core-snapshot-repository";
import { D1InventorySnapshotRepository } from "./persistence/d1-inventory-snapshot-repository";
import { bootstrapGuestPlayer } from "./services/guest-bootstrap";
import { persistStartedExploration } from "./services/start-exploration-persistence";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: ApiDatabase;
    TEST_MIGRATIONS: D1Migration[];
  }
}

const zoneId = "m1-smoke-frontier" as ZoneId;
const existingItemDefinitionId = "m1-wayfarer-charm" as ItemDefinitionId;
const claimDropDefinitionId = "m1-race-drop" as ItemDefinitionId;

function existingItem(id: string) {
  return {
    itemInstanceId: id as ItemInstanceId,
    itemDefinitionId: existingItemDefinitionId,
    createdAt: "2026-09-22T00:00:00.000Z"
  };
}

function claimDrop(id: string) {
  return {
    itemInstanceId: id as ItemInstanceId,
    itemDefinitionId: claimDropDefinitionId,
    createdAt: "2026-09-22T00:05:01.000Z"
  };
}

async function prepareRace(playerName: string) {
  const db = env.DB as unknown as ApiDatabase;
  const playerId = playerName as PlayerId;
  const coreRepository = new D1CoreSnapshotRepository(db);
  const inventoryRepository = new D1InventorySnapshotRepository(db);

  await bootstrapGuestPlayer(db, {
    playerId,
    createdAt: "2026-09-22T00:00:00.000Z"
  });

  const initialInventory = await inventoryRepository.findByPlayerId(playerId);
  if (initialInventory === null) throw new Error("missing initial inventory");

  const item = existingItem(`${playerName}-existing`);
  const inventoryWithItem: PlayerInventorySnapshot = {
    ...initialInventory,
    stateVersion: 1,
    items: [item],
    updatedAt: "2026-09-22T00:00:01.000Z"
  };
  expect(
    await inventoryRepository.updateIfVersionMatches(inventoryWithItem, 0)
  ).toBe(true);

  const initialCore = await coreRepository.findByPlayerId(playerId);
  if (initialCore === null) throw new Error("missing initial core");

  const explorationId = `${playerName}-exploration` as ExplorationId;
  const started = await persistStartedExploration(coreRepository, {
    player: initialCore,
    zoneId,
    durationId: "short",
    durationMs: 300_000,
    explorationId,
    claimNonce: `${playerName}-nonce`,
    seed: `${playerName}-seed`,
    startedAt: "2026-09-22T00:00:00.000Z"
  });
  if (!started.ok) throw new Error("failed to prepare exploration");

  const core = await coreRepository.findByPlayerId(playerId);
  const inventory = await inventoryRepository.findByPlayerId(playerId);
  if (core?.activeExploration === null || !core || inventory === null) {
    throw new Error("race snapshots missing");
  }

  const equipped = equipItem({
    inventory,
    slot: "charm",
    itemInstanceId: item.itemInstanceId,
    equippedAt: "2026-09-22T00:05:01.000Z"
  });
  if (!equipped.ok) throw new Error("failed to prepare equipment mutation");

  const drop = claimDrop(`${playerName}-claim-drop`);
  const claimed = calculateClaim({
    core,
    inventory,
    exploration: core.activeExploration,
    resolution: {
      result: "success",
      gold: 5,
      exp: 10,
      drops: [drop],
      summaryMetrics: {}
    },
    claimedAt: "2026-09-22T00:05:01.000Z"
  });
  if (!claimed.ok) throw new Error("failed to prepare claim mutation");

  return {
    db,
    playerId,
    item,
    drop,
    coreRepository,
    inventoryRepository,
    equipped: equipped.value,
    claimed: claimed.value
  };
}

function atomic(db: ApiDatabase) {
  return new D1AtomicMutationRepository(db, {
    recentArchiveRetention: 3,
    guardTokenFactory: () => crypto.randomUUID()
  });
}

describe("CP-18 claim/equipment race with real D1", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("preserves equipment when equip wins and claim retries from fresh inventory", async () => {
    const race = await prepareRace("player-cp18-equip-first");
    const repository = atomic(race.db);

    const equipCommit = await repository.commit({
      kind: "inventory",
      playerId: race.playerId,
      expectedInventoryStateVersion:
        race.equipped.previousInventoryStateVersion,
      nextInventory: race.equipped.nextInventory
    });
    expect(equipCommit.ok).toBe(true);

    const staleClaim = await repository.commit({
      kind: "claim",
      playerId: race.playerId,
      claimNonce: race.claimed.archiveEntry.explorationId
        ? "player-cp18-equip-first-nonce"
        : "",
      expectedCoreStateVersion: race.claimed.previousCoreStateVersion,
      nextCore: race.claimed.nextCore,
      expectedInventoryStateVersion:
        race.claimed.previousInventoryStateVersion,
      nextInventory: race.claimed.nextInventory,
      archiveEntry: race.claimed.archiveEntry
    });
    expect(staleClaim).toMatchObject({
      ok: false,
      error: {
        code: "version_conflict",
        snapshot: "inventory",
        expectedVersion: 1,
        actualVersion: 2
      }
    });

    const currentCore = await race.coreRepository.findByPlayerId(race.playerId);
    const currentInventory = await race.inventoryRepository.findByPlayerId(
      race.playerId
    );
    if (currentCore?.activeExploration === null || !currentCore || currentInventory === null) {
      throw new Error("fresh race state missing");
    }
    expect(currentInventory.equipment.slots.charm).toBe(
      race.item.itemInstanceId
    );
    expect(currentInventory.items).toHaveLength(1);

    const retryClaim = calculateClaim({
      core: currentCore,
      inventory: currentInventory,
      exploration: currentCore.activeExploration,
      resolution: {
        result: "success",
        gold: 5,
        exp: 10,
        drops: [race.drop],
        summaryMetrics: {}
      },
      claimedAt: "2026-09-22T00:05:02.000Z"
    });
    if (!retryClaim.ok) throw new Error("fresh claim retry did not calculate");

    const retryCommit = await repository.commit({
      kind: "claim",
      playerId: race.playerId,
      claimNonce: currentCore.activeExploration.claimNonce,
      expectedCoreStateVersion: retryClaim.value.previousCoreStateVersion,
      nextCore: retryClaim.value.nextCore,
      expectedInventoryStateVersion:
        retryClaim.value.previousInventoryStateVersion,
      nextInventory: retryClaim.value.nextInventory,
      archiveEntry: retryClaim.value.archiveEntry
    });
    expect(retryCommit.ok).toBe(true);

    const finalInventory = await race.inventoryRepository.findByPlayerId(
      race.playerId
    );
    expect(finalInventory?.equipment.slots.charm).toBe(race.item.itemInstanceId);
    expect(finalInventory?.items.map((entry) => entry.itemInstanceId)).toEqual([
      race.item.itemInstanceId,
      race.drop.itemInstanceId
    ]);
  });

  it("allows exactly one of two competing claims and classifies the other as already claimed", async () => {
    const race = await prepareRace("player-cp18-double-claim");
    const firstRepository = atomic(race.db);
    const secondRepository = atomic(race.db);
    const mutation = {
      kind: "claim" as const,
      playerId: race.playerId,
      claimNonce: "player-cp18-double-claim-nonce",
      expectedCoreStateVersion: race.claimed.previousCoreStateVersion,
      nextCore: race.claimed.nextCore,
      expectedInventoryStateVersion:
        race.claimed.previousInventoryStateVersion,
      nextInventory: race.claimed.nextInventory,
      archiveEntry: race.claimed.archiveEntry
    };

    const [first, second] = await Promise.all([
      firstRepository.commit(mutation),
      secondRepository.commit(mutation)
    ]);

    const results = [first, second];
    expect(results.filter((entry) => entry.ok)).toHaveLength(1);
    expect(
      results.filter((entry) => !entry.ok).map((entry) =>
        entry.ok ? null : entry.error.code
      )
    ).toEqual(["already_claimed"]);

    const finalInventory = await race.inventoryRepository.findByPlayerId(
      race.playerId
    );
    expect(finalInventory?.items.map((entry) => entry.itemInstanceId)).toEqual([
      race.item.itemInstanceId,
      race.drop.itemInstanceId
    ]);

    const archiveCount = await race.db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM recent_archive
         WHERE player_id = ?1
           AND exploration_id = ?2`
      )
      .bind(race.playerId, race.claimed.archiveEntry.explorationId)
      .first<{ count: number }>();
    expect(archiveCount?.count).toBe(1);

    // Retrying the same committed mutation models a client whose successful
    // response was lost after D1 committed the claim.
    const lostResponseRetry = await atomic(race.db).commit(mutation);
    expect(lostResponseRetry).toMatchObject({
      ok: false,
      error: {
        code: "already_claimed"
      }
    });
  });

  it("preserves claimed drop when claim wins and equipment retries from fresh inventory", async () => {
    const race = await prepareRace("player-cp18-claim-first");
    const repository = atomic(race.db);

    const claimCommit = await repository.commit({
      kind: "claim",
      playerId: race.playerId,
      claimNonce: "player-cp18-claim-first-nonce",
      expectedCoreStateVersion: race.claimed.previousCoreStateVersion,
      nextCore: race.claimed.nextCore,
      expectedInventoryStateVersion:
        race.claimed.previousInventoryStateVersion,
      nextInventory: race.claimed.nextInventory,
      archiveEntry: race.claimed.archiveEntry
    });
    expect(claimCommit.ok).toBe(true);

    const staleEquip = await repository.commit({
      kind: "inventory",
      playerId: race.playerId,
      expectedInventoryStateVersion:
        race.equipped.previousInventoryStateVersion,
      nextInventory: race.equipped.nextInventory
    });
    expect(staleEquip).toMatchObject({
      ok: false,
      error: {
        code: "version_conflict",
        snapshot: "inventory",
        expectedVersion: 1,
        actualVersion: 2
      }
    });

    const currentInventory = await race.inventoryRepository.findByPlayerId(
      race.playerId
    );
    if (currentInventory === null) throw new Error("fresh inventory missing");
    expect(currentInventory.items.map((entry) => entry.itemInstanceId)).toEqual([
      race.item.itemInstanceId,
      race.drop.itemInstanceId
    ]);
    expect(currentInventory.equipment.slots.charm ?? null).toBeNull();

    const retryEquip = equipItem({
      inventory: currentInventory,
      slot: "charm",
      itemInstanceId: race.item.itemInstanceId,
      equippedAt: "2026-09-22T00:05:02.000Z"
    });
    if (!retryEquip.ok) throw new Error("fresh equipment retry did not calculate");

    const retryCommit = await repository.commit({
      kind: "inventory",
      playerId: race.playerId,
      expectedInventoryStateVersion:
        retryEquip.value.previousInventoryStateVersion,
      nextInventory: retryEquip.value.nextInventory
    });
    expect(retryCommit.ok).toBe(true);

    const finalInventory = await race.inventoryRepository.findByPlayerId(
      race.playerId
    );
    expect(finalInventory?.equipment.slots.charm).toBe(race.item.itemInstanceId);
    expect(finalInventory?.items.map((entry) => entry.itemInstanceId)).toEqual([
      race.item.itemInstanceId,
      race.drop.itemInstanceId
    ]);
  });
});
