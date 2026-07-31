import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountCurrentBalance1785497564778 implements MigrationInterface {
    name = 'AddAccountCurrentBalance1785497564778'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD "current_balance" numeric(12,2) NOT NULL DEFAULT '0'`);
        // Existing rows have no transactions affecting them yet, so current
        // balance starts equal to whatever initial balance is set.
        await queryRunner.query(`UPDATE "accounts" SET "current_balance" = "initial_balance"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "current_balance"`);
    }

}
