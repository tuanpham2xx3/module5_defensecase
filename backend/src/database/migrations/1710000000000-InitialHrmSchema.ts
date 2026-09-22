import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialHrmSchema1710000000000 implements MigrationInterface {
  name = 'InitialHrmSchema1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "employee_role_enum" AS ENUM ('USER', 'MANAGER', 'HR_MANAGER', 'ADMIN')`);
    await queryRunner.query(`CREATE TYPE "employee_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED')`);
    await queryRunner.query(`CREATE TABLE "departments" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "budget" numeric(12,2) NOT NULL DEFAULT '0', "location" character varying(150) NOT NULL, CONSTRAINT "UQ_departments_name" UNIQUE ("name"), CONSTRAINT "PK_departments_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "job_titles" ("id" SERIAL NOT NULL, "title" character varying(100) NOT NULL, "salary_range_min" numeric(10,2) NOT NULL, "salary_range_max" numeric(10,2) NOT NULL, CONSTRAINT "UQ_job_titles_title" UNIQUE ("title"), CONSTRAINT "CHK_job_titles_salary_range" CHECK ("salary_range_max" >= "salary_range_min"), CONSTRAINT "PK_job_titles_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "employees" ("id" SERIAL NOT NULL, "first_name" character varying(50) NOT NULL, "last_name" character varying(50) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying(255) NOT NULL, "role" "employee_role_enum" NOT NULL DEFAULT 'USER', "department_id" integer, "job_title_id" integer, "manager_id" integer, "status" "employee_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_employees_email" UNIQUE ("email"), CONSTRAINT "PK_employees_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "employee_id" integer NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_employees_department_id" ON "employees" ("department_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_employees_manager_id" ON "employees" ("manager_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_employees_status" ON "employees" ("status")`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_department" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_job_title" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_employees_manager" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_employee" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_employee"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_manager"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_job_title"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_department"`);
    await queryRunner.query(`DROP INDEX "IDX_employees_status"`);
    await queryRunner.query(`DROP INDEX "IDX_employees_manager_id"`);
    await queryRunner.query(`DROP INDEX "IDX_employees_department_id"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TABLE "job_titles"`);
    await queryRunner.query(`DROP TABLE "departments"`);
    await queryRunner.query(`DROP TYPE "employee_status_enum"`);
    await queryRunner.query(`DROP TYPE "employee_role_enum"`);
  }
}
