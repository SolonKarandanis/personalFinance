import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BaseRepository } from '@core/repositories/base-repository';
import { ApiEndpoints } from '@core/repositories/api-endpoints';

export interface CategoryBreakdownItem {
  categoryDomainId: string | null;
  categoryName: string;
  type: 'income' | 'expense';
  total: string;
}

export interface MonthlyTrendItem {
  month: string;
  income: string;
  expense: string;
}

export interface DashboardSummary {
  categoryBreakdown: CategoryBreakdownItem[];
  monthlyTrend: MonthlyTrendItem[];
}

// GET-only — authInterceptor attaches the Authorization header and
// withCredentials to every outgoing request, including this one.
@Injectable({ providedIn: 'root' })
export class DashboardRepository extends BaseRepository {
  getSummary(): HttpResourceRef<DashboardSummary | undefined> {
    return httpResource<DashboardSummary>(() => ({ url: `${ApiEndpoints.DASHBOARD}/summary` }));
  }
}
