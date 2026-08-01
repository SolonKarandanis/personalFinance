import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';
import {
  Transaction,
  TransactionSource,
  TransactionType,
} from '../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransactionDto } from './dto/transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const TRANSACTION_RELATIONS = {
  account: true,
  category: true,
  transferPair: true,
} as const;

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(
    userId: number,
    dto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    const account = await this.resolveOwnedAccount(
      userId,
      dto.accountDomainId,
    );
    const category = dto.categoryDomainId
      ? await this.resolveVisibleCategory(
          userId,
          dto.categoryDomainId,
          dto.type,
        )
      : undefined;

    const signedAmount =
      dto.type === TransactionType.EXPENSE ? -dto.amount : dto.amount;

    const transaction = this.transactionsRepository.create({
      accountId: account.id,
      categoryId: category?.id,
      amount: signedAmount.toString(),
      date: dto.date,
      description: dto.description,
      notes: dto.notes,
      type: dto.type,
      source: TransactionSource.MANUAL,
    });
    const saved = await this.transactionsRepository.save(transaction);
    return this.findOne(userId, saved.domainId);
  }

  async createTransfer(
    userId: number,
    dto: CreateTransferDto,
  ): Promise<{ from: TransactionDto; to: TransactionDto }> {
    if (dto.fromAccountDomainId === dto.toAccountDomainId) {
      throw new BadRequestException('Cannot transfer to the same account');
    }
    const fromAccount = await this.resolveOwnedAccount(
      userId,
      dto.fromAccountDomainId,
    );
    const toAccount = await this.resolveOwnedAccount(
      userId,
      dto.toAccountDomainId,
    );
    const category = dto.categoryDomainId
      ? await this.resolveVisibleCategory(
          userId,
          dto.categoryDomainId,
          TransactionType.TRANSFER,
        )
      : undefined;

    const [fromDomainId, toDomainId] = await this.dataSource.transaction(
      async (manager) => {
        const repo = manager.getRepository(Transaction);

        const fromLeg = await repo.save(
          repo.create({
            accountId: fromAccount.id,
            categoryId: category?.id,
            amount: (-dto.amount).toString(),
            date: dto.date,
            description: dto.description,
            notes: dto.notes,
            type: TransactionType.TRANSFER,
            source: TransactionSource.MANUAL,
          }),
        );
        const toLeg = await repo.save(
          repo.create({
            accountId: toAccount.id,
            categoryId: category?.id,
            amount: dto.amount.toString(),
            date: dto.date,
            description: dto.description,
            notes: dto.notes,
            type: TransactionType.TRANSFER,
            source: TransactionSource.MANUAL,
            transferPairId: fromLeg.id,
          }),
        );
        await repo.update(fromLeg.id, { transferPairId: toLeg.id });

        return [fromLeg.domainId, toLeg.domainId];
      },
    );

    return {
      from: await this.findOne(userId, fromDomainId),
      to: await this.findOne(userId, toDomainId),
    };
  }

  async findAll(
    userId: number,
    accountDomainId?: string,
  ): Promise<TransactionDto[]> {
    const transactions = await this.transactionsRepository.find({
      where: accountDomainId
        ? { account: { userId, domainId: accountDomainId } }
        : { account: { userId } },
      relations: TRANSACTION_RELATIONS,
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    return transactions.map((transaction) =>
      TransactionDto.fromEntity(transaction),
    );
  }

  async findOne(userId: number, domainId: string): Promise<TransactionDto> {
    const transaction = await this.findOwnedOrThrow(userId, domainId);
    return TransactionDto.fromEntity(transaction);
  }

  async update(
    userId: number,
    domainId: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionDto> {
    const transaction = await this.findOwnedOrThrow(userId, domainId);

    if (dto.amount !== undefined && transaction.type === TransactionType.TRANSFER) {
      throw new BadRequestException(
        'A transfer amount cannot be edited directly — delete and recreate the transfer instead',
      );
    }

    let categoryId: number | undefined;
    if (dto.categoryDomainId !== undefined) {
      const category = await this.resolveVisibleCategory(
        userId,
        dto.categoryDomainId,
        transaction.type,
      );
      categoryId = category.id;
    }

    const amount =
      dto.amount !== undefined
        ? (transaction.type === TransactionType.EXPENSE
            ? -dto.amount
            : dto.amount
          ).toString()
        : undefined;

    await this.transactionsRepository.update(transaction.id, {
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.date !== undefined ? { date: dto.date } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(amount !== undefined ? { amount } : {}),
    });
    return this.findOne(userId, domainId);
  }

  // Deleting either leg of a transfer deletes its pair too, atomically, so a
  // transfer can never end up with only one of its two legs left behind.
  async remove(userId: number, domainId: string): Promise<void> {
    const transaction = await this.findOwnedOrThrow(userId, domainId);

    if (transaction.type === TransactionType.TRANSFER && transaction.transferPairId) {
      const pairId = transaction.transferPairId;
      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(Transaction);
        await repo.delete(transaction.id);
        await repo.delete(pairId);
      });
    } else {
      await this.transactionsRepository.delete(transaction.id);
    }
  }

  private async resolveOwnedAccount(
    userId: number,
    accountDomainId: string,
  ): Promise<Account> {
    const account = await this.accountsRepository.findOneBy({
      domainId: accountDomainId,
      userId,
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  private async resolveVisibleCategory(
    userId: number,
    categoryDomainId: string,
    type: TransactionType,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy([
      { domainId: categoryDomainId, userId },
      { domainId: categoryDomainId, userId: IsNull() },
    ]);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if ((category.type as string) !== (type as string)) {
      throw new BadRequestException(
        'Category type must match transaction type',
      );
    }
    return category;
  }

  // Scopes by the owning account's userId, not a direct column — Transaction
  // has no userId of its own.
  private async findOwnedOrThrow(
    userId: number,
    domainId: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findOne({
      where: { domainId, account: { userId } },
      relations: TRANSACTION_RELATIONS,
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }
}
