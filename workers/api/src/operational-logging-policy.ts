export type OperationalLogLevel = "info" | "warn" | "error";

export type OperationalLogEvent =
  | "request_failed"
  | "provider_degraded"
  | "configuration_missing"
  | "deployment_smoke_failed"
  | "unexpected_exception";

export interface OperationalLogContext {
  readonly requestId?: string;
  readonly environment?: "local" | "staging" | "production";
  readonly route?: string;
  readonly method?: string;
  readonly playerId?: string;
  readonly errorCode?: string;
  readonly provider?: "google_oidc" | "google_drive" | "d1";
  readonly retryable?: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface OperationalLogRecord {
  readonly level: OperationalLogLevel;
  readonly event: OperationalLogEvent;
  readonly requestId?: string;
  readonly environment?: "local" | "staging" | "production";
  readonly route?: string;
  readonly method?: string;
  readonly playerId?: string;
  readonly errorCode?: string;
  readonly provider?: "google_oidc" | "google_drive" | "d1";
  readonly retryable?: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

const FORBIDDEN_KEY_FRAGMENTS = [
  "authorization",
  "cookie",
  "credential",
  "secret",
  "token",
  "password",
  "ciphertext",
  "refresh",
  "access",
  "id_token",
  "code"
] as const;

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

export function isForbiddenOperationalLogKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return FORBIDDEN_KEY_FRAGMENTS.some((fragment) =>
    normalized.includes(fragment)
  );
}

export function sanitizeOperationalLogDetails(
  details: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> | undefined {
  if (details === undefined) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(details).filter(
    ([key]) => !isForbiddenOperationalLogKey(key)
  );

  return Object.fromEntries(sanitizedEntries);
}

export function classifyOperationalLogLevel(input: {
  readonly retryable?: boolean;
  readonly unexpected?: boolean;
  readonly configurationMissing?: boolean;
}): OperationalLogLevel {
  if (input.unexpected) {
    return "error";
  }
  if (input.configurationMissing || input.retryable) {
    return "warn";
  }
  return "info";
}

export function createOperationalLogRecord(
  event: OperationalLogEvent,
  context: OperationalLogContext,
  options: {
    readonly unexpected?: boolean;
    readonly configurationMissing?: boolean;
  } = {}
): OperationalLogRecord {
  const details = sanitizeOperationalLogDetails(context.details);

  return {
    level: classifyOperationalLogLevel({
      retryable: context.retryable,
      unexpected: options.unexpected,
      configurationMissing: options.configurationMissing
    }),
    event,
    ...(context.requestId ? { requestId: context.requestId } : {}),
    ...(context.environment ? { environment: context.environment } : {}),
    ...(context.route ? { route: context.route } : {}),
    ...(context.method ? { method: context.method } : {}),
    ...(context.playerId ? { playerId: context.playerId } : {}),
    ...(context.errorCode ? { errorCode: context.errorCode } : {}),
    ...(context.provider ? { provider: context.provider } : {}),
    ...(context.retryable !== undefined
      ? { retryable: context.retryable }
      : {}),
    ...(details && Object.keys(details).length > 0 ? { details } : {})
  };
}
