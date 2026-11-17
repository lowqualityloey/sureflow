import { spawn } from "node:child_process";

/** The documented verifier output ceiling, enforced per stream. */
export const VERIFIER_OUTPUT_LIMIT_BYTES = 4 * 1024 * 1024;

export type BoundedStream = "stdout" | "stderr";

export interface BoundedCapture {
  /** Captured bytes, never above the limit. */
  readonly bytes: number;
  /** The first limit breach, or null while the stream stays within the limit. */
  readonly overflow: Error | null;
  push(chunk: Buffer): void;
  text(): string;
}

function limitLabel(maxBytes: number): string {
  return maxBytes === VERIFIER_OUTPUT_LIMIT_BYTES ? "4 MiB" : `${String(maxBytes)} byte`;
}

/**
 * Bounded per-stream capture. A chunk that would take the stream past `maxBytes`
 * is truncated and reported as an overflow, and any later non-empty chunk is
 * also an overflow — including one that arrives after the stream already reached
 * exactly `maxBytes`. Empty chunks never count as output and never overflow.
 */
export function createBoundedCapture(
  stream: BoundedStream,
  maxBytes: number,
  onOverflow: (error: Error) => void,
): BoundedCapture {
  const chunks: Buffer[] = [];
  let bytes = 0;
  let overflow: Error | null = null;
  return {
    get bytes(): number {
      return bytes;
    },
    get overflow(): Error | null {
      return overflow;
    },
    push(chunk: Buffer): void {
      if (overflow !== null || chunk.byteLength === 0) return;
      const remaining = maxBytes - bytes;
      if (chunk.byteLength > remaining) {
        if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
        bytes = maxBytes;
        overflow = new Error(`Distribution verifier ${stream} exceeded the ${limitLabel(maxBytes)} output limit`);
        onOverflow(overflow);
        return;
      }
      chunks.push(chunk);
      bytes += chunk.byteLength;
    },
    text(): string {
      return Buffer.concat(chunks).toString("utf8");
    },
  };
}

export interface BoundedRunOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly maxBytes?: number;
}

export interface BoundedRunResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Runs a child process with bounded capture on both pipes. Exceeding the limit
 * on either stream terminates the child and rejects the run, so an over-limit
 * child can never resolve as a successful verification.
 */
export function runBounded(command: string, args: readonly string[], options: BoundedRunOptions): Promise<BoundedRunResult> {
  const maxBytes = options.maxBytes ?? VERIFIER_OUTPUT_LIMIT_BYTES;
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd: options.cwd, env: options.env, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let spawnError: Error | null = null;
    let outputError: Error | null = null;
    const fail = (error: Error): void => {
      outputError ??= error;
      child.kill();
    };
    const stdout = createBoundedCapture("stdout", maxBytes, fail), stderr = createBoundedCapture("stderr", maxBytes, fail);
    child.stdout.on("data", (chunk: Buffer) => { stdout.push(chunk); });
    child.stderr.on("data", (chunk: Buffer) => { stderr.push(chunk); });
    child.once("error", (error: Error) => { spawnError = error; });
    child.once("close", (status: number | null) => {
      if (spawnError !== null) {
        reject(new Error(`Unable to spawn distribution verifier: ${spawnError.message}`));
        return;
      }
      if (outputError !== null) {
        reject(outputError);
        return;
      }
      resolve({ status, stdout: stdout.text(), stderr: stderr.text() });
    });
  });
}
