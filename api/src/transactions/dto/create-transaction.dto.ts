import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { TransactionType } from '../../entities/transaction.entity';

// transfer is deliberately excluded — a lone transfer row with no pair would
// be a broken half-state. See POST /transactions/transfer instead.
const NON_TRANSFER_TYPES = {
  INCOME: TransactionType.INCOME,
  EXPENSE: TransactionType.EXPENSE,
};

export class CreateTransactionDto {
  @IsUUID()
  accountDomainId: string;

  @IsOptional()
  @IsUUID()
  categoryDomainId?: string;

  // Always a positive magnitude — the server applies the sign based on
  // `type` (see TransactionsService), so clients never have to remember to
  // negate expenses themselves.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsDateString()
  date: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEnum(NON_TRANSFER_TYPES)
  type: TransactionType.INCOME | TransactionType.EXPENSE;
}
