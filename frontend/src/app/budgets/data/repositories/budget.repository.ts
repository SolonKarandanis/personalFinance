import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRepository } from '@core/repositories/base-repository';
import { ApiEndpoints } from '@core/repositories/api-endpoints';

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  domainId: string;
  categoryDomainId: string;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  currentPeriodSpent: string;
  createdAt: string;
}

export interface CreateBudgetRequest {
  categoryDomainId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
}

export interface UpdateBudgetRequest {
  amount?: number;
  period?: BudgetPeriod;
  startDate?: string;
}

// GET methods use httpResource — authInterceptor attaches the Authorization
// header and withCredentials to every outgoing request, including these.
@Injectable({ providedIn: 'root' })
export class BudgetRepository extends BaseRepository {
  listBudgets(): HttpResourceRef<Budget[] | undefined> {
    return httpResource<Budget[]>(() => ({ url: ApiEndpoints.BUDGETS }));
  }

  getBudget(domainId: () => string | undefined): HttpResourceRef<Budget | undefined> {
    return httpResource<Budget>(() => {
      const id = domainId();
      return id ? { url: `${ApiEndpoints.BUDGETS}/${id}` } : undefined;
    });
  }

  createBudget(request: CreateBudgetRequest): Observable<Budget> {
    return this.http.post<Budget>(ApiEndpoints.BUDGETS, request);
  }

  updateBudget(domainId: string, request: UpdateBudgetRequest): Observable<Budget> {
    return this.http.patch<Budget>(`${ApiEndpoints.BUDGETS}/${domainId}`, request);
  }

  deleteBudget(domainId: string): Observable<void> {
    return this.http.delete<void>(`${ApiEndpoints.BUDGETS}/${domainId}`);
  }
}
