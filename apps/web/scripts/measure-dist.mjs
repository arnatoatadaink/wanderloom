import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const distDir = new URL("../dist/", import.meta.url);

const budgets = {
  totalGzipBytes: 20 * 1024,
  javascriptGzipBytes: 10 * 1024,
  cssGzipBytes: 5 * 1024,
  htmlGzipBytes: 2 * 1024
};

async function listFiles(dirUrl, prefix = "") {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    const childUrl = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dirUrl);

    if (entry.isDirectory()) {
      files.push(...await listFiles(childUrl, relativePath));
    } else if (!entry.name.endsWith(".map")) {
      files.push({ relativePath, url: childUrl });
    }
  }

  return files;
}

const files = [];
for (const file of await listFiles(distDir)) {
  const content = await readFile(file.url);
  files.push({
    path: file.relativePath,
    rawBytes: content.byteLength,
    gzipBytes: gzipSync(content).byteLength
  });
}

const sum = (predicate) =>
  files
    .filter((file) => predicate(file.path))
    .reduce((total, file) => total + file.gzipBytes, 0);

const summary = {
  totalRawBytes: files.reduce((total, file) => total + file.rawBytes, 0),
  totalGzipBytes: files.reduce((total, file) => total + file.gzipBytes, 0),
  javascriptGzipBytes: sum((name) => name.endsWith(".js")),
  cssGzipBytes: sum((name) => name.endsWith(".css")),
  htmlGzipBytes: sum((name) => name.endsWith(".html")),
  files
};

console.log(JSON.stringify(summary, null, 2));

const violations = [
  ["total gzip", summary.totalGzipBytes, budgets.totalGzipBytes],
  ["JavaScript gzip", summary.javascriptGzipBytes, budgets.javascriptGzipBytes],
  ["CSS gzip", summary.cssGzipBytes, budgets.cssGzipBytes],
  ["HTML gzip", summary.htmlGzipBytes, budgets.htmlGzipBytes]
].filter(([, actual, budget]) => actual > budget);

if (violations.length > 0) {
  for (const [label, actual, budget] of violations) {
    console.error(`${label} budget exceeded: ${actual} > ${budget} bytes`);
  }
  process.exitCode = 1;
}
