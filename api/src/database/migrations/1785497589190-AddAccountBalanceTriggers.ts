import { MigrationInterface, QueryRunner } from 'typeorm';

// Keeps accounts.current_balance in sync at the database layer rather than in
// application code, so it can never drift regardless of what writes a
// transaction row (this service, a future CSV import, Plaid sync, a manual
// fix in psql, ...). See docs/decisions.md for the reasoning.
export class AddAccountBalanceTriggers1785497589190
  implements MigrationInterface
{
  name = 'AddAccountBalanceTriggers1785497589190';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // On INSERT, current_balance always starts equal to initial_balance (no
    // transactions exist yet). On UPDATE, if initial_balance is edited
    // directly (e.g. correcting an account's starting balance), shift
    // current_balance by the same delta so it stays correct without needing
    // to touch any transaction rows.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sync_balance_on_initial_balance_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          NEW.current_balance := NEW.initial_balance;
        ELSIF TG_OP = 'UPDATE' AND NEW.initial_balance IS DISTINCT FROM OLD.initial_balance THEN
          NEW.current_balance := NEW.current_balance + (NEW.initial_balance - OLD.initial_balance);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_accounts_initial_balance_change
      BEFORE INSERT OR UPDATE ON "accounts"
      FOR EACH ROW EXECUTE FUNCTION sync_balance_on_initial_balance_change();
    `);

    // Every transaction insert/update/delete adjusts the owning account's
    // current_balance by the transaction's signed amount. An UPDATE always
    // reverses the OLD row's effect on OLD.account_id and applies the NEW
    // row's effect on NEW.account_id, which is correct whether or not
    // account_id itself changed.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_account_balance_on_transaction_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE "accounts" SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          UPDATE "accounts" SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
          UPDATE "accounts" SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE "accounts" SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_transactions_balance
      AFTER INSERT OR UPDATE OR DELETE ON "transactions"
      FOR EACH ROW EXECUTE FUNCTION update_account_balance_on_transaction_change();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_transactions_balance ON "transactions"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_account_balance_on_transaction_change()`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trg_accounts_initial_balance_change ON "accounts"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS sync_balance_on_initial_balance_change()`,
    );
  }
}
