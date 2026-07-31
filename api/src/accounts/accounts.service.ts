import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { AccountDto } from './dto/account.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  async create(userId: number, dto: CreateAccountDto): Promise<AccountDto> {
    const account = this.accountsRepository.create({
      name: dto.name,
      type: dto.type,
      institution: dto.institution,
      initialBalance: dto.initialBalance?.toString(),
      userId,
    });
    const saved = await this.accountsRepository.save(account);
    return AccountDto.fromEntity(saved);
  }

  async findAll(userId: number): Promise<AccountDto[]> {
    const accounts = await this.accountsRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    return accounts.map((account) => AccountDto.fromEntity(account));
  }

  async findOne(userId: number, domainId: string): Promise<AccountDto> {
    const account = await this.findOwnedOrThrow(userId, domainId);
    return AccountDto.fromEntity(account);
  }

  async update(
    userId: number,
    domainId: string,
    dto: UpdateAccountDto,
  ): Promise<AccountDto> {
    const account = await this.findOwnedOrThrow(userId, domainId);
    const { initialBalance, ...rest } = dto;
    await this.accountsRepository.update(account.id, {
      ...rest,
      ...(initialBalance !== undefined
        ? { initialBalance: initialBalance.toString() }
        : {}),
    });
    return this.findOne(userId, domainId);
  }

  // Accounts are never hard-deleted: onDelete: CASCADE on Transaction.account
  // would silently wipe transaction history along with it. Archiving hides
  // the account from active use while keeping its history intact.
  async archive(userId: number, domainId: string): Promise<AccountDto> {
    const account = await this.findOwnedOrThrow(userId, domainId);
    await this.accountsRepository.update(account.id, { isArchived: true });
    return this.findOne(userId, domainId);
  }

  // Scoping the lookup by userId + domainId together, rather than loading by
  // domainId alone, means a domainId belonging to another user simply
  // doesn't match — 404, not 403, so it never confirms whether another
  // user's account exists.
  private async findOwnedOrThrow(
    userId: number,
    domainId: string,
  ): Promise<Account> {
    const account = await this.accountsRepository.findOneBy({
      domainId,
      userId,
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }
}
