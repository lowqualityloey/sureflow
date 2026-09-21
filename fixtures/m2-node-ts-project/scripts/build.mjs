import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
copyFileSync("src/displayName.ts", "dist/displayName.ts");
console.log("fixture build passed");
