# Hướng dẫn đọc hiểu Backend HRM

Tài liệu này giải thích những phần đã được setup cho phạm vi SRS 4.1 và 4.2:

- 4.1 Authentication & API Security.
- 4.2 Employee & Profile Management.

Backend dùng NestJS, Prisma và PostgreSQL chạy local. Prisma thay cho TypeORM theo lựa chọn triển khai hiện tại; PostgreSQL không chạy bằng Docker.

## 1. Chạy project

Thư mục làm việc:

```powershell
cd backend
```

Các bước lần đầu:

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run seed
npm run start:dev
```

Biến môi trường nằm trong `backend/.env`. File mẫu là `backend/.env.example`:

```text
DATABASE_URL="postgresql://hrm_user:hrm_password@localhost:5432/hrm_db?schema=public"
PORT=3000
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Nếu PostgreSQL chưa có database, tạo bằng `psql` hoặc pgAdmin:

```sql
CREATE USER hrm_user WITH PASSWORD 'hrm_password';
CREATE DATABASE hrm_db OWNER hrm_user;
```

Kiểm tra server:

```powershell
Test-NetConnection localhost -Port 5432
```

Ứng dụng:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`

## 2. Cấu trúc thư mục

```text
backend/
├── prisma/
│   ├── schema.prisma              # Mô hình database và quan hệ
│   └── migrations/                # SQL migration do Prisma quản lý
├── src/
│   ├── main.ts                    # Bootstrap NestJS và cấu hình toàn cục
│   ├── app.module.ts              # Module gốc
│   ├── common/                    # Phần dùng chung cho toàn API
│   │   ├── decorators/            # @Public, @Roles, @CurrentUser
│   │   ├── guards/                # JWT guard và RBAC guard
│   │   ├── filters/               # Chuẩn hóa lỗi HTTP
│   │   ├── interceptors/          # Chuẩn hóa response
│   │   └── utils/                 # Ẩn dữ liệu nhạy cảm trước khi trả về
│   ├── database/
│   │   ├── prisma.service.ts      # Kết nối PrismaClient
│   │   ├── prisma.module.ts       # Đăng ký PrismaService toàn app
│   │   ├── types.ts               # Kiểu include dùng chung
│   │   └── seeds/seed.ts           # Dữ liệu demo
│   └── modules/
│       ├── auth/                  # Register, login, refresh, logout
│       └── employees/             # Profile và quản lý nhân viên
├── test/                          # E2E test
├── .env.example
├── package.json
└── README.md
```

## 3. Luồng khởi động ứng dụng

Đọc theo thứ tự sau để hiểu cách app được lắp ghép:

1. `src/main.ts` gọi `NestFactory.create(AppModule)`.
2. `AppModule` nạp `ConfigModule`, `PrismaModule`, `AuthModule` và `EmployeesModule`.
3. `PrismaModule` tạo một `PrismaService` dùng chung cho các service.
4. `configureApp()` bật Helmet, CORS, ValidationPipe, response interceptor, exception filter và Swagger.
5. Nest đăng ký controller của auth, employees và profile.
6. App lắng nghe port từ biến `PORT`, mặc định là `3000`.

### Validation toàn cục

`createGlobalValidationPipe()` bật:

- `whitelist: true`: chỉ giữ field được khai báo trong DTO.
- `forbidNonWhitelisted: true`: field lạ bị trả lỗi 400.
- `transform: true`: chuyển query như `page=1` thành số theo kiểu DTO.

Ví dụ request đăng ký có thêm `role: ADMIN` sẽ bị từ chối vì `RegisterDto` không khai báo field này.

### Chuẩn response và lỗi

Response thành công được bọc theo dạng:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "..."
}
```

Lỗi được xử lý bởi `HttpExceptionFilter`, giúp các API trả cùng một cấu trúc lỗi.

## 4. Database với Prisma

### 4.1 `schema.prisma`

File `backend/prisma/schema.prisma` là nguồn mô tả database của ứng dụng.

Các enum:

- `Role`: `USER`, `MANAGER`, `HR_MANAGER`, `ADMIN`.
- `EmployeeStatus`: `ACTIVE`, `INACTIVE`, `TERMINATED`.

Các model hiện tại:

