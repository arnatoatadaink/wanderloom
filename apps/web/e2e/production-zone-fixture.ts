import { expect, type Page, type Route } from "@playwright/test";

import type {
  ActiveExplorationDto,
  CoreDto,
  InventoryDto,
  ZoneDto
} from "../src/api-client";

const PLAYER_ID = "browser-production-player";

function productionZones(zoneRank: number): readonly ZoneDto[] {
  const definitions = [
    ["wayfarer-meadow", "Wayfarer Meadow", 0],
    ["mossglass-grove", "Mossglass Grove", 1],
    ["shattered-causeway", "Shattered Causeway", 2],
    ["ashwind-highlands", "Ashwind Highlands", 3],
    ["starfall-frontier", "Starfall Frontier", 4]
  ] as const;

  return definitions.map(([zoneId, name, minimumZoneRank]) => ({
    zoneId,
    name,
    minimumZoneRank,
    unlocked: zoneRank >= minimumZoneRank,
    durations: [
      {
        durationId: "short",
        durationMs: 30 * 60_000,
        preview: {
          gold: { min: 10, max: 10 },
          exp: { min: 8, max: 8 },
          drops: { minItems: 1, maxItems: 1 }
        },
        risk: {
          failureProbability: 0.04,
          lossPolicy: {
            retainedGoldRatio: 0.5,
            retainedExpRatio: 0.5,
            retainGeneratedDrops: false
          }
        },
        rarities: ["Common", "Uncommon", "Rare"]
      }
    ]
  }));
}

export class ProductionZoneFixture {
  readonly calls: string[] = [];
  readonly unexpected: string[] = [];
  readonly pageErrors: string[] = [];
  zoneRank = 0;
  private nextExplorationId = 1;
  private core: CoreDto = {
    stateVersion: 1,
    progression: { level: 1, gold: 100, exp: 0 },
    activeExploration: null
  };
  private inventory: InventoryDto = {
    stateVersion: 1,
    equipment: { slots: { charm: null } },
    items: []
  };

  constructor(private readonly page: Page) {}

  count(path: string, method = "GET"): number {
    return this.calls.filter((call) => call === `${method} ${path}`).length;
  }

  async install(): Promise<void> {
    this.page.on("pageerror", (error) => this.pageErrors.push(error.message));
    await this.page.addInitScript(() => {
      localStorage.setItem("wanderloom.playerId", "browser-production-player");
      localStorage.setItem("wanderloom.training.completed", "1");
      window.google = {
        accounts: {
          id: { initialize() {}, renderButton() {} },
          oauth2: {
            initCodeClient() {
              return { requestCode() {} };
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
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        await this.api(route, url.pathname);
        return;
      }
      await route.continue();
    });
  }

  assertClean(): void {
    expect(this.unexpected).toEqual([]);
    expect(this.pageErrors).toEqual([]);
  }

  private exploration(zoneId: string): ActiveExplorationDto {
    return {
      explorationId: `production-browser-expedition-${this.nextExplorationId++}`,
      zoneId,
      durationId: "short",
      startedAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2020-01-01T00:01:00.000Z"
    };
  }

  private async api(route: Route, path: string): Promise<void> {
    const request = route.request();
    const method = request.method();
    this.calls.push(`${method} ${path}`);

    if (request.headers()["x-wanderloom-player-id"] !== PLAYER_ID) {
      this.unexpected.push(`Missing fixture identity: ${method} ${path}`);
    }

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, json: body });

    switch (`${method} ${path}`) {
      case "GET /api/zones":
        await json({ ok: true, zones: productionZones(this.zoneRank) });
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
        await json({
          ok: true,
          connection: {
            state: "not_connected",
            grantedScope: null,
            authorizedAt: null,
            updatedAt: null
          }
        });
        break;
      case "POST /api/explorations": {
        const body = request.postDataJSON() as {
          zoneId: string;
          durationId: string;
        };
        expect(body.durationId).toBe("short");
        expect(["wayfarer-meadow", "mossglass-grove"]).toContain(body.zoneId);
        this.core = {
          ...this.core,
          stateVersion: this.core.stateVersion + 1,
          activeExploration: this.exploration(body.zoneId)
        };
        await json({ ok: true, core: this.core });
        break;
      }
      default:
        if (
          method === "POST" &&
          path.startsWith("/api/explorations/") &&
          path.endsWith("/claim")
        ) {
          expect(this.core.activeExploration?.zoneId).toBe("wayfarer-meadow");
          this.zoneRank = 1;
          this.core = {
            stateVersion: this.core.stateVersion + 1,
            progression: { level: 1, gold: 110, exp: 8 },
            activeExploration: null
          };
          await json({
            ok: true,
            core: this.core,
            inventory: this.inventory,
            archiveEntry: {
              result: "Success",
              rewards: { gold: 10, exp: 8, drops: [] }
            }
          });
          break;
        }
        this.unexpected.push(`Unmocked API: ${method} ${path}`);
        await json(
          {
            ok: false,
            error: { code: "unexpected_fixture_request", retryable: false }
          },
          500
        );
    }
  }
}
