export type DeploymentTarget = "staging" | "production";

const REMOTE_CONFIG = ".wrangler/remote/wrangler.remote.json";

export interface WorkerDeploymentCommands {
  readonly target: DeploymentTarget;
  readonly deploy: readonly string[];
  readonly listDeployments: readonly string[];
  readonly rollback: (versionId: string) => readonly string[];
}

export function getWorkerDeploymentCommands(
  target: DeploymentTarget
): WorkerDeploymentCommands {
  const common = ["--env", target, "--config", REMOTE_CONFIG] as const;

  return {
    target,
    deploy: ["wrangler", "deploy", ...common],
    listDeployments: [
      "wrangler",
      "deployments",
      "list",
      "--json",
      ...common
    ],
    rollback: (versionId: string) => {
      const normalized = versionId.trim();
      if (normalized.length === 0) {
        throw new Error("worker rollback version ID is required");
      }
      return [
        "wrangler",
        "rollback",
        normalized,
        "--message",
        `rollback ${target} to ${normalized}`,
        ...common
      ];
    }
  };
}

export interface ReleaseIdentity {
  readonly commitSha: string;
  readonly tag: string | null;
}

export function validateReleaseIdentity(
  identity: ReleaseIdentity
): readonly string[] {
  const problems: string[] = [];
  if (!/^[0-9a-f]{40}$/i.test(identity.commitSha.trim())) {
    problems.push("release_commit_sha_must_be_full_40_hex");
  }
  if (identity.tag !== null && identity.tag.trim().length === 0) {
    problems.push("release_tag_must_be_nonempty_when_present");
  }
  return problems;
}
