import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type PackEntry = Record<string, unknown>;
const root = fileURLToPath(new URL("../", import.meta.url)), verifier = join(root, "scripts/verify-distribution-artifact.mjs"), npmCli = process.env["SUREFLOW_NPM_CLI"] ?? "";
let sourceRoot = "", sourceCommit = "", testRoot = "", artifact = "", packJson = "";
let env: NodeJS.ProcessEnv = {};

function readRecord(path: string): PackEntry {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed) || parsed.length !== 1 || typeof parsed[0] !== "object" || parsed[0] === null) throw new Error("Expected one npm pack JSON result");
  return parsed[0] as PackEntry;
}
function writeRecord(entry: PackEntry, name: string): string {
  const path = join(testRoot, `${Buffer.from(name, "utf8").toString("base64url")}.json`); writeFileSync(path, `${JSON.stringify([entry], null, 2)}\n`); return path;
}
function args(json: string, mode: "inspect" | "install" = "inspect", file = artifact): string[] {
  return [verifier, "--artifact", file, "--pack-json", json, "--source-root", sourceRoot, "--source-commit", sourceCommit, "--expected-name", "sureflow", "--expected-version", "0.1.0", "--npm-cli", npmCli, "--pack-command", "npm pack . --json --offline --foreground-scripts=false", "--mode", mode];
}
const verify = (json: string, mode: "inspect" | "install" = "inspect", file = artifact) => spawnSync(process.execPath, args(json, mode, file), { cwd: testRoot, env, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });

