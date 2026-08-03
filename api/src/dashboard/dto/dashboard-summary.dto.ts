export class CategoryBreakdownItemDto {
  categoryDomainId: string | null;
  categoryName: string;
  type: 'income' | 'expense';
  total: string;
}

export class MonthlyTrendItemDto {
  month: string;
  income: string;
  expense: string;
}

export class DashboardSummaryDto {
  categoryBreakdown: CategoryBreakdownItemDto[];
  monthlyTrend: MonthlyTrendItemDto[];
}
