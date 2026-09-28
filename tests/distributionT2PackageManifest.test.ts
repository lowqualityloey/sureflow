import { describe, expect, it } from "vitest";
import manifest from "../package.json" with { type: "json" };
import lockfile from "../package-lock.json" with { type: "json" };

describe("Distribution T2 package manifest contract", () => {
  it("declares the selected package identity and first planned version", () => {
    expect(manifest.name).toBe("sureflow");
    expect(manifest.version).toBe("0.1.0");
  });

  it("preserves the public Node CLI and runtime engines", () => {
    expect(manifest.type).toBe("module");
    expect(manifest.bin).toEqual({ sureflow: "./dist/src/cli.js" });
    expect(manifest.engines).toEqual({ node: "^24.0.0", npm: ">=11" });
  });

  it("allows only compiled production modules into the package", () => {
    expect(manifest.files).toEqual(["dist/src"]);
  });

  it("runs the clean production build before packing without consumer install hooks", () => {
    expect(manifest.scripts).toMatchObject({
      "clean:package": "node scripts/clean-package-output.mjs",
      "build:package": "npm run clean:package && tsc -p tsconfig.package.json",
      prepack: "npm run build:package",
    });
    for (const hook of ["prepare", "preinstall", "install", "postinstall"]) {
      expect(manifest.scripts).not.toHaveProperty(hook);
    }
    expect(Object.keys(manifest.scripts).filter((name) => /^(?:prepublish|postpublish|publish|release)(?::|$)/.test(name))).toEqual([]);
  });

  it("keeps the existing development toolchain without runtime dependencies", () => {
    expect(manifest).not.toHaveProperty("dependencies");
    expect(manifest).not.toHaveProperty("optionalDependencies");
    expect(manifest).not.toHaveProperty("peerDependencies");
    expect(manifest.devDependencies).toEqual({
      "@eslint/js": "^9.18.0",
      "@types/node": "^24.13.6",
      eslint: "^9.18.0",
      typescript: "~5.7.3",
      "typescript-eslint": "^8.21.0",
      vitest: "^3.0.5",
    });
  });

  it("synchronizes lockfile identity, version, bin, engines, and development tools", () => {
    expect(lockfile.name).toBe(manifest.name);
    expect(lockfile.version).toBe(manifest.version);
    expect(lockfile.packages[""].name).toBe(manifest.name);
    expect(lockfile.packages[""].version).toBe(manifest.version);
    expect(lockfile.packages[""].bin).toEqual({ sureflow: "dist/src/cli.js" });
    expect(lockfile.packages[""].engines).toEqual(manifest.engines);
    expect(lockfile.packages[""].devDependencies).toEqual(manifest.devDependencies);
  });
});
