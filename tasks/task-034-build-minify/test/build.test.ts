import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { rm, exists, readdir } from "fs/promises";
import { buildMinified, getMinifiedContent, getOutputDirectory } from "../src/build";

const distDir = join(import.meta.dir, "..", "dist");

describe("Bun.build() Minify with Sourcemaps", () => {
  beforeAll(async () => {
    // Clean up dist directory before tests
    if (await exists(distDir)) {
      await rm(distDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up after tests
    if (await exists(distDir)) {
      await rm(distDir, { recursive: true });
    }
  });

  test("should build successfully", async () => {
    const result = await buildMinified();
    expect(result.success).toBe(true);
  });

  test("output should be minified", async () => {
    const content = await getMinifiedContent();

    // Minified code characteristics:
    // - Short variable names
    // - No unnecessary whitespace
    // - No comments

    // Check that the output is compact (no excessive newlines)
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    // Minified code should be very compact
    // Unminified utils.ts has many lines, minified should have very few
    expect(lines.length).toBeLessThan(10);
  });

  test("should generate sourcemap file", async () => {
    await buildMinified();
    const outDir = getOutputDirectory();

    // Check for sourcemap file (.js.map)
    const files = await readdir(outDir);
    const sourcemapFile = files.find((f) => f.endsWith(".map"));

    // This will FAIL because sourcemap is not configured
    expect(sourcemapFile).toBeDefined();
  });

  test("sourcemap should exist alongside JS file", async () => {
    await buildMinified();
    const outDir = getOutputDirectory();

    const jsExists = await exists(join(outDir, "utils.js"));
    const mapExists = await exists(join(outDir, "utils.js.map"));

    expect(jsExists).toBe(true);
    // This will FAIL - no sourcemap generated
    expect(mapExists).toBe(true);
  });

  test("minified output should have debug reference for sourcemap", async () => {
    const content = await getMinifiedContent();

    // Bun uses debugId for sourcemap correlation (different from other bundlers)
    // The sourcemap file is generated alongside the JS file
    const hasDebugReference = content.includes("//# debugId=");

    // This will FAIL - without sourcemap config, no debug reference is added
    expect(hasDebugReference).toBe(true);
  });

  test("sourcemap should contain original source mapping", async () => {
    await buildMinified();
    const outDir = getOutputDirectory();
    const sourcemapPath = join(outDir, "utils.js.map");

    // This will FAIL because sourcemap doesn't exist
    const mapExists = await exists(sourcemapPath);
    expect(mapExists).toBe(true);

    if (mapExists) {
      const mapContent = await Bun.file(sourcemapPath).text();
      const sourcemap = JSON.parse(mapContent);

      // Sourcemap should have required fields
      expect(sourcemap.version).toBe(3);
      expect(sourcemap.sources).toBeDefined();
      expect(sourcemap.mappings).toBeDefined();
    }
  });

  test("build result should indicate sourcemap generation", async () => {
    const result = await buildMinified();

    // The build result should indicate sourcemap was generated
    // This will FAIL because hasSourcemap is false
    expect(result.hasSourcemap).toBe(true);
  });
});
