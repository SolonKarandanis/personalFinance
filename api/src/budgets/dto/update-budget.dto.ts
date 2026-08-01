import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { BudgetPeriod } from '../../entities/budget.entity';

// categoryDomainId is deliberately not updatable — to track a different
// category, create a new budget and delete the old one.
export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsEnum(BudgetPeriod)
  period?: BudgetPeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
