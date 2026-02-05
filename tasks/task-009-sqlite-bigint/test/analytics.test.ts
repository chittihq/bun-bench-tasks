import { describe, test, expect, beforeEach } from "bun:test";
import {
  logEvent,
  getEvent,
  getEventsByTimeRange,
  incrementCounter,
  getCounter,
  storeSnowflakeId,
  getSnowflakeId,
  findBySnowflakeId,
  generateSnowflakeId,
  nowNanoseconds,
  resetAnalytics,
} from "../src/analytics";

describe("BigInt Column Handling", () => {
  beforeEach(() => {
    resetAnalytics();
  });

  test("should handle safe integers correctly", () => {
    // This should work fine - within safe integer range
    const timestamp = 1000000000000n; // ~2001 in milliseconds (as bigint)
    const id = logEvent("test", timestamp);
    const event = getEvent(id);

    // With safeIntegers: true, all integers are returned as bigint
    expect(event?.timestamp_ns).toBe(timestamp);
  });

  test("should preserve nanosecond timestamp precision", () => {
    // Current time in nanoseconds - definitely exceeds MAX_SAFE_INTEGER
    const timestampNs = nowNanoseconds();

    console.log("Original timestamp (ns):", timestampNs.toString());
    console.log("MAX_SAFE_INTEGER:", Number.MAX_SAFE_INTEGER);
    console.log("Exceeds safe integer:", timestampNs > BigInt(Number.MAX_SAFE_INTEGER));

    const id = logEvent("precise_event", timestampNs);
    const event = getEvent(id);

    // BUG: This test FAILS - timestamp loses precision
    // The retrieved value won't match the original bigint
    expect(BigInt(event!.timestamp_ns)).toBe(timestampNs);
  });

  test("should store large counter values accurately", () => {
    // Start with a large value near MAX_SAFE_INTEGER
    const largeInitialValue = BigInt(Number.MAX_SAFE_INTEGER) - 10n;

    incrementCounter("large_counter", largeInitialValue);

    // Increment a few times
    for (let i = 0; i < 20; i++) {
      incrementCounter("large_counter", 1n);
    }

    const expectedValue = largeInitialValue + 20n;
    const actualValue = getCounter("large_counter");

    // BUG: This test FAILS - precision is lost at large values
    expect(BigInt(actualValue!)).toBe(expectedValue);
  });

  test("should handle Snowflake IDs without precision loss", () => {
    const snowflakeId = generateSnowflakeId();

    console.log("Generated Snowflake ID:", snowflakeId.toString());
    console.log("Bits used:", snowflakeId.toString(2).length);

    const id = storeSnowflakeId(snowflakeId);
    const retrieved = getSnowflakeId(id);

    // BUG: This test FAILS - Snowflake ID is corrupted
    expect(BigInt(retrieved!)).toBe(snowflakeId);
  });

  test("should find records by Snowflake ID", () => {
    const snowflakeId = generateSnowflakeId();
    const id = storeSnowflakeId(snowflakeId);

    // Try to find the record by its Snowflake ID
    const found = findBySnowflakeId(snowflakeId);

    // BUG: This test FAILS - can't find the record because ID was corrupted
    expect(found).not.toBeNull();
    // With safeIntegers: true, id column is returned as bigint
    expect(found?.id).toBe(BigInt(id));
  });

  test("should query events by nanosecond time range", () => {
    const baseTime = nowNanoseconds();

    // Log events at different nanosecond offsets
    logEvent("event1", baseTime);
    logEvent("event2", baseTime + 1000n); // 1 microsecond later
    logEvent("event3", baseTime + 2000n); // 2 microseconds later
    logEvent("event4", baseTime + 1000000n); // 1 millisecond later

    // Query for events within the first microsecond
    const events = getEventsByTimeRange(baseTime, baseTime + 1500n);

    // BUG: This test FAILS - range query doesn't work due to precision loss
    // Events might be incorrectly included or excluded
    expect(events.length).toBe(2); // Should only get event1 and event2
  });

  test("should handle 64-bit integer edge cases", () => {
    // Test with values near 64-bit boundaries
    const testValues = [
      BigInt(Number.MAX_SAFE_INTEGER), // 2^53 - 1
      BigInt(Number.MAX_SAFE_INTEGER) + 1n, // First unsafe integer
      BigInt("9223372036854775807"), // Max signed 64-bit (2^63 - 1)
      BigInt("4611686018427387904"), // 2^62
    ];

    for (const value of testValues) {
      const id = logEvent("boundary_test", value);
      const event = getEvent(id);

      // BUG: This test FAILS for values > MAX_SAFE_INTEGER
      expect(BigInt(event!.timestamp_ns)).toBe(value);
    }
  });

  test("should maintain precision across multiple operations", () => {
    const originalId = 7060885367627898880n; // A typical Discord Snowflake ID

    // Store the ID
    const id = storeSnowflakeId(originalId);

    // Retrieve it
    const retrieved1 = getSnowflakeId(id);

    // Verify the first retrieval maintains precision
    expect(BigInt(retrieved1!)).toBe(originalId);

    // Store a different snowflake ID derived from the first (simulating data migration)
    const secondId = originalId + 1n;
    const id2 = storeSnowflakeId(secondId);
    const retrieved2 = getSnowflakeId(id2);

    // BUG: This test FAILS - each round-trip corrupts the value further
    expect(BigInt(retrieved2!)).toBe(secondId);
  });

  test("should correctly compare large timestamps", () => {
    const t1 = 1704067200000000000n; // Jan 1, 2024 00:00:00 in nanoseconds
    const t2 = 1704067200000000001n; // 1 nanosecond later

    logEvent("first", t1);
    logEvent("second", t2);

    // Query for the second event specifically
    const events = getEventsByTimeRange(t2, t2);

    // BUG: This test FAILS - can't distinguish 1 nanosecond difference
    expect(events.length).toBe(1);
    expect(events[0].event_type).toBe("second");
  });

  test("should handle user IDs that are large integers", () => {
    const largeUserId = 7060885367627898880n;
    const sessionId = 1234567890123456789n;

    const eventId = logEvent("user_action", nowNanoseconds(), largeUserId, sessionId);
    const event = getEvent(eventId);

    // BUG: This test FAILS - user_id and session_id lose precision
    expect(BigInt(event!.user_id!)).toBe(largeUserId);
    expect(BigInt(event!.session_id!)).toBe(sessionId);
  });

  test("counter should work correctly near MAX_SAFE_INTEGER boundary", () => {
    // Set counter to just below MAX_SAFE_INTEGER
    const nearMaxSafe = BigInt(Number.MAX_SAFE_INTEGER) - 5n;
    incrementCounter("boundary_counter", nearMaxSafe);

    // Increment past the boundary
    for (let i = 0; i < 10; i++) {
      incrementCounter("boundary_counter", 1n);
    }

    const finalValue = BigInt(getCounter("boundary_counter")!);
    const expectedValue = nearMaxSafe + 10n;

    // BUG: This test FAILS - increments near boundary cause precision issues
    expect(finalValue).toBe(expectedValue);
  });
});
