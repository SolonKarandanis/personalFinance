import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AccountType } from '../../entities/account.entity';

export class CreateAccountDto {
  @IsString()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  initialBalance?: number;
}
