import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

// Identity the token carries — ids only. Roles/permissions/scope are resolved
// from the DB per request (09-auth §4.5), never read off the token.
export interface TokenIdentity {
  userId: string;
  tenantId: string;
}

// Standard `exp`-based expiry (09-auth §3.2). Seconds, not "15m" strings, to
// sidestep @types/jsonwebtoken's template-literal duration typing.
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

// typ claim separates the two token kinds so a refresh token can never be
// presented as a Bearer access token (and vice versa).
const REFRESH_TYP = "refresh";

interface TokenClaims {
  sub?: string;
  tid?: string;
  typ?: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(identity: TokenIdentity): string {
    return this.jwt.sign(
      { sub: identity.userId, tid: identity.tenantId },
      { expiresIn: ACCESS_TTL_SECONDS },
    );
  }

  signRefreshToken(identity: TokenIdentity): string {
    return this.jwt.sign(
      { sub: identity.userId, tid: identity.tenantId, typ: REFRESH_TYP },
      { expiresIn: REFRESH_TTL_SECONDS },
    );
  }

  // Returns identity or null (never throws): the middleware treats null as
  // "unauthenticated" and the guards fail closed. A refresh token is rejected
  // here so it can't be used to authenticate a normal request.
  verifyAccessToken(token: string): TokenIdentity | null {
    const claims = this.safeVerify(token);

    if (!claims || claims.typ === REFRESH_TYP) {
      return null;
    }

    return this.toIdentity(claims);
  }

  verifyRefreshToken(token: string): TokenIdentity | null {
    const claims = this.safeVerify(token);

    if (!claims || claims.typ !== REFRESH_TYP) {
      return null;
    }

    return this.toIdentity(claims);
  }

  private safeVerify(token: string): TokenClaims | null {
    try {
      return this.jwt.verify<TokenClaims>(token);
    } catch {
      // Bad signature, expired, or malformed — all mean "not authenticated".
      return null;
    }
  }

  private toIdentity(claims: TokenClaims): TokenIdentity | null {
    if (!claims.sub || !claims.tid) {
      return null;
    }

    return { userId: claims.sub, tenantId: claims.tid };
  }
}
