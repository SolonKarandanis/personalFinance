import { inject, Injectable } from '@angular/core';
import { AccountSearchStore } from '../store/account-search.store';
import { AccountDetailStore } from '../store/account-detail.store';
import { Account, CreateAccountRequest, UpdateAccountRequest } from '../repositories/account.repository';

// Combines the search and detail stores — neither store may depend on the
// other directly, so the "mutate, then refresh the list" sequencing lives
// here.
@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly searchStore = inject(AccountSearchStore);
  private readonly detailStore = inject(AccountDetailStore);

  readonly accounts = this.searchStore.accounts;
  readonly listLoading = this.searchStore.loading;
  readonly listError = this.searchStore.error;

  readonly account = this.detailStore.account;
  readonly detailLoading = this.detailStore.detailLoading;
  readonly saving = this.detailStore.loading;
  readonly saveError = this.detailStore.error;

  selectAccount(domainId: string | null): void {
    this.detailStore.setSelectedDomainId(domainId);
  }

  async createAccount(request: CreateAccountRequest): Promise<Account> {
    const account = await this.detailStore.create(request);
    this.searchStore.reload();
    return account;
  }

  async updateAccount(domainId: string, request: UpdateAccountRequest): Promise<Account> {
    const account = await this.detailStore.update(domainId, request);
    this.searchStore.reload();
    return account;
  }

  async archiveAccount(domainId: string): Promise<void> {
    await this.detailStore.archive(domainId);
    this.searchStore.reload();
  }
}
