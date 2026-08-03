import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRepository } from '@core/repositories/base-repository';
import { ApiEndpoints } from '@core/repositories/api-endpoints';

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment';

export interface Account {
  domainId: string;
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance: string;
  currentBalance: string;
  isArchived: boolean;
  createdAt: string;
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: AccountType;
  institution?: string;
  initialBalance?: number;
}

// GET methods use httpResource — authInterceptor attaches the Authorization
// header and withCredentials to every outgoing request, including these, so
// there's no need to set that per call here.
@Injectable({ providedIn: 'root' })
export class AccountRepository extends BaseRepository {
  listAccounts(): HttpResourceRef<Account[] | undefined> {
    return httpResource<Account[]>(() => ({ url: ApiEndpoints.ACCOUNTS }));
  }

  getAccount(domainId: () => string | undefined): HttpResourceRef<Account | undefined> {
    return httpResource<Account>(() => {
      const id = domainId();
      return id ? { url: `${ApiEndpoints.ACCOUNTS}/${id}` } : undefined;
    });
  }

  createAccount(request: CreateAccountRequest): Observable<Account> {
    return this.http.post<Account>(ApiEndpoints.ACCOUNTS, request);
  }

  updateAccount(domainId: string, request: UpdateAccountRequest): Observable<Account> {
    return this.http.patch<Account>(`${ApiEndpoints.ACCOUNTS}/${domainId}`, request);
  }

  archiveAccount(domainId: string): Observable<Account> {
    return this.http.delete<Account>(`${ApiEndpoints.ACCOUNTS}/${domainId}`);
  }
}
