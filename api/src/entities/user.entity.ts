import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
} from 'typeorm';
import { Account } from './account.entity';
import { Budget } from './budget.entity';
import { Category } from './category.entity';
import { AbstractEntity } from './abstract.entity';

export enum UserStatus {
  ACTIVE = 'active',
  DEACTIVATED = 'deactivated',
}

@Entity('users')
export class User extends AbstractEntity<User> {

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'hashed_refresh_token', type: 'varchar', nullable: true })
  hashedRefreshToken: string | null;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ default: 'EUR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];

  @OneToMany(() => Budget, (budget) => budget.user)
  budgets: Budget[];

}
