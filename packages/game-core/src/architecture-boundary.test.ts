import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith(".ts")
        ? [path]
        : [];
  });
}

describe("CP-19 game-core architecture boundary", () => {
  it("does not import Worker, D1, DOM, or Cloudflare runtime modules", () => {
    const files = sourceFiles(new URL("./", import.meta.url).pathname);
    const forbidden = [
      "cloudflare:",
      "@cloudflare/",
      "wrangler",
      "workers/",
      "D1Database",
      "HTMLElement",
      "document.",
      "window."
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const token of forbidden) {
        expect(source, `${file} must not contain ${token}`).not.toContain(token);
      }
    }
  });
});
