import { Account, AccountType } from '../../entities/account.entity';

export class AccountDto {
  domainId: string;
  name: string;
  type: AccountType;
  institution?: string;
  initialBalance: string;
  currentBalance: string;
  isArchived: boolean;
  createdAt: Date;

  static fromEntity(account: Account): AccountDto {
    const dto = new AccountDto();
    dto.domainId = account.domainId;
    dto.name = account.name;
    dto.type = account.type;
    dto.institution = account.institution;
    dto.initialBalance = account.initialBalance;
    dto.currentBalance = account.currentBalance;
    dto.isArchived = account.isArchived;
    dto.createdAt = account.createdAt;
    return dto;
  }
}
