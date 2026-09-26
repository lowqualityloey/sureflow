import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageOutput = resolve(repositoryRoot, "dist", "src");

await rm(packageOutput, { force: true, recursive: true });
