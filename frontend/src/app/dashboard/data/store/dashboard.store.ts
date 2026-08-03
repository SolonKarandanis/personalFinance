import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { CategoryBreakdownItem, DashboardRepository, MonthlyTrendItem } from '../repositories/dashboard.repository';
import { resourceCallState } from '@core/store/features/resource-call-state';

// The 5th store category from decisions.md's granularity rules: read-only
// aggregate/dashboard state, no Search/Detail split (nothing here is a
// single edited entity, and there's no dropdown/lookup semantics either).
export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withProps(() => {
    const dashboardRepository = inject(DashboardRepository);
    const summaryResource = dashboardRepository.getSummary();
    return { dashboardRepository, summaryResource };
  }),
  withComputed(({ summaryResource }) => ({
    categoryBreakdown: computed<CategoryBreakdownItem[]>(() => summaryResource.value()?.categoryBreakdown ?? []),
    monthlyTrend: computed<MonthlyTrendItem[]>(() => summaryResource.value()?.monthlyTrend ?? []),
    ...resourceCallState(summaryResource),
  })),
  withMethods(({ summaryResource }) => ({
    reload(): void {
      summaryResource.reload();
    },
  })),
);
