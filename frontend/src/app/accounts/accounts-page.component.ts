import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { AccountsService } from './data/services/accounts.service';
import { Account } from './data/repositories/account.repository';

@Component({
  selector: 'app-accounts-page',
  imports: [RouterLink, HlmButton, HlmCard],
  template: `
    <div class="min-h-screen bg-background p-4">
      <div class="mx-auto flex max-w-4xl flex-col gap-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold">Accounts</h1>
          <a hlmBtn routerLink="/accounts/new">New account</a>
        </div>
        @if (accountsService.listLoading()) {
          <p class="text-sm text-muted-foreground">Loading…</p>
        } @else if (accountsService.listError(); as error) {
          <p class="text-sm text-destructive">{{ error }}</p>
        } @else if (accountsService.accounts().length === 0) {
          <div hlmCard class="p-6 text-sm text-muted-foreground">No accounts yet.</div>
        } @else {
          <div hlmCard class="overflow-x-auto p-0">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="px-4 py-3 font-medium">Name</th>
                  <th class="px-4 py-3 font-medium">Type</th>
                  <th class="px-4 py-3 font-medium">Institution</th>
                  <th class="px-4 py-3 text-right font-medium">Balance</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                @for (account of accountsService.accounts(); track account.domainId) {
                  <tr class="border-b last:border-0">
                    <td class="px-4 py-3">
                      <a [routerLink]="['/accounts', account.domainId, 'edit']" class="text-primary underline">
                        {{ account.name }}
                      </a>
                      @if (account.isArchived) {
                        <span class="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Archived</span>
                      }
                    </td>
                    <td class="px-4 py-3">{{ account.type }}</td>
                    <td class="px-4 py-3">{{ account.institution || '—' }}</td>
                    <td class="px-4 py-3 text-right">{{ account.currentBalance }}</td>
                    <td class="px-4 py-3 text-right">
                      @if (!account.isArchived) {
                        <button hlmBtn variant="outline" size="sm" (click)="archive(account)">Archive</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsPageComponent {
  protected readonly accountsService = inject(AccountsService);

  protected archive(account: Account): void {
    if (confirm(`Archive "${account.name}"?`)) {
      void this.accountsService.archiveAccount(account.domainId);
    }
  }
}