function wrapper(): string {
  const directory = join(testRoot, "qualified-bin"); mkdirSync(directory);
  const file = join(directory, "npm");
  writeFileSync(file, '#!/usr/bin/env node\nconst { spawnSync } = require("node:child_process");\nconst cli = process.env["SUREFLOW_NPM_CLI"];\nif (!cli) process.exit(127);\nconst result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { stdio: "inherit" });\nprocess.exit(result.status ?? 1);\n');
  chmodSync(file, 0o755); return directory;
}
function packageWorkspace(): string {
  const workspace = join(testRoot, "package-source"); mkdirSync(workspace);
  for (const path of ["src", "tsconfig.json", "tsconfig.package.json", "package.json", "package-lock.json", "README.md", "LICENSE"]) cpSync(join(sourceRoot, path), join(workspace, path), { recursive: true });
  mkdirSync(join(workspace, "scripts")); cpSync(join(sourceRoot, "scripts/clean-package-output.mjs"), join(workspace, "scripts/clean-package-output.mjs"));
  symlinkSync(join(root, "node_modules"), join(workspace, "node_modules"), "dir"); return workspace;
}
function createSourceSnapshot(): { readonly root: string; readonly commit: string } {
  const snapshot = join(testRoot, "source-snapshot"); mkdirSync(snapshot);
  for (const path of ["src", "tsconfig.json", "tsconfig.package.json", "package.json", "package-lock.json", "README.md", "LICENSE"]) cpSync(join(root, path), join(snapshot, path), { recursive: true });
  mkdirSync(join(snapshot, "scripts")); cpSync(join(root, "scripts/clean-package-output.mjs"), join(snapshot, "scripts/clean-package-output.mjs"));
  execFileSync("git", ["init", "--quiet", "--initial-branch=main", snapshot], { stdio: "pipe" });
  execFileSync("git", ["-C", snapshot, "add", "--", "src", "tsconfig.json", "tsconfig.package.json", "package.json", "package-lock.json", "README.md", "LICENSE", "scripts/clean-package-output.mjs"], { stdio: "pipe" });
  execFileSync("git", ["-c", "user.name=Sureflow T3 Test", "-c", "user.email=t3-test@example.invalid", "-c", "commit.gpgsign=false", "-C", snapshot, "commit", "--quiet", "-m", "disposable T3 source snapshot"], { stdio: "pipe" });
  const commit = execFileSync("git", ["-C", snapshot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  return { root: snapshot, commit };
}
function packDisposable(): void {
  const workspace = packageWorkspace(), destination = join(testRoot, "pack-output"), bin = wrapper(), home = join(testRoot, "home"), cache = join(testRoot, "pack-cache");
  mkdirSync(destination); mkdirSync(home); mkdirSync(cache);
  env = { PATH: [bin, dirname(process.execPath), "/usr/bin", "/bin"].join(delimiter), HOME: home, TMPDIR: testRoot, npm_config_cache: cache, npm_config_userconfig: "/dev/null", SUREFLOW_NPM_CLI: npmCli };
  const result = spawnSync(process.execPath, [npmCli, "pack", ".", "--json", "--offline", "--ignore-scripts=false", "--foreground-scripts=false", "--pack-destination", destination], { cwd: workspace, env, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Qualified npm 11 pack failed: ${result.stderr}`);
  artifact = join(destination, "sureflow-0.1.0.tgz"); packJson = join(testRoot, "pack.json"); writeFileSync(packJson, result.stdout);
  if (!existsSync(artifact)) throw new Error("npm 11 did not create the expected disposable package artifact");
}
function mutateRecord(name: string, alter: (entry: PackEntry) => void): string {
  const entry = structuredClone(readRecord(packJson)); alter(entry); return writeRecord(entry, name);
}
function repack(packageDir: string, file: string, transform?: string): void {
  execFileSync("tar", ["--create", "--gzip", "--file", file, "--directory", dirname(packageDir), ...(transform ? ["--absolute-names", `--transform=${transform}`] : []), "package"], { stdio: "pipe" });
}
function refreshDigests(entry: PackEntry, file: string): void {
  const bytes = readFileSync(file); entry["size"] = bytes.byteLength;
  entry["shasum"] = createHash("sha1").update(bytes).digest("hex");
  entry["integrity"] = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
}
function appendFileEntry(entry: PackEntry, path: string, size: number, file: string): void {
  const files = entry["files"]; if (!Array.isArray(files)) throw new Error("npm pack JSON has no inventory");
  files.push({ path, size, mode: 0o644 }); entry["unpackedSize"] = Number(entry["unpackedSize"]) + size; entry["entryCount"] = Number(entry["entryCount"]) + 1; refreshDigests(entry, file);
}
function unpack(name: string): string {
  const directory = join(testRoot, name); mkdirSync(directory);
  execFileSync("tar", ["--extract", "--gzip", "--file", artifact, "--directory", directory], { stdio: "pipe" });
  return join(directory, "package");
}

beforeAll(() => {
  if (!npmCli) throw new Error("SUREFLOW_NPM_CLI must name the qualified npm 11 CLI; no PATH fallback is allowed");
  const version = execFileSync(process.execPath, [npmCli, "--version"], { encoding: "utf8", env: { PATH: `${dirname(process.execPath)}:/usr/bin:/bin`, HOME: tmpdir(), npm_config_userconfig: "/dev/null" } }).trim();
  if (!/^11\./.test(version)) throw new Error(`Expected npm 11, received ${version}`);
  testRoot = mkdtempSync(join(tmpdir(), "sureflow-t3-artifact-test-"));
  try { const snapshot = createSourceSnapshot(); sourceRoot = snapshot.root; sourceCommit = snapshot.commit; packDisposable(); }
  catch (error) { rmSync(testRoot, { recursive: true, force: true }); testRoot = ""; throw error; }
}, 120_000);
afterAll(() => { if (testRoot) rmSync(testRoot, { recursive: true, force: true }); });

describe("Distribution T3 package artifact verifier", () => {
  it("accepts a disposable artifact and independently installs and smokes its bin", () => {
    const result = verify(packJson, "install"); expect(result.status, result.stderr).toBe(0);
    const evidence: unknown = JSON.parse(result.stdout);
    expect(evidence).toMatchObject({ accepted: true, packageName: "sureflow", packageVersion: "0.1.0", sourceCommit });
    expect(evidence).toHaveProperty("sha256"); expect(evidence).toHaveProperty("installed.runnerContainment", true);
    expect(evidence).toHaveProperty("installed.nodePathAbsent", true); expect(evidence).toHaveProperty("installed.helpExit", 0);
    expect(evidence).toHaveProperty("installed.helpOutputPresent", true);
    expect(evidence).toHaveProperty("installed.unknownCommandExit", 2);
  });
  it.each([
    ["name", (entry: PackEntry) => { entry["name"] = "other-package"; }],
    ["version", (entry: PackEntry) => { entry["version"] = "9.9.9"; }],
    ["digest", (entry: PackEntry) => { entry["shasum"] = "0".repeat(40); }],
  ])("refuses altered package %s metadata", (_name, alter) => { expect(verify(mutateRecord(`altered-${_name}`, alter)).status).not.toBe(0); });
  it("refuses a missing expected runtime entry", () => {
    const json = mutateRecord("missing", (entry) => { const files = entry["files"]; if (!Array.isArray(files)) throw new Error("Missing pack inventory"); entry["files"] = files.filter((item: unknown) => typeof item !== "object" || item === null || (item as PackEntry)["path"] !== "dist/src/cli.js"); });
    expect(verify(json).status).not.toBe(0);
  });
  it.each(["dist/src/unexpected.js", "dist/src/leak.ts"])("refuses extra or prohibited entry %s", (path) => {
    const packageDir = unpack(`tree-${path.endsWith(".ts") ? "source" : "extra"}`), bytes = Buffer.from("unexpected package material\n");
    const extra = join(packageDir, path); mkdirSync(dirname(extra), { recursive: true }); writeFileSync(extra, bytes);
    const file = join(testRoot, `altered-${path.endsWith(".ts") ? "source" : "extra"}.tgz`); repack(packageDir, file);
    const entry = structuredClone(readRecord(packJson)); appendFileEntry(entry, path, bytes.byteLength, file);
    expect(verify(writeRecord(entry, `reported-${path}`), "inspect", file).status).not.toBe(0);
  });
  it("refuses an unsafe traversal archive path before extraction", () => {
    const packageDir = unpack("tree-traversal"), file = join(testRoot, "traversal", "sureflow-0.1.0.tgz");
    mkdirSync(dirname(file)); repack(packageDir, file, "s,^package/dist/src/cli.js,package/../outside.js,");
    const entry = structuredClone(readRecord(packJson)); refreshDigests(entry, file);
    expect(verify(writeRecord(entry, "traversal"), "inspect", file).status).not.toBe(0);
  });
  it("refuses an npm CLI outside the qualified npm 11 major", () => {
    const fake = join(testRoot, "npm12.mjs"); writeFileSync(fake, 'console.log("12.1.0");\n');
    const parameters = args(packJson).map((value, index, all) => all[index - 1] === "--npm-cli" ? fake : value);
    const result = spawnSync(process.execPath, parameters, { cwd: testRoot, env, encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/qualified npm/i);
    expect(result.stderr).toMatch(/version 11/i);
    expect(result.stderr).toContain("12.1.0");
  });
  it("refuses a CLI symlink that resolves to the source checkout", () => {
    const packageDir = unpack("tree-link"), cli = join(packageDir, "dist/src/cli.js"); rmSync(cli);
    symlinkSync(join(root, "src/cli.ts"), cli);
    const file = join(testRoot, "checkout-link.tgz"); repack(packageDir, file);
    expect(verify(packJson, "inspect", file).status).not.toBe(0);
  });
  it("refuses package inputs that differ from the recorded source commit", () => {
    const path = join(sourceRoot, "src/cli.ts"), original = readFileSync(path, "utf8");
    try {
      writeFileSync(path, `${original}\n// source-binding mismatch fixture\n`);
      const result = verify(packJson);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Package inputs differ from the recorded source commit");
    } finally { writeFileSync(path, original); }
  });
  it("does not execute the CLI when its package module is imported", () => {
    const packageDir = unpack("tree-import"), cli = join(packageDir, "dist/src/cli.js");
    symlinkSync(join(root, "node_modules"), join(packageDir, "node_modules"), "dir");
    const script = `await import(${JSON.stringify(pathToFileURL(cli).href)});`;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: testRoot, env, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
  });
});
