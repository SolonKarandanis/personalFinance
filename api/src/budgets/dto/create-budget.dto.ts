import { IsDateString, IsEnum, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { BudgetPeriod } from '../../entities/budget.entity';

export class CreateBudgetDto {
  @IsUUID()
  categoryDomainId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsEnum(BudgetPeriod)
  period: BudgetPeriod;

  @IsDateString()
  startDate: string;
}
