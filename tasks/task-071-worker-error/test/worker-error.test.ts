import { describe, test, expect } from "bun:test";
import {
  computeValue,
  validateInput,
  triggerWorkerError,
} from "../src/main";

describe("Worker Error Handling", () => {
  test("should successfully compute valid input", async () => {
    const result = await computeValue(21);
    expect(result).toBe(42);
  });

  test("should successfully validate valid input", async () => {
    const result = await validateInput("hello");
    expect(result).toBe(true);
  });

  test("should reject with error when worker throws", async () => {
    await expect(triggerWorkerError()).rejects.toThrow();
  });

  test("should reject with meaningful error message", async () => {
    try {
      await triggerWorkerError();
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Intentional worker error");
    }
  });

  test("should reject when compute receives invalid input type", async () => {
    // Pass a string instead of number - worker should throw
    const invalidCompute = async () => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(
          new URL("../src/worker.ts", import.meta.url).href
        );

        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("Timeout: error was not caught"));
        }, 5000);

        worker.onmessage = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          // BUG: The buggy version doesn't handle error responses properly
          // The solution catches errors and sends them as { type: "error", message: ... }
          // Check if the response is an error type and reject accordingly
          if (event.data && event.data.type === "error") {
            reject(new Error(event.data.message));
          } else {
            resolve(event.data);
          }
        };

        worker.onerror = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(event.message || "Worker error"));
        };

        // Send invalid data type
        worker.postMessage({ type: "compute", data: "not a number" });
      });
    };

    await expect(invalidCompute()).rejects.toThrow();
  });

  test("should handle multiple sequential error scenarios", async () => {
    // First error
    await expect(triggerWorkerError()).rejects.toThrow();

    // Should still work for valid requests after error
    const result = await computeValue(10);
    expect(result).toBe(20);

    // Another error
    await expect(triggerWorkerError()).rejects.toThrow();
  });
});
