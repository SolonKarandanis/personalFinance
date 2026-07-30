import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785430655365 implements MigrationInterface {
    name = 'InitialSchema1785430655365'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."budgets_period_enum" AS ENUM('weekly', 'monthly', 'yearly')`);
        await queryRunner.query(`CREATE TABLE "budgets" ("id" SERIAL NOT NULL, "domain_id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" integer NOT NULL, "category_id" integer NOT NULL, "amount" numeric(12,2) NOT NULL, "period" "public"."budgets_period_enum" NOT NULL, "start_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2db3baccb9ff2d7c058c22981ba" UNIQUE ("domain_id"), CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "domain_id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "currency" character varying NOT NULL DEFAULT 'EUR', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b07612fc9ab8c40bf34f0dcfe65" UNIQUE ("domain_id"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."categories_type_enum" AS ENUM('income', 'expense')`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "domain_id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" integer, "name" character varying NOT NULL, "type" "public"."categories_type_enum" NOT NULL, "parent_id" integer, "icon" character varying, "color" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_6abc4417add7dd8212931e76377" UNIQUE ("domain_id"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('income', 'expense', 'transfer')`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_source_enum" AS ENUM('manual', 'csv_import', 'plaid')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" SERIAL NOT NULL, "domain_id" uuid NOT NULL DEFAULT gen_random_uuid(), "account_id" integer NOT NULL, "category_id" integer, "amount" numeric(12,2) NOT NULL, "date" date NOT NULL, "description" character varying NOT NULL, "notes" text, "type" "public"."transactions_type_enum" NOT NULL, "transfer_pair_id" integer, "source" "public"."transactions_source_enum" NOT NULL DEFAULT 'manual', "external_id" character varying, "is_pending" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d52e1cd7f65358b0850829014ba" UNIQUE ("domain_id"), CONSTRAINT "UQ_transaction_source_external_id" UNIQUE ("source", "external_id"), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."accounts_type_enum" AS ENUM('checking', 'savings', 'credit_card', 'cash', 'investment')`);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" SERIAL NOT NULL, "domain_id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" integer NOT NULL, "name" character varying NOT NULL, "type" "public"."accounts_type_enum" NOT NULL, "institution" character varying, "is_archived" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d6a2394e23921f58e07b172ad9c" UNIQUE ("domain_id"), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_5d25d8bbd6c209261dfe04558f1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_4bb589bf6db49e8c1fd6af05f49" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_2296b7fe012d95646fa41921c8b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_49c0d6e8ba4bfb5582000d851f0" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_c9e41213ca42d50132ed7ab2b0f" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_078864075c269a7d682557e32c0" FOREIGN KEY ("transfer_pair_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "FK_3000dad1da61b29953f07476324" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_3000dad1da61b29953f07476324"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_078864075c269a7d682557e32c0"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_c9e41213ca42d50132ed7ab2b0f"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_49c0d6e8ba4bfb5582000d851f0"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_88cea2dc9c31951d06437879b40"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_2296b7fe012d95646fa41921c8b"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_4bb589bf6db49e8c1fd6af05f49"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_5d25d8bbd6c209261dfe04558f1"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP TYPE "public"."accounts_type_enum"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TYPE "public"."categories_type_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP TYPE "public"."budgets_period_enum"`);
    }

}
