#!/usr/bin/env bun
/**
 * Test all solutions in the benchmark tasks.
 *
 * Most tasks: symlink src -> solution, run tests, restore
 * Test-focused tasks (016-020, 077-078): run solution/*.test.ts directly
 * Build tasks (031-035, 080): copy solution files into src, keeping original source files
 */

import { readdirSync, existsSync, renameSync, symlinkSync, unlinkSync, copyFileSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { $ } from "bun";

const tasksDir = join(import.meta.dir, "..", "tasks");

// Tasks where the test file IS the buggy code and solution contains fixed test file
const TEST_FOCUSED_TASKS = [
  "task-016-test-async",
  "task-017-mock-cleanup",
  "task-018-expect-type",
  "task-019-test-timeout",
  "task-020-describe-scope",
  "task-077-snapshot-object",
  "task-078-snapshot-inline",
];

// Tasks where solution has build/config files that need to coexist with source files
// These tasks have both source files (main.ts, etc) and buggy build.ts in src/
// Solution only contains fixed build.ts, so we copy it into src/ instead of symlinking
const COPY_SOLUTION_TASKS = [
  "task-031-build-entry",
  "task-032-build-external",
  "task-033-build-outdir",
  "task-034-build-minify",
  "task-035-build-target",
  "task-045-import-meta",
  "task-080-compile-target",
];

async function testSolution(taskDir: string): Promise<{ passed: boolean; error?: string }> {
  const taskName = taskDir.split("/").pop()!;
  const srcDir = join(taskDir, "src");
  const srcBakDir = join(taskDir, "src.bak");
  const solutionDir = join(taskDir, "solution");

  console.log(`\nTesting solution in ${taskName}...`);

  if (!existsSync(solutionDir)) {
    console.log(`  ⏭️  No solution directory, skipping`);
    return { passed: true };
  }

  try {
    if (TEST_FOCUSED_TASKS.includes(taskName)) {
      // For test-focused tasks, run solution tests directly
      const result = await $`cd ${taskDir} && bun test solution/`.nothrow();
      const passed = result.exitCode === 0;
      if (!passed) {
        console.log(result.stderr.toString());
      }
      return { passed };
    } else if (COPY_SOLUTION_TASKS.includes(taskName)) {
      // For build tasks, copy solution files into src (keeping original source files)
      const solutionFiles = readdirSync(solutionDir);
      const backedUpFiles: string[] = [];

      // Backup existing files that will be overwritten
      for (const file of solutionFiles) {
        const srcFile = join(srcDir, file);
        const bakFile = join(srcDir, `${file}.bak`);
        if (existsSync(srcFile)) {
          renameSync(srcFile, bakFile);
          backedUpFiles.push(file);
        }
        // Copy solution file to src
        copyFileSync(join(solutionDir, file), srcFile);
      }

      const result = await $`cd ${taskDir} && bun test`.nothrow();
      const passed = result.exitCode === 0;

      // Restore backed up files
      for (const file of solutionFiles) {
        const srcFile = join(srcDir, file);
        const bakFile = join(srcDir, `${file}.bak`);
        unlinkSync(srcFile);
        if (existsSync(bakFile)) {
          renameSync(bakFile, srcFile);
        }
      }

      if (!passed) {
        console.log(result.stderr.toString());
      }
      return { passed };
    } else {
      // For regular tasks, symlink src -> solution
      if (existsSync(srcDir)) {
        renameSync(srcDir, srcBakDir);
      }

      symlinkSync("solution", srcDir);

      const result = await $`cd ${taskDir} && bun test`.nothrow();
      const passed = result.exitCode === 0;

      // Restore original src
      unlinkSync(srcDir);
      if (existsSync(srcBakDir)) {
        renameSync(srcBakDir, srcDir);
      }

      if (!passed) {
        console.log(result.stderr.toString());
      }
      return { passed };
    }
  } catch (error) {
    // Restore src on error
    if (existsSync(srcBakDir) && !existsSync(srcDir)) {
      try {
        unlinkSync(srcDir);
      } catch {}
      renameSync(srcBakDir, srcDir);
    }
    return { passed: false, error: String(error) };
  }
}

async function main() {
  const tasks = readdirSync(tasksDir)
    .filter(d => d.startsWith("task-"))
    .sort();

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const task of tasks) {
    const taskDir = join(tasksDir, task);
    const result = await testSolution(taskDir);

    if (result.passed) {
      passed++;
      console.log(`  ✅ PASSED`);
    } else {
      failed++;
      failures.push(task);
      console.log(`  ❌ FAILED`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${tasks.length} total`);

  if (failures.length > 0) {
    console.log(`\nFailed tasks:`);
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
