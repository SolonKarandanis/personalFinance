import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

// amount is rejected at the service layer for transfer-type transactions —
// editing one leg's amount alone would desync the pair. Delete and recreate
// the transfer instead.
export class UpdateTransactionDto {
  @IsOptional()
  @IsUUID()
  categoryDomainId?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
