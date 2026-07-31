import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

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
}
