import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { requireEnv } from '../../config/env';
import { JwtPayload } from './jwt.strategy';

export type JwtRefreshPayload = JwtPayload & { refreshToken: string };

function extractFromCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined>;
  return cookies?.refreshToken ?? null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: extractFromCookie,
      ignoreExpiration: false,
      secretOrKey: requireEnv('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    const refreshToken = extractFromCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    return { ...payload, refreshToken };
  }
}
