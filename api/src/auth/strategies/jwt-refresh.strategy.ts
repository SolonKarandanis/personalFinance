import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { requireEnv } from '../../config/env';
import { JwtPayload } from './jwt.strategy';

export type JwtRefreshPayload = JwtPayload & { refreshToken: string };

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: requireEnv('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtRefreshPayload {
    const refreshToken = (req.body as { refreshToken?: string })
      ?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    return { ...payload, refreshToken };
  }
}
