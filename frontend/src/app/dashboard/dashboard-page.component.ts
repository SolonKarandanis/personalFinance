import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCard } from '@spartan-ng/helm/card';
import { DashboardService } from './data/services/dashboard.service';
import { CategoryBreakdownItem } from './data/repositories/dashboard.repository';
import { Budget } from '@app/budgets/data/repositories/budget.repository';

interface TrendPoint {
  x: number;
  incomeY: number;
  expenseY: number;
  label: string;
  income: string;
  expense: string;
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 220;
const PADDING_X = 28;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, HlmCard],
  template: `
    <div class="viz-root p-4">
      <div class="mx-auto flex max-w-5xl flex-col gap-6">
        <h1 class="text-xl font-semibold">Dashboard</h1>

        @if (dashboardService.loading()) {
          <p class="text-sm text-muted-foreground">Loading…</p>
        } @else if (dashboardService.error(); as error) {
          <p class="text-sm text-destructive">{{ error }}</p>
        } @else {
          <div hlmCard class="p-6">
            <p class="text-sm text-muted-foreground">Net worth</p>
            <p class="mt-1 text-5xl font-semibold">{{ dashboardService.netWorth() }}</p>
            @if (dashboardService.accounts().length > 0) {
              <div class="mt-4 flex flex-col gap-1 text-sm">
                @for (account of dashboardService.accounts(); track account.domainId) {
                  <div class="flex justify-between text-muted-foreground">
                    <span>{{ account.name }}</span>
                    <span class="tabular-nums">{{ account.currentBalance }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <div class="grid gap-6 md:grid-cols-2">
            <div hlmCard class="p-6">
              <h2 class="mb-4 font-medium">Spending by category (this month)</h2>
              @if (topCategories().length === 0) {
                <p class="text-sm text-muted-foreground">No transactions this month.</p>
              } @else {
                <div class="flex flex-col gap-2">
                  @for (item of topCategories(); track item.categoryDomainId ?? item.categoryName) {
                    <div class="flex items-center gap-2">
                      <span
                        class="w-28 shrink-0 truncate text-sm text-[var(--viz-text-secondary)]"
                        [title]="item.categoryName"
                      >
                        {{ item.categoryName }}
                      </span>
                      <div class="h-5 flex-1 rounded bg-[var(--viz-track)]">
                        <div
                          class="h-full rounded-r bg-[var(--viz-series-seq)]"
                          [style.width.%]="categoryPercent(item)"
                        ></div>
                      </div>
                      <span
                        class="w-16 shrink-0 text-right text-sm tabular-nums text-[var(--viz-text-primary)]"
                      >
                        {{ item.total }}
                      </span>
                    </div>
                  }
                </div>
              }
            </div>

            <div hlmCard class="p-6">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="font-medium">Income vs. expense (6 months)</h2>
                <div class="flex gap-3 text-xs text-[var(--viz-text-secondary)]">
                  <span class="flex items-center gap-1">
                    <span class="inline-block h-0.5 w-3 rounded-full bg-[var(--viz-series-income)]"></span>
                    Income
                  </span>
                  <span class="flex items-center gap-1">
                    <span class="inline-block h-0.5 w-3 rounded-full bg-[var(--viz-series-expense)]"></span>
                    Expense
                  </span>
                </div>
              </div>
              <svg [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight" class="w-full">
                @for (line of gridLines(); track line.y) {
                  <line
                    [attr.x1]="paddingX"
                    [attr.x2]="chartWidth - paddingX"
                    [attr.y1]="line.y"
                    [attr.y2]="line.y"
                    stroke="var(--viz-gridline)"
                    stroke-width="1"
                  />
                  <text
                    [attr.x]="0"
                    [attr.y]="line.y - 4"
                    class="fill-[var(--viz-text-muted)]"
                    font-size="10"
                  >
                    {{ formatTick(line.value) }}
                  </text>
                }
                <path
                  [attr.d]="incomeLinePath()"
                  fill="none"
                  stroke="var(--viz-series-income)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  [attr.d]="expenseLinePath()"
                  fill="none"
                  stroke="var(--viz-series-expense)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                @for (point of trendPoints(); track point.label) {
                  <circle
                    [attr.cx]="point.x"
                    [attr.cy]="point.incomeY"
                    r="4"
                    fill="var(--viz-series-income)"
                    stroke="var(--viz-surface)"
                    stroke-width="2"
                  >
                    <title>{{ point.label }} income: {{ point.income }}</title>
                  </circle>
                  <circle
                    [attr.cx]="point.x"
                    [attr.cy]="point.expenseY"
                    r="4"
                    fill="var(--viz-series-expense)"
                    stroke="var(--viz-surface)"
                    stroke-width="2"
                  >
                    <title>{{ point.label }} expense: {{ point.expense }}</title>
                  </circle>
                  <text
                    [attr.x]="point.x"
                    [attr.y]="chartHeight - 8"
                    text-anchor="middle"
                    class="fill-[var(--viz-text-muted)]"
                    font-size="11"
                  >
                    {{ point.label }}
                  </text>
                }
              </svg>
            </div>
          </div>

          <div hlmCard class="p-6">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="font-medium">Budgets vs. actual</h2>
              <a routerLink="/budgets" class="text-sm text-primary underline">Manage budgets</a>
            </div>
            @if (dashboardService.budgets().length === 0) {
              <p class="text-sm text-muted-foreground">No budgets set up yet.</p>
            } @else {
              <div class="flex flex-col gap-3">
                @for (budget of dashboardService.budgets(); track budget.domainId) {
                  <div class="flex flex-col gap-1">
                    <div class="flex justify-between text-xs text-muted-foreground">
                      <span>{{ dashboardService.categoryName(budget.categoryDomainId) }}</span>
                      <span [class.text-destructive]="isOverBudget(budget)">
                        {{ budget.currentPeriodSpent }} / {{ budget.amount }}
                      </span>
                    </div>
                    <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        class="h-full rounded-full"
                        [class]="isOverBudget(budget) ? 'bg-destructive' : 'bg-primary'"
                        [style.width.%]="budgetPercent(budget)"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  // Categorical slots 1 (income) & 2 (expense) and the sequential blue ramp
  // from the dataviz skill's reference palette — validated via
  // scripts/validate_palette.js for both light and dark (all checks pass,
  // worst-case CVD ΔE well above the target). This app's own Spartan theme
  // has no hue (neutral/grayscale primary), so there's no existing brand
  // color to preserve here.
  styles: `
    .viz-root {
      --viz-text-primary: #0b0b0b;
      --viz-text-secondary: #52514e;
      --viz-text-muted: #898781;
      --viz-surface: #fcfcfb;
      --viz-track: #e1e0d9;
      --viz-gridline: #e1e0d9;
      --viz-series-income: #2a78d6;
      --viz-series-expense: #eb6834;
      --viz-series-seq: #2a78d6;
    }
    :host-context(.dark) .viz-root {
      --viz-text-primary: #ffffff;
      --viz-text-secondary: #c3c2b7;
      --viz-text-muted: #898781;
      --viz-surface: #1a1a19;
      --viz-track: #2c2c2a;
      --viz-gridline: #2c2c2a;
      --viz-series-income: #3987e5;
      --viz-series-expense: #d95926;
      --viz-series-seq: #3987e5;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  protected readonly dashboardService = inject(DashboardService);
  protected readonly chartWidth = CHART_WIDTH;
  protected readonly chartHeight = CHART_HEIGHT;
  protected readonly paddingX = PADDING_X;

  // Capped at 8 rows — a dashboard widget, not the full breakdown (all bars
  // share one sequential hue, so this isn't the categorical 8-slot limit,
  // just a readability cap for a compact list).
  protected readonly topCategories = computed(() =>
    [...this.dashboardService.categoryBreakdown()].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 8),
  );

  protected readonly maxCategoryTotal = computed(() =>
    Math.max(1, ...this.topCategories().map((item) => Number(item.total))),
  );

  protected readonly trendMax = computed(() => {
    const values = this.dashboardService.monthlyTrend().flatMap((m) => [Number(m.income), Number(m.expense)]);
    return Math.max(1, ...values) * 1.1;
  });

  protected readonly trendPoints = computed<TrendPoint[]>(() => {
    const months = this.dashboardService.monthlyTrend();
    const max = this.trendMax();
    const innerWidth = CHART_WIDTH - PADDING_X * 2;
    const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const step = months.length > 1 ? innerWidth / (months.length - 1) : 0;
    return months.map((m, i) => ({
      x: PADDING_X + i * step,
      incomeY: PADDING_TOP + innerHeight - (Number(m.income) / max) * innerHeight,
      expenseY: PADDING_TOP + innerHeight - (Number(m.expense) / max) * innerHeight,
      label: formatMonth(m.month),
      income: m.income,
      expense: m.expense,
    }));
  });

  protected readonly incomeLinePath = computed(() => toPath(this.trendPoints(), 'incomeY'));
  protected readonly expenseLinePath = computed(() => toPath(this.trendPoints(), 'expenseY'));

  protected readonly gridLines = computed(() => {
    const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    return [0, 0.5, 1].map((fraction) => ({
      y: PADDING_TOP + innerHeight * (1 - fraction),
      value: this.trendMax() * fraction,
    }));
  });

  protected categoryPercent(item: CategoryBreakdownItem): number {
    return (Number(item.total) / this.maxCategoryTotal()) * 100;
  }

  protected budgetPercent(budget: Budget): number {
    const amount = Number(budget.amount);
    if (amount <= 0) {
      return 0;
    }
    return Math.min(100, (Number(budget.currentPeriodSpent) / amount) * 100);
  }

  protected isOverBudget(budget: Budget): boolean {
    return Number(budget.currentPeriodSpent) > Number(budget.amount);
  }

  protected formatTick(value: number): string {
    return Math.round(value).toString();
  }
}

function toPath(points: TrendPoint[], key: 'incomeY' | 'expenseY'): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point[key]}`).join(' ');
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');
  const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1));
  return date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}
