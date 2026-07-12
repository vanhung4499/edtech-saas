import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { TokenService } from "./token.service";

// Pure unit test — JwtService needs no DI, just a secret. No infra required.
const SECRET = "test-secret-at-least-16-chars";
const jwt = new JwtService({ secret: SECRET });
const service = new TokenService(jwt);

const identity = { userId: "user-1", tenantId: "tenant-1" };

describe("TokenService", () => {
  it("signs and verifies an access token round-trip", () => {
    const token = service.signAccessToken(identity);
    expect(service.verifyAccessToken(token)).toEqual(identity);
  });

  it("signs and verifies a refresh token round-trip", () => {
    const token = service.signRefreshToken(identity);
    expect(service.verifyRefreshToken(token)).toEqual(identity);
  });

  it("rejects a refresh token presented as an access token", () => {
    const refresh = service.signRefreshToken(identity);
    expect(service.verifyAccessToken(refresh)).toBeNull();
  });

  it("rejects an access token presented as a refresh token", () => {
    const access = service.signAccessToken(identity);
    expect(service.verifyRefreshToken(access)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const foreign = new TokenService(
      new JwtService({ secret: "a-different-secret-16chars" }),
    ).signAccessToken(identity);

    expect(service.verifyAccessToken(foreign)).toBeNull();
  });

  it("rejects a tampered token", () => {
    const token = service.signAccessToken(identity);
    expect(service.verifyAccessToken(`${token}tampered`)).toBeNull();
  });

  it("rejects an expired access token", () => {
    // Sign directly with a past expiry to exercise the TokenExpiredError path.
    const expired = jwt.sign(
      { sub: identity.userId, tid: identity.tenantId },
      { expiresIn: -10 },
    );

    expect(service.verifyAccessToken(expired)).toBeNull();
  });

  it("rejects a garbage string", () => {
    expect(service.verifyAccessToken("not-a-jwt")).toBeNull();
  });
});
