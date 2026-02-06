import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  filterLines,
  sortUnique,
  countMatches,
  headMatches,
  transformText,
  extractColumns,
  findAndProcess,
  topWords,
  searchWithContext,
  calculateStats,
} from "../src/pipeline";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("Shell Pipe Tests", () => {
  let tempDir: string;
  let textFile: string;
  let csvFile: string;
  let numbersFile: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "shell-pipe-test-"));

    // Create test text file
    textFile = join(tempDir, "text.txt");
    await Bun.write(textFile, `apple
banana
apple
cherry
date
banana
elderberry
apple
fig
grape
apple
`);

    // Create test CSV file
    csvFile = join(tempDir, "data.csv");
    await Bun.write(csvFile, `name,age,city
Alice,30,NYC
Bob,25,LA
Carol,35,Chicago
Dave,28,NYC
Eve,32,LA
`);

    // Create numbers file
    numbersFile = join(tempDir, "numbers.txt");
    await Bun.write(numbersFile, `10
20
30
40
50
`);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("filterLines", () => {
    test("should filter lines matching pattern", async () => {
      const lines = await filterLines(textFile, "apple");
      // BUG: Returns empty array because grep doesn't receive cat output
      expect(lines).toContain("apple");
      expect(lines.length).toBe(4); // 4 lines with "apple"
    });

    test("should return empty for no matches", async () => {
      const lines = await filterLines(textFile, "zebra");
      expect(lines).toEqual([]);
    });
  });

  describe("sortUnique", () => {
    test("should return sorted unique lines", async () => {
      const lines = await sortUnique(textFile);
      // BUG: Returns empty because sort/uniq receive no input
      expect(lines.length).toBe(7); // 7 unique fruits (apple, banana, cherry, date, elderberry, fig, grape)
      expect(lines[0]).toBe("apple"); // alphabetically first
      expect(lines).not.toContain(""); // no empty lines
    });

    test("should be sorted alphabetically", async () => {
      const lines = await sortUnique(textFile);
      const sorted = [...lines].sort();
      expect(lines).toEqual(sorted);
    });
  });

  describe("countMatches", () => {
    test("should count lines matching pattern", async () => {
      const count = await countMatches(textFile, "apple");
      // BUG: May fail due to escaping issues
      expect(count).toBe(4);
    });

    test("should return 0 for no matches", async () => {
      const count = await countMatches(textFile, "zebra");
      expect(count).toBe(0);
    });
  });

  describe("headMatches", () => {
    test("should get first N matching lines", async () => {
      const lines = await headMatches(textFile, "a", 3);
      // BUG: Returns wrong result because intermediate output lost
      expect(lines.length).toBe(3);
    });

    test("should return all if fewer than N matches", async () => {
      const lines = await headMatches(textFile, "cherry", 5);
      expect(lines.length).toBe(1); // only one "cherry"
    });
  });

  describe("transformText", () => {
    test("should transform text through pipeline stages", async () => {
      const input = "HELLO WORLD";
      const result = await transformText(input, [
        "tr 'A-Z' 'a-z'",  // lowercase
        "tr ' ' '_'",       // spaces to underscores
      ]);
      // BUG: Each stage doesn't receive previous output
      expect(result.trim()).toBe("hello_world");
    });

    test("should handle single stage", async () => {
      const input = "hello";
      const result = await transformText(input, ["tr 'a-z' 'A-Z'"]);
      expect(result.trim()).toBe("HELLO");
    });
  });

  describe("extractColumns", () => {
    test("should extract specific columns from CSV", async () => {
      const columns = await extractColumns(csvFile, [1, 3]);
      // BUG: Returns empty because cut doesn't receive file content
      expect(columns.length).toBeGreaterThan(0);
      expect(columns[0]).toBe("name,city");
      expect(columns[1]).toBe("Alice,NYC");
    });

    test("should handle single column", async () => {
      const columns = await extractColumns(csvFile, [2]);
      expect(columns).toContain("age");
      expect(columns).toContain("30");
    });
  });

  describe("findAndProcess", () => {
    test("should find files and process them", async () => {
      // Create some test files
      await Bun.write(join(tempDir, "a.txt"), "file a");
      await Bun.write(join(tempDir, "b.txt"), "file b");

      const result = await findAndProcess(tempDir, "*.txt", "cat");
      // BUG: xargs doesn't receive find output
      expect(result).toBeTruthy();
    });
  });

  describe("topWords", () => {
    test("should return top N most frequent words", async () => {
      const words = await topWords(textFile, 3);
      // BUG: Complex pipeline completely broken, returns nothing
      expect(words.length).toBe(3);
      // "apple" appears 4 times, should be first
      expect(words[0]).toContain("apple");
    });
  });

  describe("searchWithContext", () => {
    test("should show matching lines with context", async () => {
      const result = await searchWithContext(textFile, "cherry", 1);
      // BUG: grep doesn't receive cat output
      expect(result).toContain("cherry");
      expect(result).toContain("apple"); // line before cherry
      expect(result).toContain("date");  // line after cherry
    });
  });

  describe("calculateStats", () => {
    test("should calculate sum, count, and average", async () => {
      const stats = await calculateStats(numbersFile, 1);
      // BUG: awk doesn't receive piped data
      expect(stats.sum).toBe(150);    // 10+20+30+40+50
      expect(stats.count).toBe(5);
      expect(stats.average).toBe(30);
    });
  });

  describe("integration tests", () => {
    test("should handle complex multi-stage pipeline", async () => {
      // Filter for NYC, extract names, sort
      const lines = await filterLines(csvFile, "NYC");
      expect(lines.length).toBe(2); // Alice and Dave are in NYC
    });

    test("should preserve data through entire pipeline", async () => {
      // Count unique fruits
      const unique = await sortUnique(textFile);
      expect(unique.length).toBe(7);

      // Count apples
      const appleCount = await countMatches(textFile, "apple");
      expect(appleCount).toBe(4);
    });
  });
});
