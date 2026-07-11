import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import { REDIS } from "../redis/redis.provider";

// 09-auth-and-authorization.md §3.2.
export interface SessionData {
  userId: string;
  tenantId: string;
  createdAt: string;
  ip: string;
  userAgent: string;
}

export interface CreateSessionInput {
  userId: string;
  tenantId: string;
  ip: string;
  userAgent: string;
}

const SLIDING_TTL_SECONDS = 12 * 60 * 60;
const ABSOLUTE_TTL_SECONDS = 7 * 24 * 60 * 60;

function sessionKey(id: string): string {
  return `session:${id}`;
}

function userIndexKey(tenantId: string, userId: string): string {
  return `user-sessions:${tenantId}:${userId}`;
}

@Injectable()
export class SessionStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async create(input: CreateSessionInput): Promise<string> {
    const id = randomUUID();
    const data: SessionData = { ...input, createdAt: new Date().toISOString() };

    await this.redis.set(sessionKey(id), JSON.stringify(data), "EX", SLIDING_TTL_SECONDS);
    await this.redis.sadd(userIndexKey(input.tenantId, input.userId), id);

    return id;
  }

  async get(id: string): Promise<SessionData | null> {
    const raw = await this.redis.get(sessionKey(id));
    return raw ? (JSON.parse(raw) as SessionData) : null;
  }

  // Refreshes the sliding window, capped at the absolute lifetime from
  // creation (§3.2: sliding 12h, absolute cap 7d). Redis's own EXPIRE only
  // supports one flat TTL per key, so the absolute cap is enforced here: a
  // session already past it is destroyed instead of refreshed, even if its
  // current Redis TTL hasn't naturally elapsed yet.
  async touch(id: string): Promise<SessionData | null> {
    const data = await this.get(id);

    if (!data) {
      return null;
    }

    const createdAtMs = new Date(data.createdAt).getTime();
    const nowMs = Date.now();
    const absoluteExpiryMs = createdAtMs + ABSOLUTE_TTL_SECONDS * 1000;

    if (nowMs >= absoluteExpiryMs) {
      await this.destroy(id);
      return null;
    }

    const slidingExpiryMs = nowMs + SLIDING_TTL_SECONDS * 1000;
    const effectiveExpiryMs = Math.min(slidingExpiryMs, absoluteExpiryMs);
    const ttlSeconds = Math.max(1, Math.ceil((effectiveExpiryMs - nowMs) / 1000));

    await this.redis.expire(sessionKey(id), ttlSeconds);

    return data;
  }

  async destroy(id: string): Promise<void> {
    const data = await this.get(id);

    await this.redis.del(sessionKey(id));

    // Lazy index cleanup: a session that naturally expired (rather than
    // being explicitly destroyed) already has no data here, so there's
    // nothing to remove from the index — it self-heals the next time this
    // id is looked at, rather than needing a separate sweep job.
    if (data) {
      await this.redis.srem(userIndexKey(data.tenantId, data.userId), id);
    }
  }

  // "Log out everywhere" / disabling a user (§3.2, §3.5).
  async destroyAllForUser(tenantId: string, userId: string): Promise<void> {
    const indexKey = userIndexKey(tenantId, userId);
    const ids = await this.redis.smembers(indexKey);

    if (ids.length > 0) {
      await this.redis.del(...ids.map(sessionKey));
    }

    await this.redis.del(indexKey);
  }
}
