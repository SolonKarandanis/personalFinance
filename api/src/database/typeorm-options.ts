import 'dotenv/config';
import { DataSourceOptions } from 'typeorm';
import { Account } from '../entities/account.entity';
import { Budget } from '../entities/budget.entity';
import { Category } from '../entities/category.entity';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../entities/user.entity';

export const typeOrmOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Account, Category, Transaction, Budget],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
};
