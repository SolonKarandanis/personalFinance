import { Budget, BudgetPeriod } from '../../entities/budget.entity';
import { PeriodRange } from '../budget-period.util';

export interface CurrentPeriodInfo extends PeriodRange {
  spent: string;
}

export class BudgetDto {
  domainId: string;
  categoryDomainId: string;
  amount: string;
  period: BudgetPeriod;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  currentPeriodSpent: string;
  createdAt: Date;

  static create(budget: Budget, currentPeriod: CurrentPeriodInfo): BudgetDto {
    const dto = new BudgetDto();
    dto.domainId = budget.domainId;
    dto.categoryDomainId = budget.category.domainId;
    dto.amount = budget.amount;
    dto.period = budget.period;
    dto.startDate = budget.startDate;
    dto.currentPeriodStart = currentPeriod.start;
    dto.currentPeriodEnd = currentPeriod.end;
    dto.currentPeriodSpent = currentPeriod.spent;
    dto.createdAt = budget.createdAt;
    return dto;
  }
}
