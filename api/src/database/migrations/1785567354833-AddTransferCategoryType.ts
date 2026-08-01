import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTransferCategoryType1785567354833 implements MigrationInterface {
    name = 'AddTransferCategoryType1785567354833'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."categories_type_enum" ADD VALUE 'transfer'`);
    }

    // Postgres has no direct way to remove an enum value: recreate the type
    // without it, repoint the column, drop the old type. This will fail if
    // any row already has type = 'transfer' — expected, since reverting past
    // in-use data needs manual intervention regardless.
    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."categories_type_enum_old" AS ENUM('income', 'expense')`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "type" TYPE "public"."categories_type_enum_old" USING "type"::"text"::"public"."categories_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."categories_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."categories_type_enum_old" RENAME TO "categories_type_enum"`);
    }

}
