import { expect, type Page, type Route } from "@playwright/test";
import type {
  ActiveExplorationDto,
  CoreDto,
  GoogleDriveConnectionStateDto,
  InventoryDto,
  ItemDto
} from "../src/api-client";

export type SyncOutcome = "success" | "network" | 429 | 503;
const PLAYER_ID = "browser-m4-player";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const DROP: ItemDto = {
  itemInstanceId: "browser-reward-charm",
  itemDefinitionId: "M4 Browser Charm",
  rarity: "Common",
  createdAt: "2026-01-01T00:00:00.000Z"
};

// This fixture owns the API boundary, never a Worker or a local D1 database.
export class M4Fixture {
  driveState: GoogleDriveConnectionStateDto = "connected";
  syncOutcomes: SyncOutcome[] = [];
  statusFailures = 0;
  instantExploration = false;
  readonly calls: string[] = [];
  readonly unexpected: string[] = [];
  readonly pageErrors: string[] = [];
  private releaseSync: (() => void) | undefined;
  private syncGate: Promise<void> | undefined;
  private core: CoreDto;
  private inventory: InventoryDto = {
    stateVersion: 1,
    equipment: { slots: { charm: null } },
    items: []
  };

  constructor(private readonly page: Page, claimable = false) {
    this.core = {
      stateVersion: 1,
      progression: { level: 1, gold: 100, exp: 10 },
      activeExploration: claimable ? this.exploration(true) : null
    };
  }

  holdNextSync(): void {
    this.syncGate = new Promise((resolve) => { this.releaseSync = resolve; });
  }

  releaseHeldSync(): void {
    this.releaseSync?.();
    this.syncGate = undefined;
  }

  count(path: string, method = "POST"): number {
    return this.calls.filter((call) => call === `${method} ${path}`).length;
  }

