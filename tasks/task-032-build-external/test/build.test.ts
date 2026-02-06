import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { rm, exists } from "fs/promises";
import { buildLibrary, getBundleContent } from "../src/build";

const distDir = join(import.meta.dir, "..", "dist");

describe("Bun.build() External Dependencies", () => {
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

  test("should build successfully with external config", async () => {
    // BUG: Without external config, the build fails because lodash/axios
    // are not installed. With external config, they're treated as externals
    // and the build succeeds.
    const result = await buildLibrary();
    expect(result.success).toBe(true);
  });

  test("should generate output file", async () => {
    const result = await buildLibrary();
    // BUG: Without external config, build fails and no output is generated
    expect(result.outputs.length).toBeGreaterThan(0);
  });

  test("bundle should preserve lodash import as external", async () => {
    // With external config, lodash import is preserved (not bundled)
    const content = await getBundleContent();

    // If lodash was external, the bundle would contain an import/require statement
    const hasLodashImport = content.includes('require("lodash")') ||
                           content.includes('from "lodash"') ||
                           content.includes("from 'lodash'");

    // BUG: Without external config, build fails so we can't check bundle content
    // With external config, lodash remains as an import statement
    expect(hasLodashImport).toBe(true);
  });

  test("bundle should preserve axios import as external", async () => {
    // With external config, axios import is preserved (not bundled)
    const content = await getBundleContent();

    // If axios was external, the bundle would contain an import/require statement
    const hasAxiosImport = content.includes('require("axios")') ||
                          content.includes('from "axios"') ||
                          content.includes("from 'axios'");

    // BUG: Without external config, build fails so we can't check bundle content
    // With external config, axios remains as an import statement
    expect(hasAxiosImport).toBe(true);
  });

  test("bundle size should be small when externals are excluded", async () => {
    const result = await buildLibrary();

    // With externals, bundle should be small (just our code, no lodash/axios)
    // BUG: Without external config, build fails (bundleSize is 0)
    expect(result.bundleSize).toBeGreaterThan(0);
    expect(result.bundleSize).toBeLessThan(2000);
  });
});
