/**
 * Sureflow CLI (M1 surface: init, run, status, verify).
 *
 * T5 implements `init` and `status` only. `run` (T6) and `verify`
 * (T7) remain explicit stubs that halt with the approved exit code;
 * no additional public commands exist.
 *
 * Exit codes are the approved §9 contract: 0 = accepted/pass,
 * 2 = controlled halt/blocked/failure.
 */
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readRuntimeState } from "./stateReader.js";
import { initRuntimeState } from "./stateWriter.js";
import {
  EXIT_ACCEPTED,
  EXIT_CONTROLLED_HALT,
  formatStatusLines,
  statusExitCode,
} from "./statusReport.js";

export const APPROVED_COMMANDS: readonly string[] = ["init", "run", "status", "verify"] as const;

export interface CliIo {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

function helpLines(): readonly string[] {
  return [
    "sureflow (M1) — approved commands: init, run, status, verify",
    "  sureflow init [--force]   create .sureflow/ runtime state (refuses to overwrite)",
    "  sureflow status           read-only runtime status from .sureflow/state/",
    "  sureflow run ...          not implemented in M1 yet (T6)",
    "  sureflow verify ...       not implemented in M1 yet (T7)",
    "Exit codes: 0 = accepted/pass, 2 = controlled halt/blocked/failure",
  ];
}

function runInit(argv: readonly string[], cwd: string, io: CliIo): number {
  const flags = argv.slice(1);
  const unknown = flags.filter((flag) => flag !== "--force");
  if (unknown.length > 0) {
    io.err(`sureflow init: unsupported argument(s): ${unknown.join(", ")}`);
    return EXIT_CONTROLLED_HALT;
  }
  const outcome = initRuntimeState({
    rootDir: cwd,
    projectName: basename(cwd) || "sureflow-project",
    nowIso: new Date().toISOString(),
    force: flags.includes("--force"),
  });
  if (outcome.kind === "already-initialized") {
    io.err(`Sureflow init: refused — ${outcome.existingPath} already exists.`);
    io.err("Human: pass --force to reset the runtime state, or leave it unchanged.");
    return EXIT_CONTROLLED_HALT;
  }
  io.out("Sureflow init");
  io.out(`Created: ${outcome.createdPaths.join(", ")}`);
  io.out(`Verified: ${outcome.verified}`);
  io.out("Human: no action required");
  return EXIT_ACCEPTED;
}

function runStatus(argv: readonly string[], cwd: string, io: CliIo): number {
  const extra = argv.slice(1);
  if (extra.length > 0) {
    io.err(`sureflow status: unsupported argument(s): ${extra.join(", ")}`);
    return EXIT_CONTROLLED_HALT;
  }
  const outcome = readRuntimeState(cwd);
  for (const line of formatStatusLines(outcome)) {
    io.out(line);
  }
  return statusExitCode(outcome);
}

export function runCli(argv: readonly string[], cwd: string, io: CliIo): number {
  const command = argv[0];
  if (command === undefined || command === "--help" || command === "-h") {
    for (const line of helpLines()) {
      io.out(line);
    }
    return EXIT_ACCEPTED;
  }
  if (command === "init") return runInit(argv, cwd, io);
  if (command === "status") return runStatus(argv, cwd, io);
  if (command === "run" || command === "verify") {
    io.err(`sureflow ${command}: not implemented in M1 yet (${command === "run" ? "T6" : "T7"}).`);
    return EXIT_CONTROLLED_HALT;
  }
  io.err(`sureflow: unknown command '${command}'. Approved: ${APPROVED_COMMANDS.join(", ")}`);
  return EXIT_CONTROLLED_HALT;
}

/** True only when this module is the process entrypoint (not when imported by tests). */
function invokedDirectly(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && entry === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  process.exit(
    runCli(process.argv.slice(2), process.cwd(), {
      out: (line) => {
        console.log(line);
      },
      err: (line) => {
        console.error(line);
      },
    }),
  );
}
