# HRM Authentication and Employee Management Design

## Goal

Implement SRS sections 4.1 and 4.2 in a new NestJS backend, with the plan document as the architectural source of truth.

## Scope

- Public registration at `POST /auth/register`; every self-registered account receives role `USER`.
- Public login at `POST /auth/login` using Passport LocalStrategy, bcrypt verification, a JWT access token, and a random refresh token stored hashed.
- Global JWT authentication with `@Public()` bypass and global role enforcement through `@Roles()`/`RolesGuard`.
- `GET /profile` resolved from the authenticated JWT subject through `@CurrentUser()`.
- Employee management for `HR_MANAGER` and `ADMIN`: create, paginated/searchable list, detail, update, and soft delete to `TERMINATED`.
- DTO validation with `whitelist: true`, `forbidNonWhitelisted: true`, and `UpdateEmployeeDto extends PartialType(CreateEmployeeDto)`.
- Passwords and refresh tokens are never returned; JWT contains only `sub`, `email`, and `role`.

## Architecture

The backend is a modular monolith. `AuthModule` owns registration, LocalStrategy, JWT strategy, refresh-token persistence, and auth controllers. `EmployeesModule` owns the profile route, employee CRUD, DTOs, and entity-to-response mapping. Common decorators, guards, filters, and interceptors are shared through `src/common`.

Prisma maps `employees`, `departments`, `job_titles`, and `refresh_tokens`. Schema changes are migration-managed and PostgreSQL runs locally without Docker. Employee deletion is an update of `status`, preserving relations. Business authorization remains in services in addition to controller role metadata: an HR manager cannot grant `ADMIN`, and a profile always uses the JWT subject rather than a client-supplied employee id.

## Request flow

1. `main.ts` configures Helmet, environment-driven CORS, strict global validation, response wrapping, exception formatting, and Swagger.
2. The global JWT guard permits only routes marked `@Public()` without a bearer token.
3. The global RolesGuard checks route metadata after authentication.
4. Controllers pass validated DTOs and the authenticated subject to services.
5. Services query Prisma Client and return sanitized employee objects.

## Error and security behavior

- Invalid DTO fields return HTTP 400.
- Missing/invalid bearer tokens return HTTP 401.
- Insufficient roles return HTTP 403.
- Duplicate email returns HTTP 409.
- Passwords are bcrypt-hashed with 10 salt rounds.
- Refresh tokens are generated with `crypto.randomBytes`, stored as SHA-256 hashes, checked for expiry/revocation, and revoked on logout.
- Employee `DELETE` never issues a physical database delete.

## Verification

- Unit tests prove bcrypt registration, forced `USER` role, login token response, profile subject scoping, paginated search, update DTO inheritance, and soft delete.
- Security tests prove public/private route behavior, role rejection, forbidden mass-assignment fields, and the absence of passwords in responses.
- `npm test`, `npm run build`, and migration compilation are the release gates for this scope.
