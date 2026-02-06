import { describe, test, expect, beforeEach } from "bun:test";
import { db, addUser, findUser, findUserByName, searchUsers, deleteUser } from "../src/db";

describe("SQL Parameterized Queries", () => {
  beforeEach(() => {
    db.run("DELETE FROM users");
  });

  test("should handle names with apostrophes", () => {
    // BUG: This will fail because the apostrophe breaks the SQL syntax
    // Error: SQLITE_ERROR: unrecognized token: "'"
    expect(() => {
      addUser("O'Brien", "obrien@test.com");
    }).not.toThrow();

    const user = findUserByName("O'Brien");
    expect(user).toBeDefined();
    expect(user?.name).toBe("O'Brien");
  });

  test("should handle emails with special characters", () => {
    addUser("Test User", "test+filter@example.com");

    // This should work but the query building is fragile
    const user = findUser("test+filter@example.com");
    expect(user).toBeDefined();
  });

  test("should prevent SQL injection in findUser", () => {
    addUser("Admin", "admin@test.com");
    addUser("Regular", "user@test.com");

    // SQL injection attempt - this should NOT return any user
    // But with string interpolation, it becomes:
    // SELECT * FROM users WHERE email = '' OR '1'='1'
    // which returns the first user (SQL injection success)
    const injectionAttempt = "' OR '1'='1";
    const result = findUser(injectionAttempt);

    // This test FAILS - the injection works and returns a user
    expect(result).toBeNull();
  });

  test("should prevent SQL injection in deleteUser", () => {
    addUser("Alice", "alice@test.com");
    addUser("Bob", "bob@test.com");
    addUser("Charlie", "charlie@test.com");

    // Attacker tries to delete all users with injection
    // DELETE FROM users WHERE email = '' OR '1'='1'
    const maliciousInput = "' OR '1'='1";
    deleteUser(maliciousInput);

    // This test FAILS - all users get deleted instead of none
    const alice = findUser("alice@test.com");
    const bob = findUser("bob@test.com");
    const charlie = findUser("charlie@test.com");

    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(charlie).toBeDefined();
  });

  test("should handle search with percent signs safely", () => {
    addUser("Test User", "test@example.com");
    addUser("Another User", "another@example.com");

    // BUG: Percent signs in search break the LIKE pattern
    // This could match unintended records or cause errors
    const results = searchUsers("100%");

    // Should find nothing, not accidentally match everything
    expect(results.length).toBe(0);
  });

  test("should handle names with double quotes", () => {
    // Names with quotes should be stored and retrieved correctly
    expect(() => {
      addUser('John "Johnny" Doe', "john@test.com");
    }).not.toThrow();

    const user = findUser("john@test.com");
    expect(user?.name).toBe('John "Johnny" Doe');
  });

  test("should handle backslashes in input", () => {
    // Backslashes can cause escaping issues
    expect(() => {
      addUser("Path\\User", "path@test.com");
    }).not.toThrow();

    const user = findUserByName("Path\\User");
    expect(user).toBeDefined();
    expect(user?.name).toBe("Path\\User");
  });

  test("should handle semicolons without executing additional statements", () => {
    addUser("Victim", "victim@test.com");

    // Attempt to inject additional SQL statement
    // With string interpolation this becomes:
    // SELECT * FROM users WHERE email = ''; DROP TABLE users; --'
    const injection = "'; DROP TABLE users; --";

    // This might throw or succeed depending on SQLite configuration
    // but should NEVER actually drop the table
    try {
      findUser(injection);
    } catch {
      // Expected to potentially throw
    }

    // Table should still exist and have data
    // This test FAILS if the injection succeeds
    expect(() => {
      const user = findUser("victim@test.com");
      expect(user).toBeDefined();
    }).not.toThrow();
  });
});
