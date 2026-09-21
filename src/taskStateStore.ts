import { existsSync, readFileSync } from "node:fs";
import { atomicReplaceTextFile } from "./atomicStateWrite.js";
import {
  createTaskState,
  createActiveState,
  isTaskState,
  resolveStatePath,
  type TaskState,
  type TaskStatus,
} from "./state.js";
import { ACTIVE_RELATIVE_PATH } from "./stateReader.js";

function assertTaskId(taskId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(taskId)) {
    throw new Error("invalid taskId for authoritative state path");
  }
}

export function taskStatePath(rootDir: string, taskId: string): string {
  assertTaskId(taskId);
  return resolveStatePath(rootDir, `.sureflow/state/tasks/${taskId}.json`);
}

function writeJson(path: string, value: unknown): void {
  atomicReplaceTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function taskStateExists(rootDir: string, taskId: string): boolean {
  return existsSync(taskStatePath(rootDir, taskId));
}

export function beginTask(rootDir: string, taskId: string, nowIso: string): TaskState {
  const path = taskStatePath(rootDir, taskId);
  if (existsSync(path)) throw new Error(`task state already exists: ${taskId}`);
  const state = createTaskState(taskId, nowIso);
  // Task content is replaced first; the active pointer follows. A reader that
  // observes the interval sees invalid state rather than a false success.
  writeJson(path, state);
  writeJson(resolveStatePath(rootDir, ACTIVE_RELATIVE_PATH), {
    ...createActiveState(nowIso),
    activeTaskId: taskId,
  });
  return state;
}

export function transitionTask(
  rootDir: string,
  taskId: string,
  status: Exclude<TaskStatus, "pending">,
  nowIso: string,
): TaskState {
  const path = taskStatePath(rootDir, taskId);
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isTaskState(parsed) || parsed.taskId !== taskId) {
    throw new Error(`invalid authoritative task state: ${taskId}`);
  }
  const state: TaskState = { ...parsed, status, updatedAt: nowIso };
  // Preserve the existing task-then-pointer order. These are separate atomic
  // replacements, not a transaction; readers reject any transient mismatch.
  writeJson(path, state);
  writeJson(
    resolveStatePath(rootDir, ACTIVE_RELATIVE_PATH),
    status === "running"
      ? { ...createActiveState(nowIso), activeTaskId: taskId }
      : createActiveState(nowIso),
  );
  return state;
}
