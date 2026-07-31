import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRefreshToken1785476877297 implements MigrationInterface {
    name = 'AddUserRefreshToken1785476877297'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "hashed_refresh_token" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "hashed_refresh_token"`);
    }

}
