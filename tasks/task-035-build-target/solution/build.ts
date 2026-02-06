// Fixed build script - correct target for Bun-specific code
import { join } from "path";
import { mkdir } from "fs/promises";

// Use current directory - this file gets copied to src/
const srcDir = join(import.meta.dir, ".");
const outDir = join(import.meta.dir, "..", "dist");

export async function buildServer() {
  await mkdir(outDir, { recursive: true });

  // FIX: Target is now "bun" to properly handle Bun-specific APIs
  const result = await Bun.build({
    entrypoints: [join(srcDir, "server.ts")],
    outdir: outDir,
    target: "bun", // CORRECT: Use "bun" for Bun-specific code
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    return {
      success: false,
      outputs: [],
      target: "bun",
    };
  }

  return {
    success: true,
    outputs: result.outputs.map((o) => o.path),
    target: "bun",
  };
}

export async function getBundleContent(): Promise<string> {
  await mkdir(outDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [join(srcDir, "server.ts")],
    outdir: outDir,
    target: "bun", // CORRECT target
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
  buildServer().then(console.log);
}
