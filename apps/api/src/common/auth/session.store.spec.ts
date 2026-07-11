import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { afterAll, describe, expect, it } from "vitest";
import { type SessionData, SessionStore } from "./session.store";

// Integration suite — needs Redis from `docker compose up -d`.
const redis = new Redis(process.env.REDIS_URL);
const store = new SessionStore(redis);

function fixture(overrides: Partial<Parameters<typeof store.create>[0]> = {}) {
  return {
    userId: randomUUID(),
    tenantId: randomUUID(),
    ip: "127.0.0.1",
    userAgent: "vitest",
    ...overrides,
  };
}

afterAll(async () => {
  redis.disconnect();
});

describe("SessionStore", () => {
  it("create() stores the session with a ~12h sliding TTL and indexes it by user", async () => {
    const input = fixture();
    const id = await store.create(input);

    const data = await store.get(id);
    expect(data).toMatchObject({
      userId: input.userId,
      tenantId: input.tenantId,
      ip: input.ip,
      userAgent: input.userAgent,
    });

    const ttl = await redis.ttl(`session:${id}`);
    expect(ttl).toBeGreaterThan(12 * 60 * 60 - 10);
    expect(ttl).toBeLessThanOrEqual(12 * 60 * 60);

    const indexed = await redis.smembers(`user-sessions:${input.tenantId}:${input.userId}`);
    expect(indexed).toEqual([id]);
  });

  it("get() returns null for an unknown session id", async () => {
    expect(await store.get(randomUUID())).toBeNull();
  });

  it("touch() refreshes the sliding TTL and returns the session data", async () => {
    const id = await store.create(fixture());
    await redis.expire(`session:${id}`, 60); // simulate time passing: TTL wound down

    const data = await store.touch(id);
    expect(data).not.toBeNull();

    const ttl = await redis.ttl(`session:${id}`);
    expect(ttl).toBeGreaterThan(60);
  });

  it("touch() caps the sliding refresh at the 7-day absolute lifetime", async () => {
    const input = fixture();
    const id = await store.create(input);

    // Simulate a session created 6d23h ago: ~1h left before the absolute cap.
    const createdAt = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000));
    const data: SessionData = { ...input, createdAt: createdAt.toISOString() };
    await redis.set(`session:${id}`, JSON.stringify(data), "KEEPTTL");

    const touched = await store.touch(id);
    expect(touched).not.toBeNull();

    const ttl = await redis.ttl(`session:${id}`);
    // Capped near the remaining 1h, not refreshed to the full 12h sliding window.
    expect(ttl).toBeLessThan(2 * 60 * 60);
  });

  it("touch() destroys a session already past its absolute lifetime", async () => {
    const input = fixture();
    const id = await store.create(input);

    const createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const data: SessionData = { ...input, createdAt: createdAt.toISOString() };
    await redis.set(`session:${id}`, JSON.stringify(data), "KEEPTTL");

    const touched = await store.touch(id);
    expect(touched).toBeNull();
    expect(await store.get(id)).toBeNull();
    expect(await redis.smembers(`user-sessions:${input.tenantId}:${input.userId}`)).toEqual([]);
  });

  it("destroy() removes the session and its index entry", async () => {
    const input = fixture();
    const id = await store.create(input);

    await store.destroy(id);

    expect(await store.get(id)).toBeNull();
    expect(await redis.smembers(`user-sessions:${input.tenantId}:${input.userId}`)).toEqual([]);
  });

  it("destroyAllForUser() removes every session for that user and clears the index", async () => {
    const tenantId = randomUUID();
    const userId = randomUUID();

    const idA = await store.create(fixture({ tenantId, userId }));
    const idB = await store.create(fixture({ tenantId, userId }));
    const otherUserSession = await store.create(fixture());

    await store.destroyAllForUser(tenantId, userId);

    expect(await store.get(idA)).toBeNull();
    expect(await store.get(idB)).toBeNull();
    expect(await redis.smembers(`user-sessions:${tenantId}:${userId}`)).toEqual([]);

    // Unrelated user/session untouched.
    expect(await store.get(otherUserSession)).not.toBeNull();
  });
});
