// Fixed build script - correct output directory path construction
import { join } from "path";

// Use current directory - this file gets copied to src/
const srcDir = join(import.meta.dir, ".");

// FIX: Output directory path correctly constructed
// Uses project root and correct version format
const projectRoot = join(import.meta.dir, "..");
const outDir = join(projectRoot, "dist", "v1"); // Correct: at project root with v1 format

// Expected output location for the application to find
const expectedVersionedPath = "dist/v1";

export async function buildApp() {
  try {
    const result = await Bun.build({
      entrypoints: [join(srcDir, "app.ts")],
      outdir: outDir, // Correct path
      target: "bun",
    });

    if (!result.success) {
      console.error("Build failed:", result.logs);
      return {
        success: false,
        outputs: [],
        outdir: outDir,
        expectedPath: expectedVersionedPath,
        error: "Build failed",
      };
    }

    return {
      success: true,
      outputs: result.outputs.map((o) => o.path),
      outdir: outDir,
      expectedPath: expectedVersionedPath,
    };
  } catch (error) {
    return {
      success: false,
      outputs: [],
      outdir: outDir,
      expectedPath: expectedVersionedPath,
      error: String(error),
    };
  }
}

export function getExpectedOutputPath(): string {
  // This is where the application expects to find the bundle
  return join(projectRoot, expectedVersionedPath, "app.js");
}

export function getActualOutputPath(): string {
  // This is where the bundle is actually written (now matches expected)
  return join(outDir, "app.js");
}

export function getOutputDirectory(): string {
  return outDir;
}

export function getExpectedDirectory(): string {
  return join(projectRoot, expectedVersionedPath);
}

// Run build if executed directly
if (import.meta.main) {
  buildApp().then(console.log);
}
