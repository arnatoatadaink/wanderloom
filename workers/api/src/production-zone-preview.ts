import {
  buildProductionContentBalanceMatrix,
  INITIAL_PRODUCTION_LOSS_POLICY,
  type DurationClass,
  type ZoneId
} from "@wanderloom/game-core";
import {
  buildProductionZoneCatalog,
  type ProductionZoneCatalogEntry
} from "./production-zone-catalog";

export interface ProductionRewardRangePreview {
  readonly min: number;
  readonly max: number;
}

export interface ProductionZoneDurationPreview {
  readonly durationId: "short" | "medium" | "long";
  readonly durationMs: number;
  readonly preview: {
    readonly gold: ProductionRewardRangePreview;
    readonly exp: ProductionRewardRangePreview;
    readonly drops: {
      readonly minItems: number;
      readonly maxItems: number;
    };
  };
  readonly risk: {
    readonly failureProbability: number;
    readonly lossPolicy: typeof INITIAL_PRODUCTION_LOSS_POLICY;
  };
  readonly rarities: readonly string[];
}

export interface ProductionZonePreview {
  readonly zoneId: ZoneId;
  readonly name: string;
  readonly minimumZoneRank: number;
  readonly unlocked: boolean;
  readonly durations: readonly ProductionZoneDurationPreview[];
}

const DURATION_CLASS_BY_ID: Readonly<Record<"short" | "medium" | "long", DurationClass>> = {
  short: "Short",
  medium: "Medium",
  long: "Long"
};

function buildDurationPreview(
  zone: ProductionZoneCatalogEntry,
  durationId: "short" | "medium" | "long"
): ProductionZoneDurationPreview {
  const report = buildProductionContentBalanceMatrix();
  const durationClass = DURATION_CLASS_BY_ID[durationId];
  const row = report.rows.find(
    (candidate) =>
      candidate.zone.zoneId === zone.zoneId &&
      candidate.durationClass === durationClass &&
      candidate.formationClass === "Solo"
  );
  if (!row) {
    throw new Error("missing production balance row");
  }

  const duration = zone.durations.find(
    (candidate) => candidate.durationId === durationId
  );
  if (!duration) {
    throw new Error("missing production duration catalog entry");
  }

  const successGold = Math.max(
    0,
    row.economy.grossReward - row.economy.finalGoldRequirement
  );
  const failureGold = Math.max(
    0,
    row.economy.grossReward * INITIAL_PRODUCTION_LOSS_POLICY.retainedGoldRatio -
      row.economy.finalGoldRequirement
  );
  const generatedExp = row.lossExpectation.generatedExp;
  const failureExp = generatedExp * INITIAL_PRODUCTION_LOSS_POLICY.retainedExpRatio;
  const rarities = Object.entries(row.rarity.probabilityByRarity)
    .filter(([, probability]) => probability > 0)
    .map(([rarity]) => rarity);

  return {
    durationId,
    durationMs: duration.durationMs,
    preview: {
      gold: { min: failureGold, max: successGold },
      exp: { min: failureExp, max: generatedExp },
      drops: { minItems: 0, maxItems: 1 }
    },
    risk: {
      failureProbability: row.riskFailure.failureProbability,
      lossPolicy: INITIAL_PRODUCTION_LOSS_POLICY
    },
    rarities
  };
}

export function buildProductionZonePreview(
  zoneRank: number
): readonly ProductionZonePreview[] {
  return buildProductionZoneCatalog(zoneRank).map((zone) => ({
    zoneId: zone.zoneId,
    name: zone.name,
    minimumZoneRank: zone.minimumZoneRank,
    unlocked: zone.unlocked,
    durations: zone.durations.map((duration) =>
      buildDurationPreview(zone, duration.durationId)
    )
  }));
}