| Prisma model | PostgreSQL table | Mục đích |
|---|---|---|
| `Department` | `departments` | Phòng ban |
| `JobTitle` | `job_titles` | Chức danh và khoảng lương |
| `Employee` | `employees` | Tài khoản và hồ sơ nhân viên |
| `RefreshToken` | `refresh_tokens` | Refresh token đã hash |

Một số điểm cần chú ý:

- `@map("first_name")` ánh xạ tên field TypeScript sang cột snake_case.
- `@unique` tạo unique constraint, ví dụ email nhân viên.
- `@relation` khai báo khóa ngoại giữa nhân viên, phòng ban, chức danh và quản lý.
- `onDelete: SetNull` giữ nhân viên khi phòng ban/chức danh/quản lý bị xóa.
- `onDelete: Cascade` xóa refresh token khi employee bị xóa vật lý.
- Employee không bị xóa vật lý qua API; API chuyển trạng thái thành `TERMINATED`.

### 4.2 Migration

Migration ban đầu nằm tại:

```text
backend/prisma/migrations/20260923000000_init/migration.sql
```

Các lệnh thường dùng:

```powershell
npm run db:format       # Format schema.prisma
npm run db:validate     # Kiểm tra schema
npm run db:generate     # Sinh Prisma Client
npm run db:deploy       # Apply migration có sẵn
npm run db:migrate -- --name ten_migration
npm run db:studio       # Mở giao diện xem database
```

Quy tắc:

- Dùng `db:migrate` khi phát triển schema ở local.
- Commit cả thư mục `prisma/migrations`.
- Dùng `db:deploy` để apply migration đã commit trên môi trường chạy app.
- Không dùng `synchronize` để Prisma tự ý thay đổi database.

### 4.3 Seed

`src/database/seeds/seed.ts` dùng `upsert`, nên có thể chạy lại mà không tạo bản ghi demo trùng email.

Tài khoản demo:

| Email | Role | Password |
|---|---|---|
| `admin@hrm.local` | `ADMIN` | `Password@123` |
| `hr@hrm.local` | `HR_MANAGER` | `Password@123` |
| `manager@hrm.local` | `MANAGER` | `Password@123` |
| `user@hrm.local` | `USER` | `Password@123` |

Password được hash bằng bcrypt trước khi lưu.

## 5. Authentication và API Security

### 5.1 Register

Endpoint: `POST /auth/register`

Luồng xử lý:

1. `AuthController` nhận `RegisterDto`.
2. `ValidationPipe` kiểm tra body.
3. `AuthService.register()` chuẩn hóa email về lowercase.
4. Kiểm tra email đã tồn tại.
5. Kiểm tra `departmentId`, `jobTitleId`, `managerId` nếu có.
6. Hash password bằng bcrypt với 10 salt rounds.
7. Luôn gán role `USER`; không lấy role từ client.
8. Lưu employee bằng Prisma.
9. `toPublicEmployee()` loại password khỏi response.

### 5.2 Login

Endpoint: `POST /auth/login`

Luồng xử lý:

1. `LocalAuthGuard` kích hoạt Passport LocalStrategy.
2. `LocalStrategy` gọi `AuthService.validateUser(email, password)`.
3. Service tìm employee bằng Prisma và kiểm tra status `ACTIVE`.
4. bcrypt so sánh password gửi lên với password hash.
5. `AuthController.login()` gọi `AuthService.login()`.
6. Access token chứa `sub`, `email`, `role`.
7. Refresh token được sinh ngẫu nhiên bằng `randomBytes`.
8. Chỉ SHA-256 hash của refresh token được lưu trong bảng `refresh_tokens`.

### 5.3 Refresh và logout

`POST /auth/refresh`:

- Hash refresh token client gửi lên.
- Tìm token chưa revoke.
- Kiểm tra thời hạn và employee còn `ACTIVE`.
- Revoke token cũ.
- Sinh access token và refresh token mới.

`POST /auth/logout`:

- Tìm refresh token theo hash.
- Gán `revokedAt` để token không thể dùng lại.

### 5.4 JWT và RBAC

`JwtAuthGuard` được đăng ký global:

- Route bình thường bắt buộc có `Authorization: Bearer <access_token>`.
- Route gắn `@Public()` được bỏ qua JWT guard.

`RolesGuard` đọc metadata từ `@Roles(...)`:

```ts
@Roles(Role.HR_MANAGER, Role.ADMIN)
```

