# HRM Backend — Dự án cuối khóa

Backend cho hệ thống Human Resource Management (HRM), triển khai phạm vi SRS 4.1 và 4.2:

- Authentication & API Security.
- Employee & Profile Management.

Project dùng NestJS, Prisma và PostgreSQL chạy trực tiếp trên máy local. Docker không cần thiết cho môi trường development.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js 22+, npm |
| Backend | NestJS 11, TypeScript |
| Database | PostgreSQL 15+; đã kiểm tra với PostgreSQL 17 |
| ORM | Prisma 6.19.3 |
| Authentication | Passport Local, Passport JWT, bcrypt |
| Validation | class-validator, class-transformer |
| API docs | Swagger |
| Security | Helmet, CORS |
| Testing | Jest, Supertest |

## Yêu cầu môi trường

- Node.js 20+; khuyến nghị Node.js 22+.
- npm.
- PostgreSQL chạy ở `localhost:5432`.
- Git nếu cần lấy source và xem lịch sử commit.

Kiểm tra nhanh:

```powershell
node --version
npm --version
Test-NetConnection localhost -Port 5432
```

## Cài đặt PostgreSQL local

Không cần Docker. Có thể dùng PostgreSQL installer, pgAdmin hoặc bản portable.

Đăng nhập bằng tài khoản quản trị PostgreSQL và tạo user/database một lần:

```sql
CREATE USER hrm_user WITH PASSWORD 'hrm_password';
CREATE DATABASE hrm_db OWNER hrm_user;
```

Nếu user hoặc database đã tồn tại thì bỏ qua câu lệnh tương ứng.

## Cài đặt và chạy backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run db:generate
npm run db:deploy
npm run seed
npm run start:dev
```

Sau khi chạy:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/api/docs>
- Prisma Studio: chạy `npm run db:studio`.

## Cấu hình môi trường

File mẫu: [`backend/.env.example`](backend/.env.example)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://hrm_user:hrm_password@localhost:5432/hrm_db?schema=public"
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:3001
```

`backend/.env` đã được ignore bởi Git. Khi deploy thật, thay `JWT_ACCESS_SECRET` bằng secret đủ dài và không commit file `.env`.

## Các lệnh npm chính

Chạy trong thư mục `backend`:

```powershell
npm run start:dev       # Development với watch mode
npm run build           # Compile TypeScript
npm run start           # Chạy bản đã build
npm run start:prod      # Chạy dist/main.js
```

### Prisma và database

```powershell
npm run db:format       # Format schema.prisma
npm run db:validate     # Validate schema
npm run db:generate     # Sinh Prisma Client
npm run db:deploy       # Apply migration đã commit
npm run db:migrate -- --name ten_migration
npm run db:studio       # Mở Prisma Studio
npm run seed            # Tạo dữ liệu demo
```

Khi thay đổi `backend/prisma/schema.prisma`, dùng `db:migrate`, commit migration mới và dùng `db:deploy` để apply migration có sẵn.

### Test

```powershell
npm test
npm run test:e2e
npm run test:cov
npm run build
```

Unit test dùng mock Prisma nên không cần database. Seed, migration và smoke test API cần PostgreSQL local.

## Tài khoản demo

Tất cả tài khoản seed có password `Password@123`:

| Email | Role |
|---|---|
| `admin@hrm.local` | `ADMIN` |
| `hr@hrm.local` | `HR_MANAGER` |
| `manager@hrm.local` | `MANAGER` |
| `user@hrm.local` | `USER` |

## API chính

Response thành công được bọc trong object có `success`, `statusCode`, `data` và `timestamp`.

| Method | Endpoint | Quyền |
|---|---|---|
| `POST` | `/auth/register` | Public; luôn tạo role `USER` |
| `POST` | `/auth/login` | Public |
| `POST` | `/auth/refresh` | Public; rotate refresh token |
| `POST` | `/auth/logout` | JWT |
| `GET` | `/profile` | JWT; lấy profile theo `sub` trong JWT |
| `POST` | `/employees` | `HR_MANAGER`, `ADMIN` |
| `GET` | `/employees` | `HR_MANAGER`, `ADMIN` |
| `GET` | `/employees/:id` | `HR_MANAGER`, `ADMIN` |
| `PATCH` | `/employees/:id` | `HR_MANAGER`, `ADMIN` |
| `DELETE` | `/employees/:id` | `HR_MANAGER`, `ADMIN` |

Ví dụ danh sách nhân viên:

```text
GET /employees?page=1&limit=10&search=an&departmentId=1&status=ACTIVE
```

`DELETE /employees/:id` là soft delete: chuyển `status` thành `TERMINATED`, không xóa vật lý.

## Database schema

Schema Prisma: [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)

| Bảng | Mục đích |
|---|---|
| `departments` | Phòng ban |
| `job_titles` | Chức danh và khoảng lương |
| `employees` | Tài khoản, role, hồ sơ, quan hệ quản lý |
| `refresh_tokens` | Refresh token đã hash |
| `_prisma_migrations` | Lịch sử migration |

Migration ban đầu: [`migration.sql`](backend/prisma/migrations/20260923000000_init/migration.sql)

## Cấu trúc source

```text
backend/
├── prisma/                  # Schema và migration
├── src/main.ts              # Bootstrap ứng dụng
├── src/app.module.ts        # Module graph
├── src/common/              # Guard, decorator, filter, interceptor
├── src/database/            # PrismaService, seed, shared types
├── src/modules/auth/        # Register, login, JWT, refresh, RBAC
├── src/modules/employees/   # Profile và employee CRUD
└── test/                    # E2E test
```

Luồng đọc code: `main.ts` → `app.module.ts` → `common/guards` → `modules/auth` hoặc `modules/employees` → `database/prisma.service.ts` → `prisma/schema.prisma`.

Tài liệu đọc hiểu chi tiết: [`docs/HUONG_DAN_DOC_HIEU_BACKEND_HRM.md`](docs/HUONG_DAN_DOC_HIEU_BACKEND_HRM.md)

## Bảo mật và quy ước

- Public register không được tự gán role.
- Password luôn được hash bằng bcrypt.
- Password và refresh token không được trả về API.
- JWT chỉ chứa `sub`, `email`, `role`.
- Route quản trị dùng JWT guard và `@Roles(...)`.
- `HR_MANAGER` không được cấp role `ADMIN`.
- DTO bật `whitelist`, `forbidNonWhitelisted`, `transform`.
- Database thay đổi qua migration, không dùng automatic synchronization.
- Không commit `.env`, password thật hoặc JWT secret thật.

## Kiểm tra Git

```powershell
git status
git log --oneline --decorate --graph --all
git log --date=iso-strict --format="%h | author=%aI | committer=%cI | %s"
```

## Tài liệu tham khảo

- [`PLAN_TRIEN_KHAI_DU_AN_HRM.md`](PLAN_TRIEN_KHAI_DU_AN_HRM.md)
- [`SRS`](TÀI%20LIỆU%20ĐẶC%20TẢ%20YÊU%20CẦU%20PHẦN%20MỀM%20(SRS)%20-%20DỰ%20ÁN%20CUỐI%20KHÓA.txt)
- [`backend/README.md`](backend/README.md)
