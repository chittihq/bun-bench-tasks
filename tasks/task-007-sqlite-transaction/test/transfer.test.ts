import { describe, test, expect, beforeEach } from "bun:test";
import {
  db,
  createAccount,
  getBalance,
  transfer,
  bulkCreateAccounts,
  applyInterestToAll,
  getTransactionLog,
  resetDatabase,
} from "../src/transfer";

describe("Transaction Rollback", () => {
  beforeEach(() => {
    resetDatabase();
  });

  test("transfer should be atomic - rollback on constraint violation", () => {
    const alice = createAccount("Alice", 100);
    const bob = createAccount("Bob", 50);

    // Try to transfer more than Alice has
    // This will fail due to CHECK constraint on balance >= 0
    // BUG: Alice's balance gets debited before the constraint check fails
    expect(() => {
      transfer(alice, bob, 150);
    }).toThrow();

    // BUG: This test FAILS - Alice's balance was debited even though transfer failed
    // With proper transaction, balances should be unchanged
    expect(getBalance(alice)).toBe(100); // FAILS: Actually shows -50 or error
    expect(getBalance(bob)).toBe(50); // FAILS: Unchanged but Alice lost money
  });

  test("transfer should be atomic - rollback on invalid destination", () => {
    const alice = createAccount("Alice", 100);
    const invalidAccountId = 9999; // Does not exist

    // The solution correctly validates the destination account and throws
    // BUG (in original): Money disappears from Alice's account!
    expect(() => {
      transfer(alice, invalidAccountId, 50);
    }).toThrow("Destination account does not exist");

    // With proper validation, Alice's balance should be unchanged
    expect(getBalance(alice)).toBe(100);
  });

  test("transfer should validate amount before any modifications", () => {
    const alice = createAccount("Alice", 100);
    const bob = createAccount("Bob", 50);

    // Transfer with invalid amount (0 or negative)
    // BUG: Debit happens BEFORE validation
    expect(() => {
      transfer(alice, bob, -10);
    }).toThrow("Transfer amount must be positive");

    // BUG: This test FAILS - Alice was debited -10 (gained $10) before validation
    expect(getBalance(alice)).toBe(100); // FAILS: Shows 110
    expect(getBalance(bob)).toBe(50);
  });

  test("bulk insert should be all-or-nothing", () => {
    const accounts = [
      { name: "User1", balance: 100 },
      { name: "User2", balance: 200 },
      { name: "User3", balance: -50 }, // Invalid - will throw
      { name: "User4", balance: 400 },
    ];

    // BUG: First two accounts are created before error on third
    expect(() => {
      bulkCreateAccounts(accounts);
    }).toThrow("Invalid balance");

    // BUG: This test FAILS - User1 and User2 were created
    // With proper transaction, no accounts should exist
    const count = (db.query("SELECT COUNT(*) as count FROM accounts").get() as { count: number })
      .count;
    expect(count).toBe(0); // FAILS: Shows 2
  });

  test("bulk insert should not leave partial data on constraint failure", () => {
    // First, create an account with a unique constraint scenario
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_name ON accounts(name)");

    const accounts = [
      { name: "UniqueUser", balance: 100 },
      { name: "AnotherUser", balance: 200 },
    ];
    bulkCreateAccounts(accounts);

    // Try to insert duplicates mixed with new
    const newAccounts = [
      { name: "NewUser1", balance: 100 },
      { name: "UniqueUser", balance: 300 }, // Duplicate - will fail
      { name: "NewUser2", balance: 200 },
    ];

    expect(() => {
      bulkCreateAccounts(newAccounts);
    }).toThrow();

    // BUG: NewUser1 was created before the duplicate error
    const count = (db.query("SELECT COUNT(*) as count FROM accounts").get() as { count: number })
      .count;
    expect(count).toBe(2); // FAILS: Shows 3 (original 2 + NewUser1)
  });

  test("interest application should be atomic", () => {
    createAccount("Account1", 1000);
    createAccount("Account2", 2000);
    createAccount("Account3", 3000);

    // Simulate a failure during interest application
    // by checking the transaction log which could fail
    const originalRun = db.run.bind(db);
    let callCount = 0;

    // @ts-ignore - monkey patching for test
    db.run = (...args: unknown[]) => {
      callCount++;
      // Fail on the 4th call (second interest log insert)
      if (callCount === 4) {
        throw new Error("Simulated logging failure");
      }
      return originalRun(...args);
    };

    expect(() => {
      applyInterestToAll(0.1); // 10% interest
    }).toThrow("Simulated logging failure");

    // Restore original
    // @ts-ignore
    db.run = originalRun;

    // BUG: This test FAILS - Account1 has interest applied, Account2 and Account3 don't
    // With proper transaction, all accounts should have original balance
    expect(getBalance(1)).toBe(1000); // FAILS: Shows 1100
  });

  test("concurrent-like modifications should maintain consistency", () => {
    const account = createAccount("SharedAccount", 1000);

    // Simulate what would happen with concurrent modifications
    // Without proper transaction isolation, race conditions can occur
    const operations = [
      () => transfer(account, account, 0), // Self-transfer edge case
    ];

    // While this isn't true concurrency, it demonstrates
    // the need for proper transaction boundaries
    for (const op of operations) {
      try {
        op();
      } catch {
        // ignore
      }
    }

    // Account should maintain its balance
    expect(getBalance(account)).toBe(1000);
  });

  test("transaction log should match actual transfers", () => {
    const alice = createAccount("Alice", 500);
    const bob = createAccount("Bob", 500);

    // Successful transfer
    transfer(alice, bob, 100);

    // Failed transfer (insufficient funds)
    try {
      transfer(alice, bob, 1000);
    } catch {
      // Expected
    }

    const log = getTransactionLog();

    // BUG: If the debit succeeded before constraint failure,
    // the log might be inconsistent with actual balances
    // Log shows 1 successful transfer
    expect(log.length).toBe(1);

    // But balances should reflect only the successful transfer
    // BUG: This might fail if partial transaction affected balance
    expect(getBalance(alice)).toBe(400);
    expect(getBalance(bob)).toBe(600);
  });
});
