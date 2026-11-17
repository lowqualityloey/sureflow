import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { VERIFIER_OUTPUT_LIMIT_BYTES, createBoundedCapture, runBounded } from "./helpers/boundedOutput.js";

const MIB = 1024 * 1024;
const scratch = mkdtempSync(join(tmpdir(), "sureflow-bounded-output-"));
afterAll(() => { rmSync(scratch, { recursive: true, force: true }); });

function captureOf(stream: "stdout" | "stderr", maxBytes: number): { capture: ReturnType<typeof createBoundedCapture>; overflows: Error[] } {
  const overflows: Error[] = [];
  const capture = createBoundedCapture(stream, maxBytes, (error) => { overflows.push(error); });
  return { capture, overflows };
}

describe("bounded verifier output capture", () => {
  it("accepts output below the limit without reporting overflow", () => {
    const { capture, overflows } = captureOf("stdout", 16);
    capture.push(Buffer.from("hello "));
    capture.push(Buffer.from("world"));
    expect(overflows).toEqual([]);
    expect(capture.overflow).toBeNull();
    expect(capture.bytes).toBe(11);
    expect(capture.text()).toBe("hello world");
  });

  it("accepts output that lands exactly on the limit when nothing follows", () => {
    const { capture, overflows } = captureOf("stdout", 8);
    capture.push(Buffer.from("abcd"));
    capture.push(Buffer.from("efgh"));
    expect(overflows).toEqual([]);
    expect(capture.overflow).toBeNull();
    expect(capture.bytes).toBe(8);
    expect(capture.text()).toBe("abcdefgh");
  });

  it("does not treat an empty chunk as output after the limit is reached", () => {
    const { capture, overflows } = captureOf("stdout", 4);
    capture.push(Buffer.from("abcd"));
    capture.push(Buffer.alloc(0));
    capture.push(Buffer.alloc(0));
    expect(overflows).toEqual([]);
    expect(capture.overflow).toBeNull();
    expect(capture.bytes).toBe(4);
  });

  it("rejects a single chunk that exceeds the limit", () => {
    const { capture, overflows } = captureOf("stdout", 4);
    capture.push(Buffer.from("abcdefghij"));
    expect(overflows).toHaveLength(1);
    expect(capture.overflow?.message).toBe("Distribution verifier stdout exceeded the 4 byte output limit");
    expect(capture.bytes).toBe(4);
    expect(capture.text()).toBe("abcd");
  });

  it("rejects output that crosses the limit across several chunks", () => {
    const { capture, overflows } = captureOf("stderr", 6);
    capture.push(Buffer.from("aaa"));
    capture.push(Buffer.from("bbb"));
    capture.push(Buffer.from("c"));
    expect(overflows).toHaveLength(1);
    expect(capture.overflow?.message).toBe("Distribution verifier stderr exceeded the 6 byte output limit");
    expect(capture.bytes).toBe(6);
    expect(capture.text()).toBe("aaabbb");
  });

  it("rejects a non-empty chunk that arrives after the limit was exactly reached", () => {
    const { capture, overflows } = captureOf("stdout", 4);
    capture.push(Buffer.from("abcd"));
    expect(capture.overflow).toBeNull();
    capture.push(Buffer.from("e"));
    expect(overflows).toHaveLength(1);
    expect(capture.overflow).not.toBeNull();
    expect(capture.bytes).toBe(4);
    expect(capture.text()).toBe("abcd");
  });

  it("reports the first overflow once per stream and keeps both limits independent", () => {
    const stdout = captureOf("stdout", 4), stderr = captureOf("stderr", 4);
    stdout.capture.push(Buffer.from("over"));
    stderr.capture.push(Buffer.from("ok"));
    stdout.capture.push(Buffer.from("over"));
    expect(stdout.overflows).toHaveLength(1);
    expect(stderr.overflows).toEqual([]);
    expect(stderr.capture.overflow).toBeNull();
    expect(stderr.capture.text()).toBe("ok");
  });

  it("exposes the documented 4 MiB ceiling at exactly 4 MiB with a following chunk rejected", () => {
    const { capture, overflows } = captureOf("stdout", VERIFIER_OUTPUT_LIMIT_BYTES);
    capture.push(Buffer.alloc(VERIFIER_OUTPUT_LIMIT_BYTES, 0x61));
    expect(capture.overflow).toBeNull();
    expect(capture.bytes).toBe(4 * MIB);
    capture.push(Buffer.from("x"));
    expect(overflows).toHaveLength(1);
    expect(capture.overflow?.message).toContain("4 MiB");
    expect(capture.bytes).toBe(4 * MIB);
  });
});

describe("bounded verifier process execution", () => {
  it("resolves a child that stays within the limit", async () => {
    const result = await runBounded(process.execPath, ["-e", 'process.stdout.write("done"); process.stderr.write("note");'], { cwd: scratch, env: process.env, maxBytes: 64 });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("done");
    expect(result.stderr).toBe("note");
  });

  it("rejects rather than resolves when a child floods stdout past the limit, and terminates it", async () => {
    const pidFile = join(scratch, "flood.pid");
    const script = 'require("node:fs").writeFileSync(process.env.PID_FILE ?? "", String(process.pid)); process.stdout.write("x".repeat(4096)); setInterval(() => { process.stdout.write("x".repeat(1024)); }, 5);';
    await expect(runBounded(process.execPath, ["-e", script], { cwd: scratch, env: { ...process.env, PID_FILE: pidFile }, maxBytes: 64 })).rejects.toThrow(/stdout exceeded the 64 byte output limit/);
    const pid = Number(readFileSync(pidFile, "utf8"));
    expect(Number.isInteger(pid)).toBe(true);
    expect(() => { process.kill(pid, 0); }).toThrow();
  }, 20_000);

  it("rejects when a child floods stderr past the limit, naming the stream", async () => {
    const script = 'process.stderr.write("e".repeat(4096)); setInterval(() => { process.stderr.write("e".repeat(1024)); }, 5);';
    await expect(runBounded(process.execPath, ["-e", script], { cwd: scratch, env: process.env, maxBytes: 64 })).rejects.toThrow(/stderr exceeded the 64 byte output limit/);
  }, 20_000);
});
