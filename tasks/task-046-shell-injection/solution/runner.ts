/**
 * Shell command runner with file reading capabilities
 * FIXED: Proper escaping and safe input handling
 */

/**
 * Reads the contents of a file using shell cat command
 * FIXED: Uses Bun's tagged template which auto-escapes interpolated values
 */
export async function runUserCommand(filename: string): Promise<string> {
  // FIXED: Using tagged template interpolation - Bun automatically escapes
  const result = await Bun.$`cat ${filename}`.text();
  return result;
}

/**
 * Searches for a pattern in a file
 * FIXED: Both filename and pattern are properly escaped
 */
export async function searchInFile(filename: string, pattern: string): Promise<string> {
  // FIXED: Tagged template handles escaping for both arguments
  const result = await Bun.$`grep ${pattern} ${filename}`.nothrow().text();
  return result;
}

/**
 * Gets file information
 * FIXED: Using safe template interpolation
 */
export async function getFileInfo(filename: string): Promise<{
  size: string;
  lines: string;
  words: string;
}> {
  // FIXED: Each command uses safe interpolation
  // Note: Using file redirection requires a different approach
  // So we use wc directly with the filename
  const [sizeResult, linesResult, wordsResult] = await Promise.all([
    Bun.$`wc -c ${filename}`.nothrow().text(),
    Bun.$`wc -l ${filename}`.nothrow().text(),
    Bun.$`wc -w ${filename}`.nothrow().text(),
  ]);

  // Parse wc output (format: "   count filename")
  const parseWcOutput = (output: string): string => {
    const match = output.trim().match(/^\s*(\d+)/);
    return match ? match[1] : "0";
  };

  return {
    size: parseWcOutput(sizeResult),
    lines: parseWcOutput(linesResult),
    words: parseWcOutput(wordsResult),
  };
}

/**
 * Copies a file to a new location
 * FIXED: Both source and destination are safely escaped
 */
export async function copyFile(source: string, destination: string): Promise<boolean> {
  // FIXED: Safe interpolation for both paths
  const result = await Bun.$`cp ${source} ${destination}`.nothrow();
  return result.exitCode === 0;
}

/**
 * Lists files matching a pattern
 * FIXED: Use Bun.Glob for safe pattern matching (no shell involved)
 */
export async function listFiles(pattern: string): Promise<string[]> {
  // FIXED: Use Bun's native Glob for safe pattern matching
  // This avoids shell entirely, eliminating injection risk
  const glob = new Bun.Glob(pattern.split('/').pop() || '*');
  const dir = pattern.substring(0, pattern.lastIndexOf('/')) || '.';
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: dir, absolute: true })) {
    files.push(file);
  }
  return files;
}

/**
 * Alternative: Use Bun's native file APIs instead of shell
 * This is even safer as it doesn't involve shell at all
 */
export async function runUserCommandSafe(filename: string): Promise<string> {
  // Best practice: Use Bun.file() instead of shell cat
  const file = Bun.file(filename);
  if (!(await file.exists())) {
    throw new Error(`File not found: ${filename}`);
  }
  return await file.text();
}

/**
 * Safe file copy using Bun's native APIs
 */
export async function copyFileSafe(source: string, destination: string): Promise<boolean> {
  try {
    const sourceFile = Bun.file(source);
    if (!(await sourceFile.exists())) {
      return false;
    }
    await Bun.write(destination, sourceFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe file listing using Bun's Glob
 */
export async function listFilesSafe(pattern: string): Promise<string[]> {
  const glob = new Bun.Glob(pattern);
  const files: string[] = [];
  for await (const file of glob.scan({ dot: true })) {
    files.push(file);
  }
  return files;
}
