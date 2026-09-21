export interface ZoneDurationDto {
  readonly durationId: string;
  readonly durationMs: number;
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

export interface InventoryDto {
  readonly stateVersion: number;
  readonly items: readonly unknown[];
}

export interface ClaimResultDto {
  readonly core: CoreDto;
  readonly inventory: InventoryDto;
  readonly archiveEntry: {
    readonly result: string;
    readonly rewards: {
      readonly gold: number;
      readonly exp: number;
      readonly drops: readonly unknown[];
    };
  };
}

interface ApiErrorBody {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly [key: string]: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: unknown
  ) {
    super(`API request failed: ${status} ${code}`);
  }
}

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export class WanderloomApiClient {
  private playerId: string | null;

  constructor(
    private readonly fetchImpl: FetchLike = fetch,
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
        body
      );
    }

    return body as T;
  }
}