Nếu role trong JWT không nằm trong danh sách cho phép, API trả `403 Forbidden`.

Ngoài guard, `EmployeesService` vẫn kiểm tra quyền nghiệp vụ. Ví dụ `HR_MANAGER` không được cấp role `ADMIN` cho nhân viên khác.

## 6. Employee và Profile

### Profile

Endpoint: `GET /profile`

Profile lấy employee id từ `sub` trong JWT, không lấy id do client truyền vào. Điều này tránh việc user xem profile của người khác bằng cách đổi query hoặc body.

### Employee management

Các endpoint yêu cầu role `HR_MANAGER` hoặc `ADMIN`:

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/employees` | Tạo nhân viên |
| `GET` | `/employees` | Danh sách có phân trang/lọc/tìm kiếm |
| `GET` | `/employees/:id` | Xem chi tiết |
| `PATCH` | `/employees/:id` | Cập nhật |
| `DELETE` | `/employees/:id` | Chuyển sang `TERMINATED` |

Danh sách hỗ trợ:

```text
GET /employees?page=1&limit=10&search=an&departmentId=1&status=ACTIVE
```

Mặc định chỉ lấy employee `ACTIVE`. Kết quả có `items` và `meta` gồm `page`, `limit`, `total`, `totalPages`.

`CreateEmployeeDto` chứa field tạo mới. `UpdateEmployeeDto` dùng `PartialType(CreateEmployeeDto)`, vì vậy các field khi update đều trở thành optional nhưng vẫn giữ validation gốc.

`employee-presenter.ts` là lớp bảo vệ response. Mọi đường trả employee nên đi qua `toPublicEmployee()` để không lộ `password`.

## 7. Cách đọc code theo một request

Ví dụ đọc request `GET /employees`:

1. Mở `employees.controller.ts` để thấy route và decorator role.
2. Kiểm tra global `JwtAuthGuard` và `RolesGuard` trong `app.module.ts`.
3. Kiểm tra `EmployeeQueryDto` để biết query được validate như thế nào.
4. Đi vào `EmployeesService.findAll()` để xem Prisma `where`, `skip`, `take`, `orderBy`.
5. Đối chiếu `employeeInclude` trong `database/types.ts` để biết các relation được load.
6. Kiểm tra `toPublicEmployee()` để biết field nào được trả về.
7. Cuối cùng xem `ResponseInterceptor` để hiểu response bị bọc như thế nào.

Ví dụ đọc request `POST /auth/login`:

```text
AuthController
  -> LocalAuthGuard
  -> LocalStrategy
  -> AuthService.validateUser
  -> bcrypt.compare
  -> AuthService.login
  -> JwtService + Prisma RefreshToken
  -> ResponseInterceptor
```

## 8. Test và kiểm tra chất lượng

```powershell
npm test
npm run test:e2e
npm run build
npm run db:validate
```

Phạm vi test:

- Unit test service auth: register, hash password, login, refresh, logout.
- Unit test employee: phân trang, tìm kiếm, role assignment, soft delete.
- Guard test: public route và role authorization.
- E2E test: validation, JWT, RBAC và route chính.

Unit test dùng mock Prisma nên không cần database. Khi muốn kiểm tra tích hợp thật, cần PostgreSQL chạy và dùng `db:deploy` + `seed` trước.

## 9. Các nguyên tắc cần giữ khi phát triển tiếp

- Không nhận role tùy ý trong public register.
- Không trả password hoặc refresh token hash ra API.
- Không lấy employee id của profile từ client.
- Không dùng `prisma db push` thay cho migration trong code đã commit.
- Khi đổi schema, cập nhật `schema.prisma`, tạo migration và chạy test.
- Khi thêm field response employee, kiểm tra lại `toPublicEmployee()`.
- Khi thêm route quản trị, khai báo cả `@Roles(...)` và kiểm tra nghiệp vụ trong service.
- Tách test database khỏi database development nếu viết E2E chạy trực tiếp trên PostgreSQL.

## 10. Lệnh Git để đọc lịch sử setup

```powershell
git log --oneline --decorate --graph --all
git log --date=iso-strict --format="%h | author=%aI | committer=%cI | %s"
git show --stat <commit>
git status
```

Lịch sử commit được chia theo các phần: tài liệu/nền tảng, auth, employee/profile, test, Prisma migration, PostgreSQL local và README.
