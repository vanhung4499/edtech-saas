import { describe, expect, it } from "vitest";
import { KNOWN_MODULES, PERMISSIONS } from "./permissions";

describe("permission registry", () => {
  it("every key matches module:resource:action with a known module prefix", () => {
    const shapePattern = /^[a-z][a-z-]*:[a-z][a-z-]*:[a-z][a-z-]*$/;

    for (const { key } of PERMISSIONS) {
      expect(key).toMatch(shapePattern);

      const [moduleSegment] = key.split(":");
      expect(KNOWN_MODULES).toContain(moduleSegment);
    }
  });

  it("has no duplicate keys", () => {
    const keys = PERMISSIONS.map((permission) => permission.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every key has a non-empty description", () => {
    for (const { description } of PERMISSIONS) {
      expect(description.length).toBeGreaterThan(0);
    }
  });
});
