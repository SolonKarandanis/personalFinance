import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRepository } from '@core/repositories/base-repository';
import { ApiEndpoints } from '@core/repositories/api-endpoints';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  domainId: string;
  accountDomainId: string;
  categoryDomainId: string | null;
  amount: string;
  date: string;
  description: string;
  notes: string | null;
  type: TransactionType;
  transferPairDomainId: string | null;
  source: string;
  isPending: boolean;
  createdAt: string;
}

export interface CreateTransactionRequest {
  accountDomainId: string;
  categoryDomainId?: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
  type: 'income' | 'expense';
}

export interface CreateTransferRequest {
  fromAccountDomainId: string;
  toAccountDomainId: string;
  categoryDomainId?: string;
  amount: number;
  date: string;
  description: string;
  notes?: string;
}

export interface UpdateTransactionRequest {
  categoryDomainId?: string;
  amount?: number;
  date?: string;
  description?: string;
  notes?: string;
}

// GET methods use httpResource — authInterceptor attaches the Authorization
// header and withCredentials to every outgoing request, including these.
@Injectable({ providedIn: 'root' })
export class TransactionRepository extends BaseRepository {
  listTransactions(accountDomainId: () => string | undefined): HttpResourceRef<Transaction[] | undefined> {
    return httpResource<Transaction[]>(() => {
      const filter = accountDomainId();
      return {
        url: ApiEndpoints.TRANSACTIONS,
        params: filter ? { accountDomainId: filter } : undefined,
      };
    });
  }

  getTransaction(domainId: () => string | undefined): HttpResourceRef<Transaction | undefined> {
    return httpResource<Transaction>(() => {
      const id = domainId();
      return id ? { url: `${ApiEndpoints.TRANSACTIONS}/${id}` } : undefined;
    });
  }

  createTransaction(request: CreateTransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(ApiEndpoints.TRANSACTIONS, request);
  }

  createTransfer(request: CreateTransferRequest): Observable<{ from: Transaction; to: Transaction }> {
    return this.http.post<{ from: Transaction; to: Transaction }>(
      `${ApiEndpoints.TRANSACTIONS}/transfer`,
      request,
    );
  }

  updateTransaction(domainId: string, request: UpdateTransactionRequest): Observable<Transaction> {
    return this.http.patch<Transaction>(`${ApiEndpoints.TRANSACTIONS}/${domainId}`, request);
  }

  deleteTransaction(domainId: string): Observable<void> {
    return this.http.delete<void>(`${ApiEndpoints.TRANSACTIONS}/${domainId}`);
  }
}
