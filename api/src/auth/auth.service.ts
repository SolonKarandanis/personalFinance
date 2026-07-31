import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { requireEnv } from '../config/env';
import { User, UserStatus } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const PASSWORD_SALT_ROUNDS = 10;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

// Refresh tokens are high-entropy random JWTs, not human-chosen passwords, so
// they don't need bcrypt's deliberate slowness (and bcrypt would be actively
// wrong here: it silently truncates input to 72 bytes, and JWTs share an
// identical prefix well past that length, causing false-positive matches). A
// plain SHA-256 digest plus constant-time comparison is the correct tool.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    return this.issueTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return null;
    }
    this.assertActive(user);
    return user;
  }

  login(user: User): Promise<AuthTokens> {
    return this.issueTokens(user);
  }

  async refresh(userId: number, refreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException();
    }
    if (!hashesMatch(hashToken(refreshToken), user.hashedRefreshToken)) {
      throw new UnauthorizedException();
    }
    this.assertActive(user);
    return this.issueTokens(user);
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.setHashedRefreshToken(userId, null);
  }

  private assertActive(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is deactivated');
    }
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    // jti guarantees uniqueness even if two tokens are issued within the same
    // second: JWT signing is deterministic, and iat only has second-level
    // granularity, so without it a same-second reissue produces a byte-identical
    // token (defeating rotation/revocation).
    const payload = {
      sub: user.id,
      email: user.email,
      domainId: user.domainId,
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: requireEnv('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL,
      }),
      this.jwtService.signAsync(payload, {
        secret: requireEnv('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL,
      }),
    ]);

    await this.usersService.setHashedRefreshToken(
      user.id,
      hashToken(refreshToken),
    );

    return { accessToken, refreshToken };
  }
}
