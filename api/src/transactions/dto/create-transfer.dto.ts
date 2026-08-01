import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  fromAccountDomainId: string;

  @IsUUID()
  toAccountDomainId: string;

  // Optional transfer-type category (e.g. "Savings Transfer"), applied to
  // both legs — see CategoryType.TRANSFER.
  @IsOptional()
  @IsUUID()
  categoryDomainId?: string;

  // Positive magnitude; stored as -amount on the source leg, +amount on the
  // destination leg.
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
}
