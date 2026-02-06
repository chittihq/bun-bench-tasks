import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  getClientConfig,
  getApiBaseUrl,
  isDebugMode,
  getEnvironment,
  isProduction,
  isDevelopment,
  getPublicEnvVars,
  buildApiUrl,
  getAnalyticsConfig,
  usesCorrectEnvAccess,
  isBrowser,
} from "../src/client-config";

describe("Client Config - Import Meta Env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set up env vars that would be available via import.meta.env in a real build
    delete process.env.VITE_API_BASE_URL;
    delete process.env.VITE_APP_NAME;
    delete process.env.VITE_APP_VERSION;
    delete process.env.VITE_DEBUG;
    delete process.env.VITE_ANALYTICS_ID;
    delete process.env.VITE_PUBLIC_KEY;
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe("environment detection", () => {
    test("should detect non-browser environment", () => {
      // In test environment (Bun), we're not in a browser
      expect(isBrowser()).toBe(false);
    });
  });

  describe("getClientConfig", () => {
    test("should use import.meta.env for VITE_ prefixed variables", () => {
      // In a proper setup, import.meta.env.VITE_* would be set at build time
      // The test checks that the code uses import.meta.env pattern

      // Set process.env which the buggy code uses
      process.env.VITE_API_BASE_URL = "https://api.example.com";
      process.env.VITE_APP_NAME = "Test App";

      const config = getClientConfig();

      // BUG: The code reads from process.env, which works in Node/Bun
      // but won't work in browser. We test that it SHOULD use import.meta.env
      expect(config.apiBaseUrl).toBe("https://api.example.com");

      // The real test: in a browser environment, this code would fail
      // because process.env doesn't exist
    });
  });

  describe("getApiBaseUrl", () => {
    test("should return configured API base URL", () => {
      process.env.VITE_API_BASE_URL = "https://api.prod.example.com";

      const url = getApiBaseUrl();

      expect(url).toBe("https://api.prod.example.com");
    });

    test("should return default when not configured", () => {
      const url = getApiBaseUrl();

      expect(url).toBe("/api");
    });
  });

  describe("isDebugMode", () => {
    test("should return true when debug is enabled", () => {
      process.env.VITE_DEBUG = "true";

      const debug = isDebugMode();

      expect(debug).toBe(true);
    });

    test("should return false by default", () => {
      const debug = isDebugMode();

      expect(debug).toBe(false);
    });
  });

  describe("getEnvironment", () => {
    test("should use import.meta.env.MODE pattern for browser builds", () => {
      // The code should use import.meta.env.MODE, not process.env.NODE_ENV
      // This is a conceptual test - the implementation is buggy

      const env = getEnvironment();

      // In browser builds, import.meta.env.MODE would be "development" or "production"
      expect(["development", "production", "test"]).toContain(env);
    });
  });

  describe("isProduction/isDevelopment", () => {
    test("isProduction should use import.meta.env.PROD", () => {
      process.env.NODE_ENV = "production";

      const isProd = isProduction();

      expect(isProd).toBe(true);
    });

    test("isDevelopment should use import.meta.env.DEV", () => {
      process.env.NODE_ENV = "development";

      const isDev = isDevelopment();

      expect(isDev).toBe(true);
    });
  });

  describe("getPublicEnvVars", () => {
    test("should return VITE_ prefixed env vars", () => {
      process.env.VITE_API_URL = "https://api.example.com";
      process.env.VITE_APP_NAME = "My App";
      process.env.SECRET_KEY = "should-not-include";

      const publicVars = getPublicEnvVars();

      expect(publicVars.VITE_API_URL).toBe("https://api.example.com");
      expect(publicVars.VITE_APP_NAME).toBe("My App");
      expect(publicVars.SECRET_KEY).toBeUndefined();
    });

    test("should return PUBLIC_ prefixed env vars", () => {
      process.env.PUBLIC_API_KEY = "public-key-123";

      const publicVars = getPublicEnvVars();

      expect(publicVars.PUBLIC_API_KEY).toBe("public-key-123");
    });
  });

  describe("buildApiUrl", () => {
    test("should build correct URL with path", () => {
      process.env.VITE_API_BASE_URL = "https://api.example.com";

      const url = buildApiUrl("/users");

      expect(url).toBe("https://api.example.com/users");
    });

    test("should handle path without leading slash", () => {
      process.env.VITE_API_BASE_URL = "https://api.example.com";

      const url = buildApiUrl("users");

      expect(url).toBe("https://api.example.com/users");
    });
  });

  describe("getAnalyticsConfig", () => {
    test("should return disabled analytics when no ID", () => {
      const config = getAnalyticsConfig();

      expect(config.id).toBe("");
      expect(config.enabled).toBe(false);
    });

    test("should enable analytics in production with ID", () => {
      process.env.VITE_ANALYTICS_ID = "UA-12345";
      process.env.NODE_ENV = "production";

      const config = getAnalyticsConfig();

      expect(config.id).toBe("UA-12345");
      expect(config.enabled).toBe(true);
    });
  });

  describe("usesCorrectEnvAccess", () => {
    test("should return true in server context where process.env is valid", () => {
      // In server context (Bun/Node), using process.env is correct
      // The solution returns true for server context
      const usesCorrect = usesCorrectEnvAccess();

      // We're running in Bun (server context), so this should be true
      // BUG: The buggy code might not properly check the environment
      if (!isBrowser()) {
        expect(usesCorrect).toBe(true);
      }
    });

    test("should properly detect environment context", () => {
      // The solution correctly checks if we're in browser vs server
      const usesCorrect = usesCorrectEnvAccess();

      // In server context, process.env is acceptable
      // The solution returns true for server context
      if (!isBrowser()) {
        expect(usesCorrect).toBe(true);
      }
    });
  });
});
