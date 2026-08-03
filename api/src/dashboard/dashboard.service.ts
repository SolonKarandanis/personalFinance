import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getCurrentPeriodRange } from '../budgets/budget-period.util';
import { BudgetPeriod } from '../entities/budget.entity';
import { Transaction, TransactionType } from '../entities/transaction.entity';
import {
  CategoryBreakdownItemDto,
  DashboardSummaryDto,
  MonthlyTrendItemDto,
} from './dto/dashboard-summary.dto';

const TREND_MONTHS = 6;

interface CategoryBreakdownRow {
  categoryDomainId: string | null;
  categoryName: string | null;
  type: TransactionType;
  total: string;
}

interface MonthlyTrendRow {
  month: string;
  income: string;
  expense: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  async getSummary(userId: number): Promise<DashboardSummaryDto> {
    const [categoryBreakdown, monthlyTrend] = await Promise.all([
      this.getCategoryBreakdown(userId),
      this.getMonthlyTrend(userId),
    ]);
    return { categoryBreakdown, monthlyTrend };
  }

  // Current calendar month, income/expense only — transfer-type transactions
  // are excluded from expense/income totals in every aggregation in this
  // app (see decisions.md), same rule Budgets already follows.
  private async getCategoryBreakdown(
    userId: number,
  ): Promise<CategoryBreakdownItemDto[]> {
    const { start, end } = getCurrentPeriodRange(BudgetPeriod.MONTHLY);

    const rows = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .leftJoin('transaction.category', 'category')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.type IN (:...types)', {
        types: [TransactionType.INCOME, TransactionType.EXPENSE],
      })
      .andWhere('transaction.date >= :start', { start })
      .andWhere('transaction.date <= :end', { end })
      .select('category.domainId', 'categoryDomainId')
      .addSelect('category.name', 'categoryName')
      .addSelect('transaction.type', 'type')
      .addSelect('SUM(ABS(transaction.amount))', 'total')
      .groupBy('category.domainId')
      .addGroupBy('category.name')
      .addGroupBy('transaction.type')
      .getRawMany<CategoryBreakdownRow>();

    return rows.map((row) => ({
      categoryDomainId: row.categoryDomainId,
      categoryName: row.categoryName ?? 'Uncategorized',
      type: row.type as 'income' | 'expense',
      total: Number(row.total).toFixed(2),
    }));
  }

  // Last 6 calendar months, always returned in full even for months with no
  // activity — a trend chart with gapped months is worse than one showing
  // zeros.
  private async getMonthlyTrend(userId: number): Promise<MonthlyTrendItemDto[]> {
    const now = new Date();
    const rangeStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (TREND_MONTHS - 1), 1),
    );
    const startDate = rangeStart.toISOString().slice(0, 10);

    const rows = await this.transactionsRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.account', 'account')
      .where('account.userId = :userId', { userId })
      .andWhere('transaction.type IN (:...types)', {
        types: [TransactionType.INCOME, TransactionType.EXPENSE],
      })
      .andWhere('transaction.date >= :startDate', { startDate })
      .select("to_char(transaction.date, 'YYYY-MM')", 'month')
      .addSelect(
        'SUM(CASE WHEN transaction.type = :incomeType THEN transaction.amount ELSE 0 END)',
        'income',
      )
      .addSelect(
        'SUM(CASE WHEN transaction.type = :expenseType THEN ABS(transaction.amount) ELSE 0 END)',
        'expense',
      )
      .setParameters({
        incomeType: TransactionType.INCOME,
        expenseType: TransactionType.EXPENSE,
      })
      .groupBy("to_char(transaction.date, 'YYYY-MM')")
      .getRawMany<MonthlyTrendRow>();

    const byMonth = new Map(rows.map((row) => [row.month, row]));
    return lastNMonthKeys(TREND_MONTHS, now).map((month) => {
      const row = byMonth.get(month);
      return {
        month,
        income: Number(row?.income ?? 0).toFixed(2),
        expense: Number(row?.expense ?? 0).toFixed(2),
      };
    });
  }
}

function lastNMonthKeys(count: number, now: Date): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}
