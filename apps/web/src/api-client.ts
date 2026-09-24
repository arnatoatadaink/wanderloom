export interface RewardRangeDto {
  readonly min: number;
  readonly max: number;
}

export interface RewardPreviewDto {
  readonly gold: RewardRangeDto;
  readonly exp: RewardRangeDto;
  readonly drops: {
    readonly minItems: number;
    readonly maxItems: number;
  };
}

export interface ZoneDurationDto {
  readonly durationId: string;
  readonly durationMs: number;
  readonly preview: RewardPreviewDto;
  readonly risk?: {
    readonly failureProbability: number;
    readonly lossPolicy: {
      readonly retainedGoldRatio: number;
      readonly retainedExpRatio: number;
      readonly retainGeneratedDrops: boolean;
    };
  };
  readonly rarities?: readonly string[];
}

export interface ZoneDto {
  readonly zoneId: string;
  readonly name: string;
  readonly durations: readonly ZoneDurationDto[];
}

export interface ActiveExplorationDto {
  readonly explorationId: string;
  readonly zoneId: string;
  readonly durationId: string;
  readonly startedAt: string;
  readonly endsAt: string;
  readonly characterSnapshot?: {
    readonly stats: Readonly<Record<string, number>>;
    readonly baseStats?: Readonly<Record<string, number>>;
    readonly equipmentEffects?: readonly {
      readonly slot: string;
      readonly itemInstanceId: string;
      readonly itemDefinitionId: string;
      readonly statModifiers: Readonly<Record<string, number>>;
    }[];
  };
}

export interface CoreDto {
  readonly stateVersion: number;
  readonly progression: {
    readonly level: number;
    readonly exp: number;
    readonly gold: number;
  };
  readonly activeExploration: ActiveExplorationDto | null;
}

export interface ItemDto {
  readonly itemInstanceId: string;
  readonly itemDefinitionId: string;
  readonly rarity?: string;
  readonly createdAt: string;
}

export interface InventoryDto {
  readonly stateVersion: number;
  readonly equipment: {
    readonly slots: Readonly<Record<string, string | null>>;
  };
  readonly items: readonly ItemDto[];
}

export interface ClaimResultDto {
  readonly core: CoreDto;
  readonly inventory: InventoryDto;
  readonly archiveEntry: {
    readonly result: string;
    readonly rewards: {
      readonly gold: number;
      readonly exp: number;
      readonly drops: readonly ItemDto[];
    };
  };
}

export interface ApiErrorBody {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly retryable: boolean;
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryable: boolean,
    readonly details: Readonly<Record<string, unknown>> | undefined,
    readonly body: unknown
  ) {
    super(`API request failed: ${status} ${code}`);
  }
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

const defaultFetch: FetchLike = (input, init) =>
  globalThis.fetch(input, init);

export class WanderloomApiClient {
  private playerId: string | null;

  constructor(
    private readonly fetchImpl: FetchLike = defaultFetch,
    playerId: string | null = null
  ) {
    this.playerId = playerId;
  }

  setPlayerId(playerId: string): void {
    this.playerId = playerId;
  }

  getPlayerId(): string | null {
    return this.playerId;
  }

  async bootstrapGuest(): Promise<{
    readonly playerId: string;
    readonly core: CoreDto;
    readonly inventory: InventoryDto;
  }> {
    const body = await this.request<{
      readonly ok: true;
      readonly playerId: string;
      readonly core: CoreDto;
      readonly inventory: InventoryDto;
    }>("/api/guest/bootstrap", {
      method: "POST"
    }, false);

    this.playerId = body.playerId;
    return body;
  }

  async getZones(): Promise<readonly ZoneDto[]> {
    const body = await this.request<{
      readonly ok: true;
      readonly zones: readonly ZoneDto[];
    }>("/api/zones");
    return body.zones;
  }

  async getInventory(): Promise<InventoryDto> {
    const body = await this.request<{
      readonly ok: true;
      readonly inventory: InventoryDto;
    }>("/api/inventory");
    return body.inventory;
  }

  async equipItem(
    slot: string,
    itemInstanceId: string,
    expectedInventoryStateVersion: number
  ): Promise<InventoryDto> {
    const body = await this.request<{
      readonly ok: true;
      readonly inventory: InventoryDto;
      readonly idempotent: boolean;
    }>("/api/equipment", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        slot,
        itemInstanceId,
        expectedInventoryStateVersion
      })
    });
    return body.inventory;
  }

  async getState(): Promise<CoreDto> {
    const body = await this.request<{
      readonly ok: true;
      readonly core: CoreDto;
    }>("/api/state");
    return body.core;
  }

  async getCurrentExploration(): Promise<ActiveExplorationDto | null> {
    const body = await this.request<{
      readonly ok: true;
      readonly exploration: ActiveExplorationDto | null;
    }>("/api/explorations/current");
    return body.exploration;
  }

  async startExploration(
    zoneId: string,
    durationId: string
  ): Promise<CoreDto> {
    const body = await this.request<{
      readonly ok: true;
      readonly core: CoreDto;
    }>("/api/explorations", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ zoneId, durationId })
    });

    return body.core;
  }

  async claimExploration(explorationId: string): Promise<ClaimResultDto> {
    const body = await this.request<{
      readonly ok: true;
      readonly core: CoreDto;
      readonly inventory: InventoryDto;
      readonly archiveEntry: ClaimResultDto["archiveEntry"];
    }>(`/api/explorations/${encodeURIComponent(explorationId)}/claim`, {
      method: "POST"
    });

    return body;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    includePlayer = true
  ): Promise<T> {
    const headers = new Headers(init.headers);

    if (includePlayer) {
      if (this.playerId === null) {
        throw new Error("player identity is not initialized");
      }
      headers.set("x-wanderloom-player-id", this.playerId);
    }

    const response = await this.fetchImpl(path, {
      ...init,
      headers
    });
    const body = (await response.json()) as T | ApiErrorBody;

    if (!response.ok) {
      const errorBody = body as ApiErrorBody;
      throw new ApiError(
        response.status,
        errorBody.error?.code ?? "unknown_error",
        errorBody.error?.retryable ?? false,
        errorBody.error?.details,
        body
      );
    }

    return body as T;
  }
}
