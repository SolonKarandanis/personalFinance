import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDto } from './dto/user.dto';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  create(input: CreateUserInput): Promise<User> {
    const user = this.usersRepository.create(input);
    return this.usersRepository.save(user);
  }

  async setHashedRefreshToken(
    userId: number,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, { hashedRefreshToken });
  }

  async getSafeUser(userId: number): Promise<UserDto> {
    const user = await this.findByIdOrThrow(userId);
    return UserDto.fromEntity(user);
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<UserDto> {
    await this.findByIdOrThrow(userId);
    await this.usersRepository.update(userId, dto);
    return this.getSafeUser(userId);
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findByIdOrThrow(userId);
    const matches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(
      dto.newPassword,
      PASSWORD_SALT_ROUNDS,
    );
    // Changing the password revokes any outstanding refresh token, forcing
    // re-login on other sessions/devices.
    await this.usersRepository.update(userId, {
      passwordHash,
      hashedRefreshToken: null,
    });
  }

  async activate(userId: number): Promise<UserDto> {
    await this.findByIdOrThrow(userId);
    await this.usersRepository.update(userId, {
      status: UserStatus.ACTIVE,
    });
    return this.getSafeUser(userId);
  }

  async deactivate(userId: number): Promise<UserDto> {
    await this.findByIdOrThrow(userId);
    // Revoke the refresh token immediately so a deactivated account can't
    // silently mint new access tokens; the current access token still works
    // until its own ~15min expiry, which is inherent to stateless JWTs.
    await this.usersRepository.update(userId, {
      status: UserStatus.DEACTIVATED,
      hashedRefreshToken: null,
    });
    return this.getSafeUser(userId);
  }

  private async findByIdOrThrow(userId: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
