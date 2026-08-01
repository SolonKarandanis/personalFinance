import { MigrationInterface, QueryRunner } from 'typeorm';

// Must be a separate migration from AddTransferCategoryType: Postgres
// forbids using a newly-added enum value in the same transaction that added
// it, and each migration's up() runs in its own transaction.
const DEFAULT_TRANSFER_CATEGORIES = [
  'Savings Transfer',
  'Investment Transfer',
  'Debt Payment',
  'Credit Card Payment',
];

export class SeedTransferDefaultCategories1785567599490
  implements MigrationInterface
{
  name = 'SeedTransferDefaultCategories1785567599490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const name of DEFAULT_TRANSFER_CATEGORIES) {
      await queryRunner.query(
        `INSERT INTO "categories" (name, type) VALUES ($1, 'transfer')`,
        [name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of DEFAULT_TRANSFER_CATEGORIES) {
      await queryRunner.query(
        `DELETE FROM "categories" WHERE name = $1 AND type = 'transfer' AND user_id IS NULL`,
        [name],
      );
    }
  }
}
