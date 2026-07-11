import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./server-env";

describe("parseServerEnv", () => {
  it("parses valid server environment values with defaults", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgres://edtech:edtech@localhost:5432/edtech",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET: "change-me-in-local-env",
    });

    expect(env).toEqual({
      NODE_ENV: "development",
      PORT: 3001,
      APP_URL: "http://localhost:3000",
      API_URL: "http://localhost:3001",
      DATABASE_URL: "postgres://edtech:edtech@localhost:5432/edtech",
      DATABASE_MIGRATE_URL: undefined,
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET: "change-me-in-local-env",
    });
  });

  it("parses DATABASE_MIGRATE_URL when provided", () => {
    const env = parseServerEnv({
      DATABASE_URL: "postgres://edtech_app:edtech_app@localhost:5432/edtech",
      DATABASE_MIGRATE_URL: "postgres://edtech:edtech@localhost:5432/edtech",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET: "change-me-in-local-env",
    });

    expect(env.DATABASE_MIGRATE_URL).toBe("postgres://edtech:edtech@localhost:5432/edtech");
  });

  it("coerces PORT from string to number", () => {
    const env = parseServerEnv({
      PORT: "4000",
      APP_URL: "http://localhost:5173",
      API_URL: "http://localhost:4000",
      DATABASE_URL: "postgres://edtech:edtech@localhost:5432/edtech",
      REDIS_URL: "redis://localhost:6379",
      AUTH_SECRET: "change-me-in-local-env",
    });

    expect(env.PORT).toBe(4000);
  });

  it("throws a readable error when required values are invalid", () => {
    expect(() => parseServerEnv({ AUTH_SECRET: "short" })).toThrow(
      "Invalid server environment: DATABASE_URL: Invalid input: expected string, received undefined; REDIS_URL: Invalid input: expected string, received undefined; AUTH_SECRET: Too small: expected string to have >=16 characters",
    );
  });
});
