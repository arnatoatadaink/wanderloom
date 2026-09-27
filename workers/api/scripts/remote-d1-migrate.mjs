import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const target = getArg("--target");
const apply = args.includes("--apply");
const confirmation = getArg("--confirm");

if (target !== "staging" && target !== "production") {
  throw new Error("--target must be staging or production");
}

const databaseName = target === "staging"
  ? "wanderloom-staging"
  : "wanderloom-production";
const expectedConfirmation = `APPLY ${databaseName}`;
const configPath = resolve(".wrangler/remote/wrangler.remote.json");

if (!existsSync(configPath)) {
  throw new Error(
    "remote Wrangler config is missing; run pnpm --filter @wanderloom/api config:remote first"
  );
}

const command = apply ? "apply" : "list";

if (apply && confirmation !== expectedConfirmation) {
  throw new Error(
    `refusing remote migration apply; pass --confirm "${expectedConfirmation}"`
  );
}

const wranglerArgs = [
  "d1",
  "migrations",
  command,
  databaseName,
  "--remote",
  "--config",
  configPath,
  "--env",
  target
];

process.stdout.write(
  `[remote-d1-migrate] target=${target} database=${databaseName} action=${command}\n`
);

const result = spawnSync("pnpm", ["exec", "wrangler", ...wranglerArgs], {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
