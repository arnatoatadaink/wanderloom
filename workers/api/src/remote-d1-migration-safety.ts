export type RemoteMigrationTarget = "staging" | "production";

export interface RemoteMigrationPlan {
  readonly target: RemoteMigrationTarget;
  readonly databaseName: string;
  readonly environmentName: RemoteMigrationTarget;
  readonly confirmationPhrase: string;
  readonly listArgs: readonly string[];
  readonly applyArgs: readonly string[];
}

const DATABASE_NAMES: Readonly<Record<RemoteMigrationTarget, string>> = {
  staging: "wanderloom-staging",
  production: "wanderloom-production"
};

export function getRemoteMigrationPlan(
  target: RemoteMigrationTarget,
  configPath = ".wrangler/remote/wrangler.remote.json"
): RemoteMigrationPlan {
  const databaseName = DATABASE_NAMES[target];
  const commonArgs = [
    databaseName,
    "--remote",
    "--config",
    configPath,
    "--env",
    target
  ] as const;

  return {
    target,
    databaseName,
    environmentName: target,
    confirmationPhrase: `APPLY ${databaseName}`,
    listArgs: ["d1", "migrations", "list", ...commonArgs],
    applyArgs: ["d1", "migrations", "apply", ...commonArgs]
  };
}

export function validateRemoteMigrationApply(
  target: RemoteMigrationTarget,
  confirmation: string | undefined
): readonly string[] {
  const plan = getRemoteMigrationPlan(target);
  const problems: string[] = [];

  if (confirmation === undefined || confirmation.trim().length === 0) {
    problems.push("remote_migration_confirmation_required");
    return problems;
  }

  if (confirmation !== plan.confirmationPhrase) {
    problems.push("remote_migration_confirmation_mismatch");
  }

  return problems;
}
