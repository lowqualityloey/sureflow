import { randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  fchmodSync,
  openSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

export type AtomicRename = (temporaryPath: string, targetPath: string) => void;

export interface SingleFileReplacementRequest {
  readonly targetPath: string;
  readonly replacementBytes: Uint8Array;
  readonly originalMode: number;
  readonly atomicRename: AtomicRename | undefined;
}

export function replaceSingleFile(request: SingleFileReplacementRequest): void {
  const directory = dirname(request.targetPath);
  const temporaryPath = join(
    directory,
    `.${basename(request.targetPath)}.tmp-${String(process.pid)}-${randomUUID()}`,
  );
  let fileDescriptor: number | undefined;
  let ownsTemporary = false;
  try {
    fileDescriptor = openSync(temporaryPath, "wx", request.originalMode);
    ownsTemporary = true;
    chmodSync(temporaryPath, request.originalMode);
    fchmodSync(fileDescriptor, request.originalMode);
    writeFileSync(fileDescriptor, request.replacementBytes);
    closeSync(fileDescriptor);
    fileDescriptor = undefined;
    (request.atomicRename ?? renameSync)(temporaryPath, request.targetPath);
    ownsTemporary = false;
  } catch (error: unknown) {
    if (fileDescriptor !== undefined) {
      try {
        closeSync(fileDescriptor);
      } catch {
        // Preserve the original failure.
      }
    }
    if (ownsTemporary) {
      try {
        unlinkSync(temporaryPath);
      } catch {
        // Cleanup is limited to this invocation's owned temporary.
      }
    }
    throw error;
  }
}
