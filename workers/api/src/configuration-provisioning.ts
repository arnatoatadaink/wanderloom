export type RemoteProvisioningTarget = "staging" | "production";

export const REQUIRED_WORKER_SECRETS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ARCHIVE_TOKEN_ENCRYPTION_KEY"
] as const;

export const PUBLIC_WEB_BUILD_VARIABLES = ["VITE_GOOGLE_CLIENT_ID"] as const;

export interface ProvisioningPresenceInput {
  readonly workerSecrets: Readonly<Record<string, string | undefined>>;
  readonly webBuildVariables: Readonly<Record<string, string | undefined>>;
}

export function validateProvisioningPresence(
  input: ProvisioningPresenceInput
): readonly string[] {
  const problems: string[] = [];

  for (const name of REQUIRED_WORKER_SECRETS) {
    if ((input.workerSecrets[name] ?? "").trim().length === 0) {
      problems.push(`missing_worker_secret:${name}`);
    }
  }

  for (const name of PUBLIC_WEB_BUILD_VARIABLES) {
    if ((input.webBuildVariables[name] ?? "").trim().length === 0) {
      problems.push(`missing_web_build_variable:${name}`);
    }
  }

  return problems;
}

export function expectedWorkerSecretPutCommands(
  target: RemoteProvisioningTarget
): readonly string[][] {
  return REQUIRED_WORKER_SECRETS.map((name) => [
    "wrangler",
    "secret",
    "put",
    name,
    "--env",
    target,
    "--config",
    ".wrangler/remote/wrangler.remote.json"
  ]);
}

export function expectedWorkerSecretListCommand(
  target: RemoteProvisioningTarget
): readonly string[] {
  return [
    "wrangler",
    "secret",
    "list",
    "--env",
    target,
    "--config",
    ".wrangler/remote/wrangler.remote.json"
  ];
}
