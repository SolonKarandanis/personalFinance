import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Account } from './account.entity';
import { Category } from './category.entity';
import { AbstractEntity } from './abstract.entity';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum TransactionSource {
  MANUAL = 'manual',
  CSV_IMPORT = 'csv_import',
  PLAID = 'plaid',
}

@Entity('transactions')
@Unique('UQ_transaction_source_external_id', ['source', 'externalId'])
export class Transaction extends AbstractEntity<Transaction> {

  @Column({ name: 'account_id' })
  accountId: number;

  @ManyToOne(() => Account, (account) => account.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'category_id', nullable: true })
  categoryId?: number;

  @ManyToOne(() => Category, (category) => category.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  // Stored as numeric(12,2); the pg driver returns numeric columns as
  // strings to avoid float rounding, so keep this typed as string.
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  description: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ name: 'transfer_pair_id', nullable: true })
  transferPairId?: number;

  @ManyToOne(() => Transaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transfer_pair_id' })
  transferPair?: Transaction;

  @Column({
    type: 'enum',
    enum: TransactionSource,
    default: TransactionSource.MANUAL,
  })
  source: TransactionSource;

  // Only set for csv_import/plaid rows; unique per source to dedupe re-imports/syncs.
  @Column({ name: 'external_id', nullable: true })
  externalId?: string;

  @Column({ name: 'is_pending', default: false })
  isPending: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
