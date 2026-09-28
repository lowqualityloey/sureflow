import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const fail = (message) => { throw new Error(message); };
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024, ...options });
  if (result.error) fail(`${command} could not run: ${result.error.message}`);
  if (result.status !== 0) fail(`${command} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout;
}

const required = ["--artifact", "--pack-json", "--source-root", "--source-commit", "--expected-name", "--expected-version", "--npm-cli", "--pack-command", "--mode"];
function parseArgs(args) {
  const result = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (typeof flag !== "string" || !flag.startsWith("--") || result.has(flag)) fail("Invalid or repeated option");
    const value = args[index + 1];
    if (typeof value !== "string" || value.startsWith("--")) fail(`Missing value for ${flag}`);
    result.set(flag, value); index += 1;
  }
  if (required.some((flag) => !result.has(flag)) || [...result.keys()].some((flag) => !required.includes(flag))) fail("Missing or unknown option");
  if (result.get("--mode") !== "inspect" && result.get("--mode") !== "install") fail("Mode must be inspect or install");
  return Object.fromEntries(result);
}
function record(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}
const text = (value, label) => typeof value === "string" && value.length > 0 ? value : fail(`${label} is missing`);
const integer = (value, label) => Number.isSafeInteger(value) && value >= 0 ? value : fail(`${label} must be a nonnegative integer`);
const cleanEnvironment = (home = tmpdir()) => ({ PATH: [dirname(process.execPath), "/usr/bin", "/bin"].join(delimiter), HOME: home, TMPDIR: home, npm_config_userconfig: "/dev/null" });

function npmVersion(cli) {
  if (!/^v24\./.test(process.version)) fail(`Node 24 is required; received ${process.version}`);
  const version = run(process.execPath, [cli, "--version"], { env: cleanEnvironment() }).trim();
  if (!/^11\./.test(version)) fail(`Qualified npm must be version 11; received ${version}`);
  return version;
}
function sourceContract(root, commit, name, version) {
  if (!/^[a-f0-9]{40}$/.test(commit) || run("git", ["-C", root, "rev-parse", "HEAD"]).trim() !== commit) fail("Source HEAD does not match the full recorded source commit");
  run("git", ["-C", root, "cat-file", "-e", `${commit}^{commit}`]);
  const inputs = ["package.json", "package-lock.json", "src", "tsconfig.package.json", "scripts/clean-package-output.mjs"];
  const diff = spawnSync("git", ["-C", root, "diff", "--quiet", commit, "--", ...inputs], { encoding: "utf8" });
  if (diff.error || diff.status !== 0) fail("Package inputs differ from the recorded source commit");
  const manifest = record(JSON.parse(readFileSync(join(root, "package.json"), "utf8")), "Source manifest");
  if (manifest.name !== name || manifest.version !== version || manifest.bin?.sureflow !== "./dist/src/cli.js" || JSON.stringify(manifest.files) !== JSON.stringify(["dist/src"])) fail("Source manifest differs from the T2 package contract");
  const paths = run("git", ["-C", root, "ls-tree", "-r", "--name-only", commit, "--", "src"]).trim().split("\n");
  if (paths.length === 0 || paths.some((path) => !path.endsWith(".ts"))) fail("Production source set is empty or contains a non-TypeScript file");
  const expected = paths.map((path) => `package/dist/src/${path.slice(4).replace(/\.ts$/, ".js")}`);
  for (const path of ["package.json", "README.md", "LICENSE"]) if (existsSync(join(root, path))) expected.push(`package/${path}`);
  return new Set(expected);
}

function npmPackMetadata(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed) || parsed.length !== 1) fail("npm pack JSON must contain one package result");
  const result = record(parsed[0], "npm pack result");
  if (!Array.isArray(result.files)) fail("npm pack JSON has no complete files inventory");
  const paths = new Set();
  const files = result.files.map((item) => {
    const entry = record(item, "npm inventory entry"), pathValue = text(entry.path, "Inventory path");
    if (pathValue.startsWith("/") || pathValue.includes("\\") || pathValue.split("/").some((part) => part === ".." || part === ".")) fail("Unsafe npm inventory path");
    const path = pathValue === "" ? "package/" : `package/${pathValue}`;
    if (paths.has(path)) fail(`Duplicate npm inventory path: ${path}`);
    paths.add(path);
    return { path, size: integer(entry.size, "Inventory size"), mode: integer(entry.mode, "Inventory mode") };
  });
  return { name: text(result.name, "Package name"), version: text(result.version, "Package version"), filename: text(result.filename, "Package filename"), size: integer(result.size, "Tarball size"), unpackedSize: integer(result.unpackedSize, "Unpacked size"), shasum: text(result.shasum, "npm shasum"), integrity: text(result.integrity, "npm integrity"), entryCount: integer(result.entryCount, "Entry count"), files };
}
function lines(output) { return output.endsWith("\n") ? output.slice(0, -1).split("\n") : output.split("\n"); }
function safeArchiveEntries(artifact, npmFiles) {
  if (!run("tar", ["--version"]).startsWith("tar (GNU tar)")) fail("GNU tar is required for safe archive inspection");
  const options = ["--gzip", "--file", artifact, "--quoting-style=escape"];
  const names = lines(run("tar", ["--list", ...options]));
  const details = lines(run("tar", ["--list", "--verbose", "--numeric-owner", ...options]));
  if (names.length !== details.length || names.length !== npmFiles.length) fail("Archive entry count differs from npm inventory");
  const packEntries = new Map(npmFiles.map((entry) => [entry.path, entry])), seen = new Set();
  return names.map((name, index) => {
    if (!name.startsWith("package/") || name.includes("\\") || name.includes("\0")) fail(`Unsafe archive path: ${name}`);
    const directory = name.endsWith("/"), logical = name.slice(8).replace(/\/$/, "");
    if (logical.split("/").some((part) => part === ".." || part === "." || (part.length === 0 && logical.length > 0))) fail(`Unsafe archive traversal path: ${name}`);
    if (seen.has(logical)) fail(`Duplicate logical archive entry: ${name}`);
    seen.add(logical);
    const detail = details[index], type = detail?.[0];
    if ((directory && type !== "d") || (!directory && type !== "-")) fail(`Archive contains a link or unexpected type: ${name}`);
    const modeText = detail.slice(1, 10);
    if (/[sStT]/.test(modeText)) fail(`Archive contains special permission bits: ${name}`);
    const mode = modeText.split("").reduce((value, bit, i) => value | ("rwx"[i % 3] === bit ? 1 << (8 - i) : 0), 0);
    const packed = packEntries.get(name);
    if (!packed || packed.mode !== mode) fail(`Archive inventory path or mode differs from npm JSON: ${name}`);
    return { path: name, logical, type: directory ? "directory" : "file", size: packed.size, mode };
  });
}
const contained = (parent, child) => { const path = relative(parent, child); return path === "" || (path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path)); };
function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name), stat = lstatSync(path);
    if (stat.isSymbolicLink()) fail(`Unexpected symlink in package: ${path}`);
    if (stat.isDirectory()) return filesUnder(path);
    if (!stat.isFile()) fail(`Unexpected installed file type: ${path}`);
    return [path];
  });
}
function checkSecrets(files) {
  const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bnpm_[A-Za-z0-9]{30,}\b/i, /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/, /\bgithub_pat_[A-Za-z0-9_]{30,}\b/, /\bAKIA[0-9A-Z]{16}\b/, /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/];
  for (const file of files) {
    const bytes = readFileSync(file);
    if (bytes.includes(0)) fail(`Unexpected binary package file: ${file}`);
    if (patterns.some((pattern) => pattern.test(bytes.toString("utf8")))) fail(`Credential pattern found in package file: ${file}`);
  }
}
function verifyDigests(artifact, metadata) {
  const bytes = readFileSync(artifact), sha1 = createHash("sha1").update(bytes).digest("hex"), sha512 = createHash("sha512").update(bytes).digest("base64");
  if (bytes.byteLength !== metadata.size || metadata.shasum !== sha1 || !metadata.integrity.split(/\s+/).includes(`sha512-${sha512}`)) fail("Tarball size or digest differs from npm metadata");
  return { size: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), sha1, integrity: `sha512-${sha512}` };
}
function verifyInstall(artifact, expected, npmCli, npm, archivePackage) {
  const runner = mkdtempSync(join(tmpdir(), "sureflow-t3-installed-"));
  try {
    const cache = join(runner, "cache"), home = join(runner, "home"); mkdirSync(cache); mkdirSync(home);
    writeFileSync(join(runner, "package.json"), JSON.stringify({ name: "sureflow-t3-runner", version: "0.0.0", private: true }));
    const env = { ...cleanEnvironment(home), npm_config_cache: cache };
    run(process.execPath, [npmCli, "install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--no-save", "--package-lock=false", "--cache", cache, artifact], { cwd: runner, env });
    const root = realpathSync(join(runner, "node_modules/sureflow")), cli = realpathSync(join(root, "dist/src/cli.js")), bin = join(runner, "node_modules/.bin/sureflow"), base = realpathSync(runner);
    if (!contained(base, root) || !existsSync(bin) || realpathSync(bin) !== cli || !contained(base, cli)) fail("Installed package or bin resolves outside the independent runner");
    if ((statSync(cli).mode & 0o111) === 0 || !readFileSync(cli, "utf8").startsWith("#!/usr/bin/env node\n")) fail("Installed CLI is not executable or lost its Node shebang");
    const actual = filesUnder(root).map((path) => relative(root, path).split(sep).join("/")).sort(), wanted = [...expected].map((path) => path.slice(8)).sort();
    if (JSON.stringify(actual) !== JSON.stringify(wanted)) fail("Installed file inventory differs from the accepted archive");
    for (const file of actual) if (!createHash("sha256").update(readFileSync(join(root, file))).digest().equals(createHash("sha256").update(readFileSync(join(archivePackage, file))).digest())) fail(`Installed content differs from artifact: ${file}`);
    const help = spawnSync(bin, ["--help"], { cwd: runner, env, encoding: "utf8" }), unknown = spawnSync(bin, ["t3-unknown-command"], { cwd: runner, env, encoding: "utf8" });
    const helpOutputPresent = typeof help.stdout === "string" && help.stdout.trim().length > 0;
    if (help.error || help.status !== 0 || !helpOutputPresent || unknown.error || unknown.status !== 2) fail("Installed CLI smoke differs from the public contract");
    return { packageRootRelative: "node_modules/sureflow", binRelative: "node_modules/.bin/sureflow", runnerContainment: true, archiveFileMatch: true, nodePathAbsent: env.NODE_PATH === undefined, npmVersion: npm, helpExit: help.status, helpOutputPresent, unknownCommandExit: unknown.status };
  } finally { rmSync(runner, { recursive: true, force: true }); }
}

function main() {
  const options = parseArgs(process.argv.slice(2)), artifactInput = text(options["--artifact"], "Artifact path"), npmInput = text(options["--npm-cli"], "npm CLI path");
  if (!isAbsolute(artifactInput) || !isAbsolute(npmInput)) fail("Artifact and npm CLI paths must be absolute");
  const artifact = resolve(artifactInput), packJson = resolve(text(options["--pack-json"], "npm pack JSON path")), sourceRoot = realpathSync(resolve(text(options["--source-root"], "Source root")));
  if (!lstatSync(artifact).isFile()) fail("Artifact must be a regular file, not a symlink");
  const sourceCommit = text(options["--source-commit"], "Source commit"), expectedName = text(options["--expected-name"], "Expected package name"), expectedVersion = text(options["--expected-version"], "Expected package version"), npmCli = realpathSync(resolve(npmInput)), packCommand = text(options["--pack-command"], "Pack command description"), npm = npmVersion(npmCli), expected = sourceContract(sourceRoot, sourceCommit, expectedName, expectedVersion), metadata = npmPackMetadata(packJson);
  if (metadata.name !== expectedName || metadata.version !== expectedVersion || metadata.filename !== `${expectedName}-${expectedVersion}.tgz` || basename(artifact) !== metadata.filename) fail("Tarball identity or filename differs from expected package");
  if (metadata.entryCount !== metadata.files.length) fail("npm entry count differs from complete files inventory");
  const entries = safeArchiveEntries(artifact, metadata.files), files = entries.filter((entry) => entry.type === "file"), directories = entries.filter((entry) => entry.type === "directory");
  if (JSON.stringify(files.map((entry) => entry.path).sort()) !== JSON.stringify([...expected].sort())) fail("Archive has a missing, unexpected, or prohibited regular file");
  const allowedDirectories = new Set(["package/"]);
  for (const file of files) for (let parent = dirname(file.path); parent !== "package" && parent !== "."; parent = dirname(parent)) allowedDirectories.add(`${parent}/`);
  if (directories.some((entry) => !allowedDirectories.has(entry.path))) fail("Archive has an unexpected directory");
  const digest = verifyDigests(artifact, metadata), archiveDirectory = mkdtempSync(join(tmpdir(), "sureflow-t3-inspect-"));
  let installed;
  try {
    run("tar", ["--extract", "--gzip", "--file", artifact, "--directory", archiveDirectory, "--no-same-owner", "--no-same-permissions"]);
    const packageDirectory = join(archiveDirectory, "package"), extracted = filesUnder(packageDirectory);
    if (extracted.length !== files.length || files.reduce((sum, entry) => sum + entry.size, 0) !== metadata.unpackedSize) fail("Extracted file count or unpacked size differs from npm inventory");
    for (const entry of files) if (statSync(join(packageDirectory, entry.logical)).size !== entry.size) fail(`Archive entry size differs from npm inventory: ${entry.path}`);
    checkSecrets(extracted);
    const manifest = record(JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")), "Archived manifest");
    if (manifest.name !== expectedName || manifest.version !== expectedVersion || manifest.bin?.sureflow !== "./dist/src/cli.js" || JSON.stringify(manifest.files) !== JSON.stringify(["dist/src"])) fail("Archived manifest differs from the T2 contract");
    if (!readFileSync(join(packageDirectory, "dist/src/cli.js"), "utf8").startsWith("#!/usr/bin/env node\n")) fail("Archived CLI is missing its Node shebang");
    if (options["--mode"] === "install") installed = verifyInstall(artifact, expected, npmCli, npm, packageDirectory);
  } finally { rmSync(archiveDirectory, { recursive: true, force: true }); }
  const inventory = entries.map(({ path, type, size, mode }) => ({ path, type, size, mode })).sort((left, right) => left.path.localeCompare(right.path));
  process.stdout.write(`${JSON.stringify({ accepted: true, artifactPath: artifact, filename: metadata.filename, packageName: metadata.name, packageVersion: metadata.version, size: digest.size, sha256: digest.sha256, npmShasum: digest.sha1, npmIntegrity: digest.integrity, inventory, nodeVersion: process.version, npmVersion: npm, packCommand, sourceCommit, ...(installed === undefined ? {} : { installed }) }, null, 2)}\n`);
}
try { main(); } catch (error) { process.stderr.write(`Distribution artifact verification refused: ${error instanceof Error ? error.message : "Unknown verifier failure"}\n`); process.exitCode = 1; }
