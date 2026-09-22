import { readFileSync } from "node:fs";

const source = readFileSync("src/displayName.ts", "utf8");
if (!source.includes("export function formatDisplayName")) {
  throw new Error("displayName source export is missing");
}
if (source.includes("console.")) {
  throw new Error("fixture source must not contain console output");
}
console.log("fixture lint passed");
