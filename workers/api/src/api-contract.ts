export const API_ERROR_CODES = [
  "missing_player_id",
  "player_not_found",
  "invalid_request",
  "not_ready",
  "not_found",
  "version_conflict",
  "already_claimed",
  "invalid_exploration_state",
  "snapshot_integrity_error",
  "invalid_equipment_slot",
  "item_not_owned"
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  readonly ok: false;
  readonly error: {
    readonly code: ApiErrorCode;
    readonly retryable: boolean;
    readonly details?: Readonly<Record<string, unknown>>;
  };
}

const STATUS_BY_CODE: Readonly<Record<ApiErrorCode, number>> = {
  missing_player_id: 401,
  player_not_found: 404,
  invalid_request: 400,
  not_ready: 501,
  not_found: 404,
  version_conflict: 409,
  already_claimed: 409,
  invalid_exploration_state: 400,
  snapshot_integrity_error: 400,
  invalid_equipment_slot: 400,
  item_not_owned: 400
};

const RETRYABLE_CODES = new Set<ApiErrorCode>([
  "version_conflict",
  "already_claimed"
]);

export function apiErrorStatus(code: ApiErrorCode): number {
  return STATUS_BY_CODE[code];
}

export function isRetryableApiError(code: ApiErrorCode): boolean {
  return RETRYABLE_CODES.has(code);
}

export function apiError(
  code: ApiErrorCode,
  details?: Readonly<Record<string, unknown>>
): ApiErrorBody {
  return {
    ok: false,
    error: {
      code,
      retryable: isRetryableApiError(code),
      ...(details === undefined ? {} : { details })
    }
  };
}
