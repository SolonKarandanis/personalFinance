import {
  Transaction,
  TransactionSource,
  TransactionType,
} from '../../entities/transaction.entity';

export class TransactionDto {
  domainId: string;
  accountDomainId: string;
  categoryDomainId: string | null;
  amount: string;
  date: string;
  description: string;
  notes: string | null;
  type: TransactionType;
  transferPairDomainId: string | null;
  source: TransactionSource;
  isPending: boolean;
  createdAt: Date;

  static fromEntity(transaction: Transaction): TransactionDto {
    const dto = new TransactionDto();
    dto.domainId = transaction.domainId;
    dto.accountDomainId = transaction.account.domainId;
    dto.categoryDomainId = transaction.category?.domainId ?? null;
    dto.amount = transaction.amount;
    dto.date = transaction.date;
    dto.description = transaction.description;
    dto.notes = transaction.notes ?? null;
    dto.type = transaction.type;
    dto.transferPairDomainId = transaction.transferPair?.domainId ?? null;
    dto.source = transaction.source;
    dto.isPending = transaction.isPending;
    dto.createdAt = transaction.createdAt;
    return dto;
  }
}
