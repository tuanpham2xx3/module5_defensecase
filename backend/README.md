# HRM Backend — SRS 4.1 và 4.2

Backend NestJS cho Authentication/API Security và Employee/Profile Management.

## Chạy local

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
npm run migration:run
npm run seed
npm run start:dev
```

Swagger: `http://localhost:3000/api/docs`

Nếu Docker Desktop chưa chạy, hãy mở Docker Desktop trước `docker compose up -d`. Backend không dùng `synchronize`; schema được tạo bằng migration.

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

`DELETE /employees/:id` chỉ chuyển `status` thành `TERMINATED`, không xóa vật lý. `UpdateEmployeeDto` dùng `PartialType(CreateEmployeeDto)`. Global `ValidationPipe` bật `whitelist`, `forbidNonWhitelisted`, `transform`.

## Kiểm tra

```powershell
npm test
npm run test:e2e
npm run build
```

Unit test không cần database. E2E hiện kiểm tra controller, validation, JWT và RBAC bằng module in-memory; migration và seed dùng PostgreSQL thật khi chạy local.
