import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard } from '@spartan-ng/helm/card';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmNativeSelect, HlmNativeSelectOption } from '@spartan-ng/helm/native-select';
import { TransactionsService } from './data/services/transactions.service';
import { ImportResult, ImportTransactionRow } from './data/repositories/transaction.repository';
import { ParsedCsvRow, parseTransactionsCsv } from './data/csv-parser';

@Component({
  selector: 'app-transaction-import-page',
  imports: [RouterLink, HlmButton, HlmCard, HlmLabel, HlmNativeSelect, HlmNativeSelectOption],
  template: `
    <div class="p-4">
      <div class="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 class="text-xl font-semibold">Import transactions from CSV</h1>

        <div hlmCard class="flex flex-col gap-4 p-6">
          <p class="text-sm text-muted-foreground">
            Expected columns: <code>date</code> (YYYY-MM-DD), <code>description</code>,
            <code>amount</code>, and optionally <code>category</code>, <code>notes</code>. Column order
            doesn't matter. <strong>Amount is signed</strong> — negative for money out, positive for
            money in, like your bank statement.
          </p>

          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="account">Account</label>
            <hlm-native-select
              [selectId]="'account'"
              [value]="selectedAccountId() ?? ''"
              (valueChange)="onAccountChange($event)"
            >
              <option value="" hlmNativeSelectOption>Select an account</option>
              @for (account of transactionsService.selectableAccounts(); track account.domainId) {
                <option [value]="account.domainId" hlmNativeSelectOption>{{ account.name }}</option>
              }
            </hlm-native-select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="file">CSV file</label>
            <input id="file" type="file" accept=".csv,text/csv" class="text-sm" (change)="onFileSelected($event)" />
            @if (fileName(); as name) {
              <p class="text-xs text-muted-foreground">
                {{ name }} — {{ validRows().length }} valid, {{ invalidRows().length }} invalid
              </p>
            }
          </div>

          @if (invalidRows().length > 0) {
            <div class="flex flex-col gap-1">
              <p class="text-sm font-medium text-destructive">Rows with problems (won't be imported):</p>
              <ul class="flex flex-col gap-0.5 text-xs text-destructive">
                @for (row of invalidRows(); track row.line) {
                  <li>Line {{ row.line }}: {{ row.error }}</li>
                }
              </ul>
            </div>
          }

          @if (validRows().length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b text-left text-muted-foreground">
                    <th class="px-2 py-1 font-medium">Date</th>
                    <th class="px-2 py-1 font-medium">Description</th>
                    <th class="px-2 py-1 text-right font-medium">Amount</th>
                    <th class="px-2 py-1 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of validRows(); track row.line) {
                    <tr class="border-b last:border-0">
                      <td class="px-2 py-1">{{ row.data.date }}</td>
                      <td class="px-2 py-1">{{ row.data.description }}</td>
                      <td class="px-2 py-1 text-right tabular-nums">{{ row.data.amount }}</td>
                      <td class="px-2 py-1">{{ row.data.category || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          @if (submitError(); as error) {
            <p class="text-sm text-destructive">{{ error }}</p>
          }

          <div class="flex gap-2">
            <button hlmBtn [disabled]="!canSubmit() || transactionsService.saving()" (click)="submit()">
              {{ transactionsService.saving() ? 'Importing…' : 'Import' }}
            </button>
            <a hlmBtn variant="outline" routerLink="/transactions">Cancel</a>
          </div>
        </div>

        @if (importResult(); as result) {
          <div hlmCard class="flex flex-col gap-2 p-6">
            <h2 class="font-medium">Import complete</h2>
            <p class="text-sm">
              <span class="text-primary">{{ result.imported }} imported</span>
              · {{ result.duplicates }} duplicate(s) skipped ·
              <span [class.text-destructive]="result.failed.length > 0">
                {{ result.failed.length }} failed
              </span>
            </p>
            @if (result.failed.length > 0) {
              <ul class="flex flex-col gap-0.5 text-xs text-destructive">
                @for (failure of result.failed; track failure.row) {
                  <li>Row {{ failure.row }}: {{ failure.error }}</li>
                }
              </ul>
            }
            <a hlmBtn routerLink="/transactions">Back to transactions</a>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionImportPageComponent {
  protected readonly transactionsService = inject(TransactionsService);

  protected readonly selectedAccountId = signal<string | null>(null);
  protected readonly fileName = signal<string | null>(null);
  protected readonly parsedRows = signal<ParsedCsvRow[]>([]);
  protected readonly importResult = signal<ImportResult | null>(null);
  protected readonly submitError = signal<string | null>(null);

  protected readonly validRows = computed(() =>
    this.parsedRows().filter(
      (row): row is ParsedCsvRow & { data: ImportTransactionRow } => row.data !== undefined,
    ),
  );
  protected readonly invalidRows = computed(() => this.parsedRows().filter((row) => row.error !== undefined));

  protected readonly canSubmit = computed(() => !!this.selectedAccountId() && this.validRows().length > 0);

  protected onAccountChange(value: string | null | undefined): void {
    this.selectedAccountId.set(value || null);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.fileName.set(file.name);
    this.importResult.set(null);
    this.submitError.set(null);
    file.text().then((text) => {
      this.parsedRows.set(parseTransactionsCsv(text));
    });
  }

  protected submit(): void {
    const accountDomainId = this.selectedAccountId();
    if (!accountDomainId || !this.canSubmit()) {
      return;
    }
    this.submitError.set(null);
    const rows = this.validRows().map((row) => row.data);
    this.transactionsService
      .importTransactions(accountDomainId, rows)
      .then((result) => this.importResult.set(result))
      .catch(() => this.submitError.set(this.transactionsService.saveError()));
  }
}
