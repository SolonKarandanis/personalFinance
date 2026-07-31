import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';
import { AbstractEntity } from './abstract.entity';

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
  INVESTMENT = 'investment',
}

@Entity('accounts')
export class Account extends AbstractEntity<Account> {

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AccountType })
  type: AccountType;

  // Balance is otherwise a pure sum of this account's transactions; this
  // covers real-world history that predates when the account was added here.
  @Column({
    name: 'initial_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  initialBalance: string;

  // Kept in sync by DB triggers (see migrations), not application code — see
  // docs/decisions.md for why. Never write to this column directly; it's
  // maintained automatically whenever a transaction or initialBalance changes.
  @Column({
    name: 'current_balance',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  currentBalance: string;

  @Column({ nullable: true })
  institution?: string;

  @Column({ name: 'is_archived', default: false })
  isArchived: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions: Transaction[];

}
