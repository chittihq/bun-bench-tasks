/**
 * Glob directory scanning utilities
 * FIXED: Correct handling of symlinks and hidden files
 */

import { statSync } from "fs";
import { join } from "path";

export interface ScanOptions {
  cwd?: string;
  includeHidden?: boolean;
  followSymlinks?: boolean;
  onlyFiles?: boolean;
  onlyDirectories?: boolean;
  absolute?: boolean;
}

/**
 * Scan directory for files matching a pattern (sync)
 * FIXED: Properly pass options to scanSync
 */
export function scanDirectorySync(pattern: string, options: ScanOptions = {}): string[] {
  const glob = new Bun.Glob(pattern);
  const results: string[] = [];

  // FIXED: Pass options to scanSync with correct option names
  const scanOptions = {
    cwd: options.cwd,
    dot: options.includeHidden,
    followSymlinks: options.followSymlinks,
    onlyFiles: options.onlyFiles !== false, // default true
    absolute: options.absolute
  };

  for (const file of glob.scanSync(scanOptions)) {
    results.push(file);
  }

  return results;
}

/**
 * Scan directory for files matching a pattern (async)
 * FIXED: Proper async iteration with for-await-of
 */
export async function scanDirectoryAsync(pattern: string, options: ScanOptions = {}): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const results: string[] = [];

  // FIXED: Pass options and use for-await-of for async iteration
  const scanOptions = {
    cwd: options.cwd,
    dot: options.includeHidden,
    followSymlinks: options.followSymlinks,
    onlyFiles: options.onlyFiles !== false,
    absolute: options.absolute
  };

  // FIXED: Use for-await-of to properly iterate async iterator
  for await (const file of glob.scan(scanOptions)) {
    results.push(file);
  }

  return results;
}

/**
 * Find all hidden files in a directory
 * FIXED: Enable dot file matching with dot: true
 */
export function findHiddenFiles(cwd: string): string[] {
  const results: string[] = [];

  // FIXED: Match files starting with . (dotfiles)
  const dotfileGlob = new Bun.Glob("**/.*");
  for (const file of dotfileGlob.scanSync({ cwd, dot: true })) {
    results.push(file);
  }

  // FIXED: Also match files inside hidden directories
  const hiddenDirGlob = new Bun.Glob("**/.*/**/*");
  for (const file of hiddenDirGlob.scanSync({ cwd, dot: true })) {
    if (!results.includes(file)) {
      results.push(file);
    }
  }

  return results;
}

/**
 * Find files following symlinks
 * FIXED: Enable symlink following with followSymlinks: true
 */
export function findFilesWithSymlinks(pattern: string, cwd: string): string[] {
  const glob = new Bun.Glob(pattern);
  const results: string[] = [];

  // FIXED: Pass followSymlinks: true to traverse symlinked directories
  for (const file of glob.scanSync({ cwd, followSymlinks: true })) {
    results.push(file);
  }

  return results;
}

/**
 * Get absolute paths for matched files
 * FIXED: Return absolute paths with absolute: true
 */
export function getAbsolutePaths(pattern: string, cwd: string): string[] {
  const glob = new Bun.Glob(pattern);
  const results: string[] = [];

  // FIXED: Pass absolute: true to get absolute paths
  for (const file of glob.scanSync({ cwd, absolute: true })) {
    results.push(file);
  }

  return results;
}

/**
 * Find only directories matching pattern
 * FIXED: Set onlyFiles: false to get directories, then filter
 */
export function findDirectories(pattern: string, cwd: string): string[] {
  const glob = new Bun.Glob(pattern);
  const results: string[] = [];

  // FIXED: Pass onlyFiles: false to include directories in results
  // Then filter to only keep directories using statSync
  for (const file of glob.scanSync({ cwd, onlyFiles: false })) {
    // FIXED: Check if path is a directory using statSync
    const fullPath = join(cwd, file);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(file);
      }
    } catch {
      // Skip if stat fails
    }
  }

  return results;
}

/**
 * Comprehensive scan with all options
 * FIXED: Correct option mapping to Bun.Glob scan options
 */
export function comprehensiveScan(pattern: string, options: ScanOptions): string[] {
  const glob = new Bun.Glob(pattern);
  const results: string[] = [];

  // FIXED: Correct option names for Bun.Glob.scan()
  const scanOptions = {
    cwd: options.cwd,
    dot: options.includeHidden,           // FIXED: 'dot' enables hidden files
    followSymlinks: options.followSymlinks, // FIXED: correct option name
    onlyFiles: options.onlyFiles,         // FIXED: correct option name
    absolute: options.absolute            // FIXED: correct option name
  };

  for (const file of glob.scanSync(scanOptions)) {
    results.push(file);
  }

  return results;
}

/**
 * Count files matching pattern
 * FIXED: Use for-await-of for async iteration
 */
export async function countMatchingFiles(pattern: string, cwd: string): Promise<number> {
  const glob = new Bun.Glob(pattern);
  let count = 0;

  // FIXED: Use for-await-of for proper async iteration
  for await (const _ of glob.scan({ cwd })) {
    count++;
  }

  return count;
}
