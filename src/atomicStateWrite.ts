/**
 * Replace one authoritative state file through a same-directory temporary.
 *
 * This is atomic replacement, not a durability guarantee: no fsync is used.
 * The temporary is created with exclusive creation and is cleaned up only
 * when this invocation successfully owns it.
 */
import {
  closeSync,
  openSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

function isAlreadyExists(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

export function atomicReplaceTextFile(absPath: string, content: string): void {
  const directory = dirname(absPath);
  const baseName = basename(absPath);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const temporaryPath = join(
      directory,
      `.${baseName}.tmp-${String(process.pid)}-${randomUUID()}`,
    );
    let fileDescriptor: number | undefined;
    let ownsTemporary = false;
    try {
      fileDescriptor = openSync(temporaryPath, "wx", 0o600);
      ownsTemporary = true;
      writeFileSync(fileDescriptor, content, { encoding: "utf8" });
      closeSync(fileDescriptor);
      fileDescriptor = undefined;
      renameSync(temporaryPath, absPath);
      ownsTemporary = false;
      return;
    } catch (error: unknown) {
      if (fileDescriptor !== undefined) {
        try {
          closeSync(fileDescriptor);
        } catch {
          // Preserve the original write/rename failure.
        }
      }
      if (ownsTemporary) {
        try {
          unlinkSync(temporaryPath);
        } catch {
          // Best-effort cleanup is limited to this invocation's temporary.
        }
      }
      if (isAlreadyExists(error) && attempt < 2) continue;
      throw error;
    }
  }

  throw new Error(`could not allocate an atomic state temporary for ${absPath}`);
}
