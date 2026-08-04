import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';
import {
  Transaction,
  TransactionSource,
  TransactionType,
} from '../entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { ImportResultDto, ImportRowFailureDto } from './dto/import-result.dto';
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

  // Rows are processed independently — one bad row doesn't block the rest
  // of the batch, which is the whole point of a bulk import. See
  // decisions.md for the sign convention (signed amounts, no `type` column)
  // and dedup strategy (content-hashed externalId).
  async importTransactions(
    userId: number,
    accountDomainId: string,
    rows: unknown[],
  ): Promise<ImportResultDto> {
    const account = await this.resolveOwnedAccount(userId, accountDomainId);
    const visibleCategories = await this.categoriesRepository.find({
      where: [{ userId }, { userId: IsNull() }],
    });

    const failed: ImportRowFailureDto[] = [];
    const seenInBatch = new Set<string>();
    const candidates: Array<{
      externalId: string;
      date: string;
      description: string;
      amount: number;
      notes?: string;
      categoryName?: string;
    }> = [];
    let duplicates = 0;

    rows.forEach((raw, index) => {
      const result = parseImportRow(raw);
      if ('error' in result) {
        failed.push({ row: index + 1, error: result.error });
        return;
      }
      const externalId = hashImportRow(
        account.id,
        result.date,
        result.description,
        result.amount,
      );
      if (seenInBatch.has(externalId)) {
        duplicates++;
        return;
      }
      seenInBatch.add(externalId);
      candidates.push({ externalId, ...result });
    });

    const existingIds = candidates.length
      ? new Set(
          (
            await this.transactionsRepository.find({
              where: {
                source: TransactionSource.CSV_IMPORT,
                externalId: In(candidates.map((c) => c.externalId)),
              },
              select: { externalId: true },
            })
          ).map((t) => t.externalId),
        )
      : new Set<string>();

    let imported = 0;
    for (const row of candidates) {
      if (existingIds.has(row.externalId)) {
        duplicates++;
        continue;
      }
      const type =
        row.amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
      const category = row.categoryName
        ? findCategoryByName(visibleCategories, row.categoryName, type)
        : undefined;

      await this.transactionsRepository.save(
        this.transactionsRepository.create({
          accountId: account.id,
          categoryId: category?.id,
          amount: row.amount.toFixed(2),
          date: row.date,
          description: row.description,
          notes: row.notes,
          type,
          source: TransactionSource.CSV_IMPORT,
          externalId: row.externalId,
        }),
      );
      imported++;
    }

    return { imported, duplicates, failed };
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

type ParsedImportRow = {
  date: string;
  description: string;
  amount: number;
  notes?: string;
  categoryName?: string;
};

function parseImportRow(raw: unknown): ParsedImportRow | { error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { error: 'Row is not an object' };
  }
  const { date, description, amount, category, notes } =
    raw as Record<string, unknown>;

  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date))
  ) {
    return { error: 'Invalid or missing date (expected YYYY-MM-DD)' };
  }
  if (typeof description !== 'string' || !description.trim()) {
    return { error: 'Missing description' };
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount === 0) {
    return { error: 'Invalid or missing amount' };
  }

  return {
    date,
    description: description.trim(),
    amount,
    categoryName:
      typeof category === 'string' && category.trim()
        ? category.trim()
        : undefined,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : undefined,
  };
}

// Own-or-system-default categories, matched by name (case-insensitive) and
// the derived transaction type — a miss returns undefined rather than
// throwing, since mis-typed category text shouldn't block otherwise-good
// transaction data from importing.
function findCategoryByName(
  categories: Category[],
  name: string,
  type: TransactionType,
): Category | undefined {
  const normalized = name.trim().toLowerCase();
  return categories.find(
    (category) =>
      category.name.trim().toLowerCase() === normalized &&
      (category.type as string) === (type as string),
  );
}

// accountId is part of the hash specifically so two different users'
// identical-looking transactions never collide — the DB's
// UQ_transaction_source_external_id constraint is global across all users,
// not per-user.
function hashImportRow(
  accountId: number,
  date: string,
  description: string,
  amount: number,
): string {
  return createHash('sha256')
    .update(`${accountId}|${date}|${description}|${amount.toFixed(2)}`)
    .digest('hex');
}
