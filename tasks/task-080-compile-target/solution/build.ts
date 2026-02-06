// Fixed build script - correct target specification for cross-compilation
import { join } from "path";
import { mkdir, exists } from "fs/promises";

// Use current directory - this file gets copied to src/
const srcDir = join(import.meta.dir, ".");
const outDir = join(import.meta.dir, "..", "dist");

// FIX: Correct Bun target identifiers with "bun-" prefix
const VALID_TARGETS = {
  linux: "bun-linux-x64",
  "linux-arm": "bun-linux-arm64",
  "linux-baseline": "bun-linux-x64-baseline",
  macos: "bun-darwin-arm64",
  "macos-intel": "bun-darwin-x64",
  windows: "bun-windows-x64",
  "windows-baseline": "bun-windows-x64-baseline",
};

// All valid Bun compile targets
const ALL_VALID_TARGETS = [
  "bun-linux-x64",
  "bun-linux-x64-baseline",
  "bun-linux-arm64",
  "bun-darwin-x64",
  "bun-darwin-arm64",
  "bun-windows-x64",
  "bun-windows-x64-baseline",
];

export type TargetPlatform = keyof typeof VALID_TARGETS;

export interface BuildResult {
  success: boolean;
  outputPath: string | null;
  target: string;
  error?: string;
}

export async function buildForTarget(
  platform: TargetPlatform
): Promise<BuildResult> {
  await mkdir(outDir, { recursive: true });

  const entrypoint = join(srcDir, "app.ts");
  // FIX: Using correct Bun target identifier
  const target = VALID_TARGETS[platform];

  if (!target) {
    return {
      success: false,
      outputPath: null,
      target: "",
      error: `Unknown platform: ${platform}. Valid platforms: ${Object.keys(VALID_TARGETS).join(", ")}`,
    };
  }

  // Determine output filename based on target
  const isWindows = target.includes("windows");
  const outputName = isWindows ? "myapp.exe" : "myapp";
  const outputPath = join(outDir, `${platform}-${outputName}`);

  try {
    // FIX: Using correct target format with "bun-" prefix
    const proc = Bun.spawn(
      [
        "bun",
        "build",
        "--compile",
        `--target=${target}`, // Correct target format
        "--outfile",
        outputPath,
        entrypoint,
      ],
      {
        cwd: srcDir,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      return {
        success: false,
        outputPath: null,
        target,
        error: stderr || stdout,
      };
    }

    return {
      success: true,
      outputPath,
      target,
    };
  } catch (error) {
    return {
      success: false,
      outputPath: null,
      target,
      error: String(error),
    };
  }
}

export async function buildForAllTargets(): Promise<
  Record<string, BuildResult>
> {
  // Build for the three main platforms
  const mainPlatforms: TargetPlatform[] = ["linux", "macos", "windows"];
  const results: Record<string, BuildResult> = {};

  for (const platform of mainPlatforms) {
    results[platform] = await buildForTarget(platform);
  }

  return results;
}

export async function buildForAllArchitectures(): Promise<
  Record<string, BuildResult>
> {
  // Build for all supported target/architecture combinations
  const results: Record<string, BuildResult> = {};

  for (const [name, target] of Object.entries(VALID_TARGETS)) {
    results[name] = await buildForTarget(name as TargetPlatform);
  }

  return results;
}

export function getValidTargets(): string[] {
  // FIX: Returns correct Bun target identifiers
  return ALL_VALID_TARGETS;
}

export function isValidTarget(target: string): boolean {
  // FIX: Validates against correct Bun target format
  return ALL_VALID_TARGETS.includes(target);
}

export function getTargetForPlatform(platform: TargetPlatform): string | null {
  return VALID_TARGETS[platform] || null;
}

export function getPlatformFromTarget(target: string): string | null {
  for (const [platform, t] of Object.entries(VALID_TARGETS)) {
    if (t === target) {
      return platform;
    }
  }
  return null;
}

export function getOutputDirectory(): string {
  return outDir;
}

// Run build if executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const platform = (args[0] as TargetPlatform) || "linux";

  if (!VALID_TARGETS[platform]) {
    console.error(`Invalid platform: ${platform}`);
    console.error(`Valid platforms: ${Object.keys(VALID_TARGETS).join(", ")}`);
    process.exit(1);
  }

  console.log(`Building for ${platform} (${VALID_TARGETS[platform]})...`);
  const result = await buildForTarget(platform);
  console.log("Build result:", result);
}
