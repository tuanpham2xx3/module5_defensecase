# HRM Authentication and Employee Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the NestJS backend needed to satisfy SRS 4.1 Authentication & API Security and 4.2 Employee & Profile Management.

**Architecture:** A modular NestJS monolith with global JWT/RBAC guards, TypeORM repositories, migration-managed PostgreSQL tables, strict DTO validation, and focused auth/employee services. The `/profile` route uses the JWT subject; employee deletion is a transactional status update.

**Tech Stack:** Node.js 22+, TypeScript, NestJS, PostgreSQL, TypeORM, Passport Local/JWT, bcrypt, class-validator, Helmet, Swagger, Jest, Supertest.

**Spec:** `docs/superpowers/specs/2026-09-23-hrm-auth-employee-design.md`

## Global Constraints

- API paths remain exactly `/auth/register`, `/auth/login`, `/profile`, and `/employees` without a global `/api` prefix.
- Registration never accepts a client-controlled role; all public registrations become `USER`.
- Bcrypt registration uses `saltRounds = 10`.
- All non-public routes are protected by a global JWT guard; `@Public()` is the only bypass.
- Role metadata uses `@Roles('ADMIN', 'HR_MANAGER', 'MANAGER')` and is enforced by a global RolesGuard.
- `UpdateEmployeeDto` extends `PartialType(CreateEmployeeDto)`.
- `ValidationPipe` uses `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
- `DELETE /employees/:id` changes status to `TERMINATED` and never physically deletes a row.
- Password, refresh token, and password hash are excluded from API responses.
- TypeORM runs with `synchronize: false`; schema is created by migrations.

## Review Focus

- A registration request containing `role: ADMIN` must be rejected as a non-whitelisted field and cannot elevate the account.
- An HR manager attempting to assign `ADMIN` during employee create/update must receive 403.
- A profile request with another employee id in query/body must still return only the JWT subject's profile.
- An employee list with invalid page/limit values must fail validation rather than produce an unbounded query.
- A soft-deleted employee must remain addressable in relations while no longer appearing as `ACTIVE` by default.

---

### Task 1: Backend foundation and persistence schema

**Files:**
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/tsconfig.build.json`, `backend/nest-cli.json`
- Create: `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/src/database/data-source.ts`
- Create: `backend/src/database/entities/employee.entity.ts`, `department.entity.ts`, `job-title.entity.ts`, `refresh-token.entity.ts`
- Create: `backend/src/database/migrations/1710000000000-InitialHrmSchema.ts`
- Create: `backend/.env.example`, `backend/docker-compose.yml`, `backend/.gitignore`
- Test: `backend/src/common/configuration.spec.ts`

**Interfaces:**
- Produces entities `Employee`, `Department`, `JobTitle`, and `RefreshToken` for Tasks 2–3.
- Produces `AppModule` with TypeORM `synchronize: false` and global HTTP setup consumed by all routes.

- [ ] Write a failing configuration test asserting `ValidationPipe` rejects an unknown property and accepts transformed pagination numbers.
- [ ] Run the focused test and observe failure because the Nest app/configuration does not exist.
- [ ] Add the package/tooling files, entities, migration, module bootstrap, and global setup required by the test and later tasks.
- [ ] Run the focused test and the TypeScript build; both must pass.
- [ ] Commit `feat: scaffold hrm backend foundation`.

### Task 2: Authentication, JWT, refresh token, and RBAC

**Files:**
- Create: `backend/src/common/constants/role.enum.ts`
- Create: `backend/src/common/decorators/public.decorator.ts`, `roles.decorator.ts`, `current-user.decorator.ts`
- Create: `backend/src/common/guards/jwt-auth.guard.ts`, `roles.guard.ts`
- Create: `backend/src/modules/auth/dto/register.dto.ts`, `login.dto.ts`, `refresh.dto.ts`
- Create: `backend/src/modules/auth/interfaces/jwt-payload.interface.ts`
- Create: `backend/src/modules/auth/strategies/local.strategy.ts`, `jwt.strategy.ts`
- Create: `backend/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `auth.module.ts`
- Test: `backend/src/modules/auth/auth.service.spec.ts`, `backend/src/common/guards/roles.guard.spec.ts`

**Interfaces:**
- Consumes entities and `AppModule` from Task 1.
- Produces `AuthService.validateUser`, `AuthService.register`, `AuthService.login`, `@Public()`, `@Roles()`, `@CurrentUser()`, and global JWT/Roles guards for Tasks 3–4.

- [ ] Write failing tests for bcrypt registration with forced `USER`, duplicate email, login token response, and role rejection.
- [ ] Run auth tests and observe missing-module/method failures.
- [ ] Implement DTOs, service, LocalStrategy, JwtStrategy, token hashing/revocation, decorators, guards, and auth routes.
- [ ] Run auth tests and the complete unit suite; all must pass.
- [ ] Commit `feat: implement authentication and rbac`.

### Task 3: Profile and employee management

**Files:**
- Create: `backend/src/modules/employees/dto/create-employee.dto.ts`, `update-employee.dto.ts`, `employee-query.dto.ts`
- Create: `backend/src/modules/employees/employees.service.ts`, `employees.controller.ts`, `profile.controller.ts`, `employees.module.ts`
- Test: `backend/src/modules/employees/employees.service.spec.ts`, `backend/src/modules/employees/dto/update-employee.dto.spec.ts`

**Interfaces:**
- Consumes `Employee` and auth decorators/guards from Tasks 1–2.
- Produces `GET /profile`, `POST /employees`, `GET /employees`, `GET /employees/:id`, `PATCH /employees/:id`, and `DELETE /employees/:id`.

- [ ] Write failing tests for profile subject scoping, sanitized responses, paginated search, HR/ADMIN authorization, forbidden admin escalation, and soft delete.
- [ ] Run employee tests and observe missing service/controller/DTO failures.
- [ ] Implement DTOs, `PartialType` update inheritance, repository queries, response mapping, and soft-delete behavior.
- [ ] Run employee tests and the full unit suite; all must pass.
- [ ] Commit `feat: implement profile and employee management`.

### Task 4: Integration checks, seed/setup documentation, and final verification

**Files:**
- Create: `backend/src/database/seeds/seed.ts`
- Create: `backend/test/auth-employee.e2e-spec.ts`, `backend/test/jest-e2e.json`
- Create: `backend/README.md`
- Modify: `PLAN_TRIEN_KHAI_DU_AN_HRM.md` only if implementation-specific setup differs from the plan

**Interfaces:**
- Consumes all routes and guards from Tasks 1–3.
- Produces reproducible local setup, demo accounts, and e2e security coverage.

- [ ] Write failing e2e tests for public register/login, protected profile, invalid token, role-protected employee route, and forbidden extra fields.
- [ ] Run e2e tests against the configured test database and observe expected pre-implementation failures if the app is not yet wired.
- [ ] Add seed/setup docs and wire the test bootstrap without weakening global validation.
- [ ] Run `npm test`, `npm run build`, and the e2e command; read the complete outputs and fix any failures.
- [ ] Commit `test: verify auth and employee api contract`.
