import { computed, inject, Injectable } from '@angular/core';
import { TransactionSearchStore } from '../store/transaction-search.store';
import { TransactionDetailStore } from '../store/transaction-detail.store';
import { AccountLookupStore } from '@app/accounts/data/store/account-lookup.store';
import { CategoryLookupStore } from '@app/categories/data/store/category-lookup.store';
import {
  CreateTransactionRequest,
  CreateTransferRequest,
  Transaction,
  UpdateTransactionRequest,
} from '../repositories/transaction.repository';

// Combines four stores — neither store may depend on another, so both the
// "mutate, then refresh the list" sequencing and the cross-domain dropdown
// data (accounts/categories, from their respective Lookup stores) live here.
@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly searchStore = inject(TransactionSearchStore);
  private readonly detailStore = inject(TransactionDetailStore);
  private readonly accountLookupStore = inject(AccountLookupStore);
  private readonly categoryLookupStore = inject(CategoryLookupStore);

  readonly transactions = this.searchStore.transactions;
  readonly listLoading = this.searchStore.loading;
  readonly listError = this.searchStore.error;
  readonly accountFilter = this.searchStore.accountDomainIdFilter;

  readonly transaction = this.detailStore.transaction;
  readonly detailLoading = this.detailStore.detailLoading;
  readonly saving = this.detailStore.loading;
  readonly saveError = this.detailStore.error;

  // Full list — used for the list filter dropdown and for resolving an
  // account's display name, where an archived account's history should
  // still show correctly.
  readonly accounts = this.accountLookupStore.accounts;
  // No legitimate reason to create a new transaction against an archived
  // account, even though the backend itself doesn't block it — used by the
  // create/edit/transfer forms' account pickers specifically.
  readonly selectableAccounts = computed(() => this.accountLookupStore.accounts().filter((a) => !a.isArchived));
  readonly categories = this.categoryLookupStore.categories;

  setAccountFilter(accountDomainId: string | null): void {
    this.searchStore.setAccountFilter(accountDomainId);
  }

  selectTransaction(domainId: string | null): void {
    this.detailStore.setSelectedDomainId(domainId);
  }

  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    const transaction = await this.detailStore.create(request);
    this.searchStore.reload();
    return transaction;
  }

  async createTransfer(request: CreateTransferRequest): Promise<{ from: Transaction; to: Transaction }> {
    const result = await this.detailStore.createTransfer(request);
    this.searchStore.reload();
    return result;
  }

  async updateTransaction(domainId: string, request: UpdateTransactionRequest): Promise<Transaction> {
    const transaction = await this.detailStore.update(domainId, request);
    this.searchStore.reload();
    return transaction;
  }

  async deleteTransaction(domainId: string): Promise<void> {
    await this.detailStore.remove(domainId);
    this.searchStore.reload();
  }
}
