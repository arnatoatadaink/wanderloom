export type SmokeTarget = "staging" | "production";

export type SmokeStepName =
  | "health"
  | "guest_bootstrap"
  | "state"
  | "inventory"
  | "zones"
  | "exploration_start"
  | "exploration_claim"
  | "migration_state";

export interface SmokeStepDefinition {
  readonly name: SmokeStepName;
  readonly phase: "immediate" | "delayed" | "operator";
  readonly releaseBlocking: boolean;
}

export const POST_DEPLOY_SMOKE_STEPS: readonly SmokeStepDefinition[] = [
  { name: "health", phase: "immediate", releaseBlocking: true },
  { name: "guest_bootstrap", phase: "immediate", releaseBlocking: true },
  { name: "state", phase: "immediate", releaseBlocking: true },
  { name: "inventory", phase: "immediate", releaseBlocking: true },
  { name: "zones", phase: "immediate", releaseBlocking: true },
  { name: "exploration_start", phase: "immediate", releaseBlocking: true },
  { name: "exploration_claim", phase: "delayed", releaseBlocking: true },
  { name: "migration_state", phase: "operator", releaseBlocking: true }
];

export interface SmokeStepResult {
  readonly name: SmokeStepName;
  readonly ok: boolean;
}

export function evaluatePostDeploySmoke(
  results: readonly SmokeStepResult[]
): readonly string[] {
  const resultByName = new Map(results.map((result) => [result.name, result]));
  const problems: string[] = [];

  for (const step of POST_DEPLOY_SMOKE_STEPS) {
    const result = resultByName.get(step.name);
    if (result === undefined) {
      problems.push(`missing_smoke_result:${step.name}`);
    } else if (step.releaseBlocking && !result.ok) {
      problems.push(`smoke_failed:${step.name}`);
    }
  }

  return problems;
}

export function migrationStateCommand(target: SmokeTarget): readonly string[] {
  return [
    "pnpm",
    "--filter",
    "@wanderloom/api",
    "migrate:remote",
    "--",
    "--target",
    target
  ];
}

export function requireAbsoluteBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("remote smoke base URL must use HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("smoke base URL must not contain credentials, query, or fragment");
  }
  return url;
}
