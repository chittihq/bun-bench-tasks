/**
 * Glob pattern matching utilities
 * FIXED: Correct glob pattern syntax for proper matching
 */

/**
 * Check if a file path matches a TypeScript file pattern
 * FIXED: Using correct recursive pattern (double-star slash star dot ts)
 */
export function isTypeScriptFile(filePath: string): boolean {
  // FIXED: Use "**/*.ts" to match TypeScript files at any depth
  const glob = new Bun.Glob("**/*.ts");
  return glob.match(filePath);
}

/**
 * Check if a file matches one of the given extensions
 * FIXED: Proper brace expansion syntax
 */
export function matchesExtension(filePath: string, extensions: string[]): boolean {
  // FIXED: Build proper brace expansion pattern "*.{ts,js}"
  const pattern = extensions.length === 1
    ? `*.${extensions[0]}`
    : `*.{${extensions.join(",")}}`;
  const glob = new Bun.Glob(pattern);
  return glob.match(filePath);
}

/**
 * Match files against multiple patterns (any match returns true)
 * FIXED: Check each pattern individually instead of concatenating
 */
export function matchAnyPattern(filePath: string, patterns: string[]): boolean {
  // FIXED: Test each pattern separately and return true if any matches
  for (const pattern of patterns) {
    const glob = new Bun.Glob(pattern);
    if (glob.match(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if file is in a specific directory pattern
 * FIXED: Proper directory matching with file wildcard
 */
export function isInDirectory(filePath: string, dirPattern: string): boolean {
  // FIXED: Use "**/*" to match any file within the directory recursively
  const glob = new Bun.Glob(`${dirPattern}/**/*`);
  return glob.match(filePath);
}

/**
 * Match source files (ts, tsx, js, jsx)
 * FIXED: Correct brace expansion syntax with curly braces
 */
export function isSourceFile(filePath: string): boolean {
  // FIXED: Use proper brace expansion syntax "**/*.{ts,tsx,js,jsx}"
  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx}");
  return glob.match(filePath);
}

/**
 * Match config files by name pattern
 * FIXED: Use multiple patterns checked individually
 */
export function isConfigFile(filePath: string): boolean {
  // FIXED: Check multiple config file patterns
  const configPatterns = [
    "**/*.config.*",      // webpack.config.js, vite.config.ts, etc.
    "**/*rc",             // .eslintrc, .prettierrc, etc.
    "**/*rc.*",           // .eslintrc.js, .prettierrc.json, etc.
    "**/tsconfig.json",   // TypeScript config
    "**/jsconfig.json",   // JavaScript config
    "**/.*.rc",           // Hidden rc files
    "**/.*rc"             // Hidden rc files without extension
  ];

  for (const pattern of configPatterns) {
    const glob = new Bun.Glob(pattern);
    if (glob.match(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Get all matching files from a list
 * Returns files that match the given pattern
 */
export function filterByPattern(files: string[], pattern: string): string[] {
  const glob = new Bun.Glob(pattern);
  return files.filter(file => glob.match(file));
}

/**
 * Check if path should be excluded based on common ignore patterns
 * FIXED: Use positive patterns and check for matches
 */
export function shouldExclude(filePath: string): boolean {
  // FIXED: Use positive patterns (without "!") to check if path matches
  // exclusion directories
  const excludePatterns = [
    "node_modules/**",
    "**/node_modules/**",
    "dist/**",
    "**/dist/**",
    ".git/**",
    "**/.git/**"
  ];

  // FIXED: Return true if ANY exclusion pattern matches
  for (const pattern of excludePatterns) {
    const glob = new Bun.Glob(pattern);
    if (glob.match(filePath)) {
      return true;
    }
  }
  return false;
}
