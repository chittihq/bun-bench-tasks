// Fixed build script - entrypoints properly specified as an array
import { join } from "path";

// Use current directory (same as buggy version) - this file gets copied to src/
const srcDir = join(import.meta.dir, ".");

export async function buildProject() {
  // FIX: entrypoints is now properly an array containing both entry points
  const result = await Bun.build({
    entrypoints: [join(srcDir, "main.ts"), join(srcDir, "worker.ts")],
    outdir: join(import.meta.dir, "..", "dist"),
    target: "bun",
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    return { success: false, outputs: [] };
  }

  return {
    success: true,
    outputs: result.outputs.map((o) => o.path),
  };
}

// Run build if executed directly
if (import.meta.main) {
  buildProject().then(console.log);
}
