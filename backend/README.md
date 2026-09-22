# HRM Backend — SRS 4.1 và 4.2

Backend NestJS cho Authentication/API Security và Employee/Profile Management.
Persistence dùng Prisma với PostgreSQL cài trực tiếp trên máy local; không dùng Docker.

## Chạy local

Yêu cầu: Node.js 20+, npm và PostgreSQL đang chạy trên `localhost:5432`.

Tạo user/database bằng `psql` hoặc pgAdmin (chạy một lần):

```sql
CREATE USER hrm_user WITH PASSWORD 'hrm_password';
CREATE DATABASE hrm_db OWNER hrm_user;
```

Sau đó chạy backend:

```powershell
Copy-Item .env.example .env
npm install
npm run db:generate
npm run db:deploy
npm run seed
npm run start:dev
```

`DATABASE_URL` mặc định trong `.env.example` là:

```text
postgresql://hrm_user:hrm_password@localhost:5432/hrm_db?schema=public
```

Khi phát triển schema, dùng `npm run db:migrate -- --name <ten-migration>`.
Có thể mở Prisma Studio bằng `npm run db:studio`.

Swagger: `http://localhost:3000/api/docs`

## Tài khoản demo

Mật khẩu của các tài khoản seed: `Password@123`.

| Email | Role |
|---|---|
| `admin@hrm.local` | `ADMIN` |
| `hr@hrm.local` | `HR_MANAGER` |
| `manager@hrm.local` | `MANAGER` |
| `user@hrm.local` | `USER` |

## API chính

- `POST /auth/register` — public, luôn tạo `USER`; không nhận `role` từ client.
- `POST /auth/login` — public, dùng Passport LocalStrategy, trả `access_token` và `refresh_token`.
- `POST /auth/refresh` — public, rotate refresh token đã hash trong database.
- `POST /auth/logout` — yêu cầu JWT, revoke refresh token.
- `GET /profile` — trả profile theo `sub` trong JWT, không nhận employee id từ client.
- `POST /employees` — `HR_MANAGER`, `ADMIN`.
- `GET /employees?page=1&limit=10&search=an&departmentId=1&status=ACTIVE` — `HR_MANAGER`, `ADMIN`.
- `GET /employees/:id`, `PATCH /employees/:id`, `DELETE /employees/:id` — `HR_MANAGER`, `ADMIN`.

`DELETE /employees/:id` chỉ chuyển `status` thành `TERMINATED`, không xóa vật lý.
Global `ValidationPipe` bật `whitelist`, `forbidNonWhitelisted`, `transform`.

## Kiểm tra

```powershell
npm test
npm run test:e2e
npm run build
```

Unit test không cần database. E2E hiện kiểm tra controller, validation, JWT và RBAC bằng module in-memory; migration và seed dùng PostgreSQL local thật.
