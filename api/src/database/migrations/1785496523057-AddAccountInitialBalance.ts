import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountInitialBalance1785496523057 implements MigrationInterface {
    name = 'AddAccountInitialBalance1785496523057'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD "initial_balance" numeric(12,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "initial_balance"`);
    }

}
