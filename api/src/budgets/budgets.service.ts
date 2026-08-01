import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { getCurrentPeriodRange } from './budget-period.util';
import { Budget, BudgetPeriod } from '../entities/budget.entity';
import { Category } from '../entities/category.entity';
import { Transaction } from '../entities/transaction.entity';
import { BudgetDto, CurrentPeriodInfo } from './dto/budget.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private readonly budgetsRepository: Repository<Budget>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async create(userId: number, dto: CreateBudgetDto): Promise<BudgetDto> {
    const category = await this.resolveVisibleCategory(
      userId,
      dto.categoryDomainId,
    );

    const existing = await this.budgetsRepository.findOneBy({
      userId,
      categoryId: category.id,
    });
    if (existing) {
      throw new ConflictException(
        'A budget for this category already exists — update it instead of creating a new one',
      );
    }

    const budget = this.budgetsRepository.create({
      userId,
      categoryId: category.id,
      amount: dto.amount.toString(),
      period: dto.period,
      startDate: dto.startDate,
    });
    const saved = await this.budgetsRepository.save(budget);
    return this.findOne(userId, saved.domainId);
  }

  async findAll(userId: number): Promise<BudgetDto[]> {
    const budgets = await this.budgetsRepository.find({
      where: { userId },
      relations: { category: true },
      order: { createdAt: 'ASC' },
    });
    return Promise.all(
      budgets.map(async (budget) => {
        const currentPeriod = await this.computeCurrentPeriod(userId, budget);
        return BudgetDto.create(budget, currentPeriod);
      }),
    );
  }

  async findOne(userId: number, domainId: string): Promise<BudgetDto> {
    const budget = await this.findOwnedOrThrow(userId, domainId);
    const currentPeriod = await this.computeCurrentPeriod(userId, budget);
    return BudgetDto.create(budget, currentPeriod);
  }

  async update(
    userId: number,
    domainId: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetDto> {
    const budget = await this.findOwnedOrThrow(userId, domainId);
    await this.budgetsRepository.update(budget.id, {
      ...(dto.amount !== undefined ? { amount: dto.amount.toString() } : {}),
      ...(dto.period !== undefined ? { period: dto.period } : {}),
      ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
    });
    return this.findOne(userId, domainId);
  }

  async remove(userId: number, domainId: string): Promise<void> {
    const budget = await this.findOwnedOrThrow(userId, domainId);
    await this.budgetsRepository.delete(budget.id);
  }

  private async computeCurrentPeriod(
    userId: number,
    budget: Budget,
  ): Promise<CurrentPeriodInfo> {
    const { start, end } = getCurrentPeriodRange(budget.period as BudgetPeriod);
    // Never count activity before the budget itself became active.
    const effectiveStart = start > budget.startDate ? start : budget.startDate;

    const result = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.categoryId = :categoryId', {
        categoryId: budget.categoryId,
      })
      .andWhere('transaction.date >= :effectiveStart', { effectiveStart })
      .andWhere('transaction.date <= :periodEnd', { periodEnd: end })
      .select('COALESCE(SUM(transaction.amount), 0)', 'total')
      .getRawOne<{ total: string }>();

    const spent = Math.abs(Number(result?.total ?? 0)).toFixed(2);
    return { start, end, spent };
  }

  private async resolveVisibleCategory(
    userId: number,
    categoryDomainId: string,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy([
      { domainId: categoryDomainId, userId },
      { domainId: categoryDomainId, userId: IsNull() },
    ]);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private async findOwnedOrThrow(
    userId: number,
    domainId: string,
  ): Promise<Budget> {
    const budget = await this.budgetsRepository.findOne({
      where: { domainId, userId },
      relations: { category: true },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }
}
