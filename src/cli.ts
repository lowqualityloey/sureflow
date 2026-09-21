/**
 * Sureflow CLI (M1/M2 surface: init, run, status, verify).
 *
 * The public command set is unchanged. A canonical `.sureflow/task.json`
 * routes `run` and `verify` to the M2 control-plane path; absent that file,
 * the original T0 compatibility path remains in place.
 *
 * Exit codes are the approved §9 contract: 0 = accepted/pass,
 * 2 = controlled halt/blocked/failure.
 */
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { mutationLockExists } from "./mutationLock.js";
import { readRuntimeState } from "./stateReader.js";
import { initRuntimeState } from "./stateWriter.js";
import { runT0Task } from "./runTask.js";
import { verifyT0Task } from "./verifyTask.js";
import { hasM2TaskContract, runM2Task } from "./m2Orchestration.js";
import { verifyM2Task } from "./m2Orchestration.js";
import {
  EXIT_ACCEPTED,
  EXIT_CONTROLLED_HALT,
  formatStatusLines,
  formatMutationInProgressLines,
  statusExitCode,
} from "./statusReport.js";

export const APPROVED_COMMANDS: readonly string[] = ["init", "run", "status", "verify"] as const;

export interface CliIo {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

function helpLines(): readonly string[] {
  return [
    "sureflow — approved commands: init, run, status, verify",
    "  sureflow init [--force]   create .sureflow/ runtime state (refuses to overwrite)",
    "  sureflow status           read-only runtime status from .sureflow/state/",
    "  sureflow run <taskId>     run the canonical task (M2 contract or T0 compatibility path)",
    "  sureflow verify <taskId>   verify the canonical task from persisted evidence",
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
    io.err(
      "Human: pass --force for partial core-state reinitialization; " +
        "task history, evidence, and events are preserved.",
    );
    return EXIT_CONTROLLED_HALT;
  }
  if (outcome.kind === "blocked") {
    io.err(`Sureflow init: HALT — ${outcome.reason}`);
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
  if (mutationLockExists(cwd)) {
    for (const line of formatMutationInProgressLines()) {
      io.out(line);
    }
    return EXIT_CONTROLLED_HALT;
  }
  const outcome = readRuntimeState(cwd);
  for (const line of formatStatusLines(outcome)) {
    io.out(line);
  }
  return statusExitCode(outcome);
}

function runTask(argv: readonly string[], cwd: string, io: CliIo): number {
  const taskId = argv[1];
  if (taskId === undefined || argv.length !== 2) {
    io.err("sureflow run: requires exactly one fixture taskId");
    return EXIT_CONTROLLED_HALT;
  }
  const outcome = runT0Task({ rootDir: cwd, requestedTaskId: taskId });
  if (outcome.kind === "accepted") {
    io.out(`Sureflow run: ACCEPT — ${outcome.taskId ?? "unknown task"} (${outcome.verdict ?? "PASS"})`);
    return EXIT_ACCEPTED;
  }
  io.err(`Sureflow run: HALT — ${outcome.reason}`);
  return EXIT_CONTROLLED_HALT;
}

function runVerify(argv: readonly string[], cwd: string, io: CliIo): number {
  const taskId = argv[1];
  if (taskId === undefined || argv.length !== 2) {
    io.err("sureflow verify: requires exactly one fixture taskId");
    return EXIT_CONTROLLED_HALT;
  }
  const outcome = verifyT0Task({ rootDir: cwd, requestedTaskId: taskId });
  if (outcome.kind === "verified") {
    io.out(
      "Sureflow verify: " +
        (String(outcome.verdict)) +
        " — " +
        (outcome.taskId ?? "unknown task"),
    );
    return EXIT_ACCEPTED;
  }
  const verdict = outcome.verdict === null ? "HALT" : "HALT — " + outcome.verdict;
  io.err(
    "Sureflow verify: " +
      verdict +
      " — " +
      (outcome.taskId ?? "unknown task") +
      ": " +
      outcome.reason,
  );
  return EXIT_CONTROLLED_HALT;
}

async function runTaskAsync(argv: readonly string[], cwd: string, io: CliIo): Promise<number> {
  const taskId = argv[1];
  if (taskId === undefined || argv.length !== 2) {
    io.err("sureflow run: requires exactly one taskId");
    return EXIT_CONTROLLED_HALT;
  }
  if (!hasM2TaskContract(cwd)) return runTask(argv, cwd, io);

  const outcome = await runM2Task({ rootDir: cwd, requestedTaskId: taskId });
  if (outcome.kind === "accepted") {
    io.out(`Sureflow run: ACCEPT — ${outcome.taskId ?? "unknown task"} (${outcome.verdict ?? "PASS"})`);
    return EXIT_ACCEPTED;
  }
  io.err(`Sureflow run: HALT — ${outcome.reason}`);
  return EXIT_CONTROLLED_HALT;
}

function runVerifyAsync(argv: readonly string[], cwd: string, io: CliIo): number {
  const taskId = argv[1];
  if (taskId === undefined || argv.length !== 2) {
    io.err("sureflow verify: requires exactly one taskId");
    return EXIT_CONTROLLED_HALT;
  }
  if (!hasM2TaskContract(cwd)) return runVerify(argv, cwd, io);

  const outcome = verifyM2Task({ rootDir: cwd, requestedTaskId: taskId });
  if (outcome.kind === "verified") {
    io.out(`Sureflow verify: ${String(outcome.verdict)} — ${outcome.taskId ?? "unknown task"}`);
    return EXIT_ACCEPTED;
  }
  const verdict = outcome.verdict === null ? "HALT" : `HALT — ${outcome.verdict}`;
  io.err(
    `Sureflow verify: ${verdict} — ${outcome.taskId ?? "unknown task"}: ${outcome.reason}`,
  );
  return EXIT_CONTROLLED_HALT;
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
  if (command === "run") return runTask(argv, cwd, io);
  if (command === "status") return runStatus(argv, cwd, io);
  if (command === "verify") return runVerify(argv, cwd, io);
  io.err(`sureflow: unknown command '${command}'. Approved: ${APPROVED_COMMANDS.join(", ")}`);
  return EXIT_CONTROLLED_HALT;
}

/** Async public entrypoint used by the direct CLI for T3's process seam. */
export async function runCliAsync(
  argv: readonly string[],
  cwd: string,
  io: CliIo,
): Promise<number> {
  const command = argv[0];
  if (command === "run") return runTaskAsync(argv, cwd, io);
  if (command === "verify") return runVerifyAsync(argv, cwd, io);
  return runCli(argv, cwd, io);
}

/** True only when this module is the process entrypoint (not when imported by tests). */
function invokedDirectly(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && entry === fileURLToPath(import.meta.url);
}

if (invokedDirectly()) {
  const exitCode = await runCliAsync(process.argv.slice(2), process.cwd(), {
      out: (line) => {
        console.log(line);
      },
      err: (line) => {
        console.error(line);
      },
    });
  process.exit(exitCode);
}
