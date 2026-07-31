import { MigrationInterface, QueryRunner } from 'typeorm';

// System default categories: user_id left NULL, visible to every user but
// editable/deletable by none (enforced in CategoriesService, not the DB).
const DEFAULT_CATEGORIES: Array<{ name: string; type: 'income' | 'expense' }> = [
  { name: 'Salary', type: 'income' },
  { name: 'Freelance & Other Income', type: 'income' },
  { name: 'Investments', type: 'income' },
  { name: 'Refunds', type: 'income' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Rent & Mortgage', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Transportation', type: 'expense' },
  { name: 'Dining Out', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Insurance', type: 'expense' },
  { name: 'Subscriptions', type: 'expense' },
  { name: 'Travel', type: 'expense' },
  { name: 'Education', type: 'expense' },
  { name: 'Other', type: 'expense' },
];

export class SeedDefaultCategories1785505035613
  implements MigrationInterface
{
  name = 'SeedDefaultCategories1785505035613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const category of DEFAULT_CATEGORIES) {
      await queryRunner.query(
        `INSERT INTO "categories" (name, type) VALUES ($1, $2)`,
        [category.name, category.type],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const category of DEFAULT_CATEGORIES) {
      await queryRunner.query(
        `DELETE FROM "categories" WHERE name = $1 AND type = $2 AND user_id IS NULL`,
        [category.name, category.type],
      );
    }
  }
}
