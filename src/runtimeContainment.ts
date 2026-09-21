/**
 * H3 physical containment check for existing runtime-path ancestry.
 *
 * This is path-resolution hardening only. It detects existing symlink
 * ancestry that leaves the lexical runtime namespace; it is not a TOCTOU- or
 * race-proof filesystem sandbox.
 */
import { lstatSync, realpathSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

function isWithin(boundary: string, candidate: string): boolean {
  const fromBoundary = relative(boundary, candidate);
  return (
    fromBoundary === "" ||
    (!fromBoundary.startsWith(`..${sep}`) &&
      fromBoundary !== ".." &&
      !fromBoundary.startsWith(sep))
  );
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

/**
 * Refuse existing filesystem ancestry that resolves outside the requested
 * physical runtime namespace. Missing paths are allowed so callers can
 * create their normal runtime directories after resolution.
 */
export function assertRuntimePathContained(
  rootDir: string,
  relativePath: string,
  authorityRelativePath: string,
): void {
  const pathSegments = relativePath.split("/").filter((segment) => segment.length > 0);
  const authoritySegments = authorityRelativePath
    .split("/")
    .filter((segment) => segment.length > 0);
  if (
    authoritySegments.length === 0 ||
    authoritySegments.some((segment, index) => pathSegments[index] !== segment)
  ) {
    throw new Error(`refused: ${relativePath} is outside ${authorityRelativePath}/`);
  }

  const rootLexical = resolve(rootDir);
  let rootPhysical: string;
  try {
    rootPhysical = realpathSync(rootLexical);
  } catch (error: unknown) {
    if (isMissing(error)) return;
    throw new Error(`refused: unable to validate runtime path root ${rootDir}`);
  }

  for (let index = 0; index < pathSegments.length; index += 1) {
    const lexicalAncestor = join(rootLexical, ...pathSegments.slice(0, index + 1));
    try {
      lstatSync(lexicalAncestor);
    } catch (error: unknown) {
      if (isMissing(error)) return;
      throw new Error(`refused: unable to inspect runtime path ancestor ${relativePath}`);
    }

    let physicalAncestor: string;
    try {
      physicalAncestor = realpathSync(lexicalAncestor);
    } catch {
      throw new Error(`refused: runtime path ancestor cannot be resolved: ${relativePath}`);
    }

    const boundarySegments = pathSegments.slice(
      0,
      Math.min(index + 1, authoritySegments.length),
    );
    const physicalBoundary = join(rootPhysical, ...boundarySegments);
    if (!isWithin(physicalBoundary, physicalAncestor)) {
      throw new Error(`refused: runtime path symlink escapes ${authorityRelativePath}/`);
    }
  }
}
