// Fixed build script - minify with sourcemaps enabled
import { join } from "path";
import { mkdir, exists } from "fs/promises";

// Use current directory - this file gets copied to src/
const srcDir = join(import.meta.dir, ".");
const outDir = join(import.meta.dir, "..", "dist");

export async function buildMinified() {
  await mkdir(outDir, { recursive: true });

  // FIX: Added sourcemap option alongside minify
  const result = await Bun.build({
    entrypoints: [join(srcDir, "utils.ts")],
    outdir: outDir,
    target: "bun",
    minify: true,
    sourcemap: "external", // Generate external sourcemap files
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    return {
      success: false,
      outputs: [],
      minified: true,
      hasSourcemap: false,
    };
  }

  // Check if sourcemap was generated
  const sourcemapPath = join(outDir, "utils.js.map");
  const hasSourcemap = await exists(sourcemapPath);

  return {
    success: true,
    outputs: result.outputs.map((o) => o.path),
    minified: true,
    hasSourcemap,
  };
}

export async function getMinifiedContent(): Promise<string> {
  await mkdir(outDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(srcDir, "utils.ts")],
    outdir: outDir,
    target: "bun",
    minify: true,
    sourcemap: "external",
  });

  if (!result.success || result.outputs.length === 0) {
    return "";
  }

  return await result.outputs[0].text();
}

export function getOutputDirectory(): string {
  return outDir;
}

// Run build if executed directly
if (import.meta.main) {
  buildMinified().then(console.log);
}