  async install(): Promise<void> {
    this.page.on("pageerror", (error) => this.pageErrors.push(error.message));
    // Seed returning-player identity, and fake only the external GIS interface.
    // sessionStorage keeps consent counts across reloads in each isolated context.
    await this.page.addInitScript(() => {
      localStorage.setItem("wanderloom.playerId", "browser-m4-player");
      localStorage.setItem("wanderloom.training.completed", "1");
      const fakeWindow = window as typeof window & {
        __m4Gis: { requests: number; outcome: "success" | "cancel" };
      };
      fakeWindow.__m4Gis = {
        requests: Number(sessionStorage.getItem("m4.oauth.requests") ?? "0"),
        outcome: "success"
      };
      window.google = {
        accounts: {
          id: { initialize() {}, renderButton() {} },
          oauth2: {
            initCodeClient(config) {
              return {
                requestCode() {
                  fakeWindow.__m4Gis.requests += 1;
                  sessionStorage.setItem("m4.oauth.requests", String(fakeWindow.__m4Gis.requests));
                  queueMicrotask(() => {
                    if (fakeWindow.__m4Gis.outcome === "cancel") {
                      config.error_callback?.({ type: "popup_closed" });
                    } else {
                      config.callback({ code: "fixture-authorization-code" });
                    }
                  });
                }
              };
            }
          }
        }
      };
    });
    await this.page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== "http://127.0.0.1:4177") {
        this.unexpected.push(`External request: ${url.origin}${url.pathname}`);
        await route.abort("blockedbyclient");
      } else if (url.pathname.startsWith("/api/")) {
        await this.api(route, url.pathname);
      } else {
        await route.continue();
      }
    });
  }

  async oauthCount(): Promise<number> {
    return this.page.evaluate(() => Number(sessionStorage.getItem("m4.oauth.requests") ?? "0"));
  }

  async setPopupOutcome(outcome: "success" | "cancel"): Promise<void> {
    await this.page.evaluate((next) => {
      (window as typeof window & { __m4Gis: { outcome: string } }).__m4Gis.outcome = next;
    }, outcome);
  }

  assertClean(): void {
    expect(this.unexpected).toEqual([]);
    expect(this.pageErrors).toEqual([]);
  }

  private exploration(ended: boolean): ActiveExplorationDto {
    return {
      explorationId: "browser-expedition",
      zoneId: "browser-meadow",
      durationId: "short",
      startedAt: "2020-01-01T00:00:00.000Z",
      endsAt: ended ? "2020-01-01T00:01:00.000Z" : "2099-01-01T00:01:00.000Z"
    };
  }

  private async api(route: Route, path: string): Promise<void> {
    const request = route.request();
    const method = request.method();
    this.calls.push(`${method} ${path}`);
    if (request.headers()["x-wanderloom-player-id"] !== PLAYER_ID) {
      this.unexpected.push(`Missing fixture identity: ${method} ${path}`);
    }
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    const error = (status: number) => json({
      ok: false,
      error: { code: "google_drive_provider_unavailable", retryable: true }
    }, status);

    switch (`${method} ${path}`) {
      case "GET /api/zones":
        await json({ ok: true, zones: [{
          zoneId: "browser-meadow", name: "Browser Meadow", durations: [{
            durationId: "short", durationMs: 60_000,
            preview: { gold: { min: 25, max: 25 }, exp: { min: 12, max: 12 }, drops: { minItems: 1, maxItems: 1 } }
          }]
        }] });
        break;
      case "GET /api/state":
        await json({ ok: true, core: this.core });
        break;
      case "GET /api/inventory":
        await json({ ok: true, inventory: this.inventory });
        break;
      case "GET /api/explorations/current":
        await json({ ok: true, exploration: this.core.activeExploration });
        break;
      case "GET /api/archive/google/status":
        if (this.statusFailures > 0) {
          this.statusFailures -= 1;
          await error(503);
        } else {
          await json({ ok: true, connection: {
            state: this.driveState, grantedScope: SCOPE,
            authorizedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
          } });
        }
        break;
      case "POST /api/archive/sync": {
        if (this.syncGate) await this.syncGate;
        const outcome = this.syncOutcomes.shift() ?? "success";
        if (outcome === "network") await route.abort("failed");
        else if (typeof outcome === "number") await error(outcome);
        else await json({ ok: true, sync: { attempted: 1, synced: 1, failed: 0, skippedNonRetryable: 0 } });
        break;
      }
      case "POST /api/archive/google/authorize":
        expect(request.postDataJSON()).toEqual({ code: "fixture-authorization-code", redirectUri: "http://127.0.0.1:4177" });
        this.driveState = "connected";
        await json({ ok: true, authorized: true, scope: SCOPE });
        break;
      case "POST /api/explorations":
        expect(request.postDataJSON()).toEqual({ zoneId: "browser-meadow", durationId: "short" });
        this.core = { ...this.core, stateVersion: this.core.stateVersion + 1, activeExploration: this.exploration(this.instantExploration) };
        await json({ ok: true, core: this.core });
        break;
      case "POST /api/explorations/browser-expedition/claim":
        this.core = { stateVersion: this.core.stateVersion + 1, progression: { level: 1, gold: 125, exp: 22 }, activeExploration: null };
        this.inventory = { ...this.inventory, stateVersion: this.inventory.stateVersion + 1, items: [DROP] };
        await json({ ok: true, core: this.core, inventory: this.inventory,
          archiveEntry: { result: "Success", rewards: { gold: 25, exp: 12, drops: [DROP] } }
        });
        break;
      case "POST /api/equipment":
        expect(request.postDataJSON()).toEqual({ slot: "charm", itemInstanceId: DROP.itemInstanceId, expectedInventoryStateVersion: this.inventory.stateVersion });
        this.inventory = { ...this.inventory, stateVersion: this.inventory.stateVersion + 1, equipment: { slots: { charm: DROP.itemInstanceId } } };
        await json({ ok: true, inventory: this.inventory, idempotent: false });
        break;
      default:
        this.unexpected.push(`Unmocked API: ${method} ${path}`);
        await json({ ok: false, error: { code: "unexpected_fixture_request", retryable: false } }, 500);
    }
  }
}
