import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from './user.entity';

export enum BudgetPeriod {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'domain_id',
    type: 'uuid',
    unique: true,
    default: () => 'gen_random_uuid()',
  })
  domainId: string;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.budgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: BudgetPeriod })
  period: BudgetPeriod;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  constructor(partial: Partial<Budget>) {
    Object.assign(this, partial);
  }
}
