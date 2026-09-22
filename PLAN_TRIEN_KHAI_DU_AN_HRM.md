# KẾ HOẠCH TRIỂN KHAI CHI TIẾT

## Dự án cuối khóa: Human Resource Management Web Application

**Công nghệ:** NestJS, TypeScript, PostgreSQL, TypeORM, Docker, Jest, Supertest  
**Tài liệu tham chiếu:** TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS) - DỰ ÁN CUỐI KHÓA.txt  
**Phiên bản:** 1.0  
**Trạng thái hiện tại:** Thư mục dự án mới chỉ có tài liệu SRS, chưa có mã nguồn.

---

## 1. Mục tiêu dự án

Hệ thống cần mô phỏng một hệ thống quản lý nhân sự doanh nghiệp, bao gồm:

- Đăng ký, đăng nhập và gia hạn phiên đăng nhập.
- Xác thực bằng JWT.
- Phân quyền USER, MANAGER, HR_MANAGER và ADMIN.
- Quản lý phòng ban, chức danh và nhân viên.
- Xem profile cá nhân.
- Quy trình nghỉ phép hai cấp.
- Tự động xử lý bảng lương.
- PostgreSQL Trigger ghi audit log.
- Swagger/OpenAPI.
- Unit Test và E2E Test.
- Docker Compose để chạy hệ thống.

Mục tiêu không chỉ là API chạy được mà còn phải chứng minh:

- Database có ràng buộc chặt chẽ.
- Business logic nằm trong service.
- Controller mỏng.
- Dữ liệu đầu vào được validate.
- API được bảo vệ nhiều lớp.
- Dữ liệu nhạy cảm được audit.
- Các nghiệp vụ quan trọng có test.

---

## 2. Các quyết định thiết kế cần chốt trước khi code

SRS có một số điểm chưa mô tả đầy đủ. Kế hoạch này sử dụng các quyết định sau.

### 2.1. API prefix

Giữ đúng endpoint trong SRS:

~~~text
POST /auth/register
POST /auth/login
GET  /profile
GET  /employees
~~~

Không đặt global prefix là /api. Chỉ dùng /api/docs cho Swagger.

### 2.2. Role khi đăng ký

Register là API public nên không nhận role từ client.

Role mặc định luôn là:

~~~text
USER
~~~

Tài khoản ADMIN, HR_MANAGER và MANAGER được tạo bằng seed hoặc bằng API quản trị đã bảo vệ.

Request có role ADMIN phải bị từ chối hoặc bỏ qua:

~~~json
{
  "email": "attacker@example.com",
  "password": "Password@123",
  "role": "ADMIN"
}
~~~

### 2.3. Refresh token

SRS yêu cầu login trả refresh token nhưng chưa mô tả bảng lưu trữ. Nên bổ sung bảng refresh_tokens để:

- Lưu token đã hash.
- Thu hồi token khi logout.
- Hỗ trợ nhiều thiết bị.
- Kiểm tra token hết hạn.
- Có thể rotate token.

Không lưu refresh token nguyên bản trong database.

### 2.4. Từ chối đơn nghỉ phép

Database có status REJECTED nên nên bổ sung:

~~~text
PATCH /leave-requests/:id/reject-manager
PATCH /leave-requests/:id/reject-hr
~~~

### 2.5. Công thức deductions

SRS chưa quy định công thức cụ thể. Đề xuất dùng công thức dễ giải thích và dễ kiểm thử:

~~~text
daily_salary = base_salary / số ngày lịch trong kỳ lương
deductions = daily_salary * số ngày nghỉ không hợp lệ
total_salary = base_salary + bonuses - deductions
~~~

Quy tắc leave:

- APPROVED_BY_HR: hợp lệ, không trừ.
- PENDING: chưa được duyệt cuối, tính là không hợp lệ.
- APPROVED_BY_MANAGER: chưa được duyệt cuối, tính là không hợp lệ.
- REJECTED: không hợp lệ.

Nếu muốn tính theo ngày làm việc thì phải ghi rõ trong README và viết test riêng cho ngày cuối tuần.

### 2.6. Soft delete employee

DELETE /employees/:id không xóa vật lý. Chỉ cập nhật:

~~~text
status = TERMINATED
~~~

Mục đích là giữ quan hệ với payroll, leave request và audit log.

---

## 3. Kiến trúc tổng thể

### 3.1. Mô hình

Sử dụng modular monolith theo feature:

~~~text
Client
  |
  v
Helmet / CORS / Logger
  |
  v
Global JwtAuthGuard
  |
  v
Global RolesGuard
  |
  v
Interceptor
  |
  v
ValidationPipe
  |
  v
Controller
  |
  v
Service
  |
  v
Repository / EntityManager
  |
  v
PostgreSQL
~~~

Nếu có exception:

~~~text
Exception -> HttpExceptionFilter -> JSON error response
~~~

### 3.2. Nguyên tắc phân lớp

#### Controller

Chỉ nhận request, validate DTO, gọi service và trả response. Không đặt business logic phức tạp trong controller.

#### Service

Chứa business rule, kiểm tra quyền nghiệp vụ, transaction, query và mapping response.

#### Repository hoặc EntityManager

Chứa truy vấn database, QueryBuilder, transaction query và locking nếu cần.

#### DTO

Chứa validation và Swagger metadata. DTO không được chứa logic thao tác database.

#### Entity

Chứa mapping giữa class TypeScript và bảng PostgreSQL.

### 3.3. Transaction bắt buộc

Dùng transaction cho:

- Duyệt đơn nghỉ phép.
- Tạo payroll hàng loạt.
- Cập nhật employee có audit.
- Cập nhật payroll có audit.
- Refresh token rotation.

---

## 4. Lộ trình theo phase

| Phase | Nội dung | Kết quả cần đạt |
|---|---|---|
| 0 | Chuẩn bị | Node, Docker, Git, project |
| 1 | Foundation | NestJS, env, database connection |
| 2 | Database | Entity, migration, constraints, seed |
| 3 | Common | Guard, pipe, interceptor, filter |
| 4 | Authentication | Register, login, JWT, refresh |
| 5 | Employee | Profile, CRUD, pagination, soft delete |
| 6 | Leave | Tạo đơn, manager approve, HR approve |
| 7 | Payroll | Process payroll, deductions, generated total |
| 8 | Audit | PostgreSQL trigger, actor context |
| 9 | Testing | Unit, E2E, coverage >= 70% |
| 10 | Hoàn thiện | Swagger, Docker, README, demo |

Không nên triển khai payroll trước khi authentication, employee và leave request đã ổn định.

---

## 5. Khởi tạo project

Thực hiện từ thư mục chứa file SRS:

~~~powershell
cd C:\PROJECT\rikkeilearning\fjs_be_module2\Cuoi_Khoa
npm install -g @nestjs/cli
nest new backend --strict
cd backend
~~~

Cài package:

~~~powershell
npm install @nestjs/config
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install bcrypt helmet class-validator class-transformer
npm install @nestjs/swagger
npm install @nestjs/mapped-types
npm install -D @types/bcrypt @types/passport-jwt @types/passport-local @types/supertest
~~~

Chạy thử:

~~~powershell
npm run start:dev
~~~

Kiểm tra:

~~~text
http://localhost:3000
~~~

Tạo module:

~~~powershell
nest g module modules/auth
nest g controller modules/auth
nest g service modules/auth

nest g module modules/employees
nest g controller modules/employees
nest g service modules/employees

nest g module modules/departments
nest g controller modules/departments
nest g service modules/departments

nest g module modules/job-titles
nest g controller modules/job-titles
nest g service modules/job-titles

nest g module modules/leave-requests
nest g controller modules/leave-requests
nest g service modules/leave-requests

nest g module modules/payrolls
nest g controller modules/payrolls
nest g service modules/payrolls

nest g module modules/audit-logs
nest g controller modules/audit-logs
nest g service modules/audit-logs
~~~

---

## 6. Cấu trúc thư mục đề xuất

~~~text
backend/
├── src/
│   ├── common/
│   │   ├── constants/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── interfaces/
│   ├── config/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   ├── data-source.ts
│   │   └── database.module.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   ├── strategies/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.module.ts
│   │   ├── employees/
│   │   ├── departments/
│   │   ├── job-titles/
│   │   ├── leave-requests/
│   │   ├── payrolls/
│   │   └── audit-logs/
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── auth.e2e-spec.ts
│   ├── leave.e2e-spec.ts
│   └── jest-e2e.json
├── .env
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── README.md
~~~

---

## 7. Cấu hình môi trường và Docker

### 7.1. File .env.example

~~~env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hrm_db
DB_USERNAME=hrm_user
DB_PASSWORD=hrm_password

JWT_ACCESS_SECRET=replace-with-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGINS=http://localhost:3001
~~~

Tạo file local:

~~~powershell
Copy-Item .env.example .env
~~~

Không commit .env.

### 7.2. Docker Compose PostgreSQL

~~~yaml
services:
  postgres:
    image: postgres:15
    container_name: hrm-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: hrm_db
      POSTGRES_USER: hrm_user
      POSTGRES_PASSWORD: hrm_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hrm_user -d hrm_db"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
~~~

Chạy:

~~~powershell
docker compose up -d
docker compose ps
~~~

### 7.3. Cấu hình TypeORM

Không dùng synchronize:

~~~typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: configService.getOrThrow<string>('DB_HOST'),
  port: configService.getOrThrow<number>('DB_PORT'),
  username: configService.getOrThrow<string>('DB_USERNAME'),
  password: configService.getOrThrow<string>('DB_PASSWORD'),
  database: configService.getOrThrow<string>('DB_NAME'),
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: false,
});
~~~

Database schema phải được quản lý bằng migration.

---

## 8. Thiết kế database

### 8.1. Quan hệ

~~~text
departments 1 -------- N employees
job_titles  1 -------- N employees
employees   1 -------- N leave_requests
employees   1 -------- N payrolls
employees   1 -------- N employees
employees   1 -------- N refresh_tokens
~~~

Quan hệ quản lý trực tiếp:

~~~text
employees.manager_id -> employees.id
~~~

### 8.2. departments

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | SERIAL | Primary key |
| name | VARCHAR(100) | Unique, not null |
| budget | NUMERIC(12,2) | budget >= 0 |
| location | VARCHAR(150) | Not null |
| created_at | TIMESTAMP | Default NOW() |

### 8.3. job_titles

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | SERIAL | Primary key |
| title | VARCHAR(100) | Unique, not null |
| salary_range_min | NUMERIC(10,2) | > 0 |
| salary_range_max | NUMERIC(10,2) | >= salary_range_min |

### 8.4. employees

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | SERIAL | Primary key |
| first_name | VARCHAR(50) | Not null |
| last_name | VARCHAR(50) | Not null |
| email | VARCHAR(150) | Unique, not null |
| password | VARCHAR(255) | Bcrypt hash |
| role | VARCHAR(20) | USER/MANAGER/HR_MANAGER/ADMIN |
| department_id | INT | FK departments |
| job_title_id | INT | FK job_titles |
| manager_id | INT | Self FK, ON DELETE SET NULL |
| status | VARCHAR(20) | ACTIVE/INACTIVE/TERMINATED |
| created_at | TIMESTAMP | Default NOW() |

Nên chuẩn hóa email trước khi lưu bằng trim và lowercase.

### 8.5. leave_requests

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | SERIAL | Primary key |
| employee_id | INT | FK employees |
| start_date | DATE | Not null |
| end_date | DATE | end_date >= start_date |
| type | VARCHAR(20) | SICK/CASUAL/VACATION |
| status | VARCHAR(30) | PENDING/APPROVED_BY_MANAGER/APPROVED_BY_HR/REJECTED |
| reason | TEXT | Nullable |
| approved_by_manager_id | INT | FK employees |
| approved_by_hr_id | INT | FK employees |

### 8.6. payrolls

| Cột | Kiểu | Ràng buộc |
|---|---|---|
| id | SERIAL | Primary key |
| employee_id | INT | FK employees |
| base_salary | NUMERIC(10,2) | > 0 |
| bonuses | NUMERIC(10,2) | Default 0, >= 0 |
| deductions | NUMERIC(10,2) | Default 0, >= 0 |
| total_salary | NUMERIC(10,2) | Generated column |
| pay_period_start | DATE | Not null |
| pay_period_end | DATE | Not null |
| status | VARCHAR(20) | PENDING/PAID |
| created_at | TIMESTAMP | Default NOW() |

Ràng buộc đề xuất:

~~~sql
CHECK (pay_period_end >= pay_period_start)
UNIQUE (employee_id, pay_period_start, pay_period_end)
~~~

### 8.7. audit_logs

| Cột | Kiểu | Mô tả |
|---|---|---|
| id | BIGSERIAL | Primary key |
| actor_id | INT | Người thực hiện, nullable |
| action | VARCHAR(20) | INSERT/UPDATE/DELETE |
| table_name | VARCHAR(50) | Tên bảng |
| record_id | INT | ID bản ghi |
| old_value | JSONB | Dữ liệu cũ |
| new_value | JSONB | Dữ liệu mới |
| ip_address | VARCHAR(45) | IPv4 hoặc IPv6 |
| timestamp | TIMESTAMP | Default NOW() |

### 8.8. refresh_tokens

| Cột | Kiểu | Mô tả |
|---|---|---|
| id | SERIAL | Primary key |
| employee_id | INT | FK employees |
| token_hash | VARCHAR(255) | Hash token |
| expires_at | TIMESTAMP | Thời điểm hết hạn |
| revoked_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | Default NOW() |

### 8.9. Index

~~~sql
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_job_title_id ON employees(job_title_id);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
~~~

---

## 9. Migration và seed

### 9.1. Thứ tự migration

~~~text
001_create_departments
002_create_job_titles
003_create_employees
004_create_leave_requests
005_create_payrolls
006_create_audit_logs
007_create_refresh_tokens
008_create_audit_triggers
009_seed_data
~~~

### 9.2. Scripts đề xuất

~~~json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "start:prod": "node dist/main",
    "migration:run": "typeorm-ts-node-commonjs migration:run",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert",
    "seed": "tsx src/database/seeds/seed.ts",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:cov": "jest --coverage"
  }
}
~~~

Tên script có thể thay đổi tùy cấu hình TypeORM CLI.

### 9.3. Seed tối thiểu

| Email | Role | Mục đích |
|---|---|---|
| admin@hrm.local | ADMIN | Quản trị hệ thống |
| hr@hrm.local | HR_MANAGER | Quản lý nhân sự |
| manager@hrm.local | MANAGER | Duyệt cấp 1 |
| user@hrm.local | USER | Nhân viên |

Mật khẩu seed phải được hash bằng bcrypt. Seed nên tạo department, job title, manager và user có manager_id trỏ về manager.

---

## 10. Cấu hình NestJS dùng chung

### 10.1. main.ts

~~~typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HRM API')
    .setDescription('Human Resource Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
~~~

### 10.2. ValidationPipe

Bắt buộc:

~~~typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
~~~

Ý nghĩa:

- whitelist: chỉ giữ property được khai báo trong DTO.
- forbidNonWhitelisted: từ chối field lạ.
- transform: tự chuyển kiểu dữ liệu theo DTO.

### 10.3. Response Interceptor

Response thành công:

~~~json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "2026-09-17T10:00:00.000Z"
}
~~~

### 10.4. Exception Filter

Response lỗi:

~~~json
{
  "success": false,
  "statusCode": 404,
  "message": "Không tìm thấy nhân viên",
  "error": "Not Found",
  "timestamp": "2026-09-17T10:00:00.000Z"
}
~~~

Mapping:

| Trường hợp | HTTP |
|---|---:|
| Validation sai | 400 |
| Chưa đăng nhập | 401 |
| Không đủ quyền | 403 |
| Không tìm thấy | 404 |
| Duplicate | 409 |
| Lỗi hệ thống | 500 |

### 10.5. Decorators

Ba decorator cần có:

~~~text
@Public()
@Roles('ADMIN', 'HR_MANAGER')
@CurrentUser()
~~~

Route public:

~~~typescript
@Public()
@Post('login')
login() {}
~~~

Route có role:

~~~typescript
@Roles('ADMIN', 'HR_MANAGER')
@Get('employees')
findAll() {}
~~~

---

## 11. Authentication và Authorization

### 11.1. API

| Method | Endpoint | Quyền |
|---|---|---|
| POST | /auth/register | Public |
| POST | /auth/login | Public |
| POST | /auth/refresh | Public |
| POST | /auth/logout | User đăng nhập |

### 11.2. Register flow

1. Validate DTO.
2. Trim và lowercase email.
3. Kiểm tra email trùng.
4. Kiểm tra department và job title.
5. Kiểm tra manager nếu có.
6. Hash password bằng bcrypt với salt rounds 10.
7. Gán role USER.
8. Gán status ACTIVE.
9. Lưu employee.
10. Không trả password.

### 11.3. Login flow

1. Tìm employee theo email.
2. Kiểm tra employee tồn tại.
3. Kiểm tra status ACTIVE.
4. So sánh password bằng bcrypt.compare.
5. Tạo access token.
6. Tạo refresh token bằng crypto.randomBytes.
7. Hash và lưu refresh token.
8. Trả token.

JWT payload chỉ nên có:

~~~typescript
{
  sub: employee.id,
  email: employee.email,
  role: employee.role
}
~~~

Không đưa password, salary hoặc refresh token vào JWT.

### 11.4. Refresh

1. Nhận refresh token.
2. Hash token.
3. Tìm token chưa revoke.
4. Kiểm tra expires_at.
5. Tạo access token mới.
6. Có thể rotate token.

### 11.5. Logout

Đánh dấu:

~~~text
revoked_at = NOW()
~~~

Không cần xóa vật lý refresh token.

### 11.6. Global JWT Guard

Guard phải:

1. Kiểm tra metadata @Public.
2. Nếu public thì cho qua.
3. Đọc Bearer token.
4. Verify JWT.
5. Gắn user vào request.
6. Token thiếu hoặc sai thì trả 401.

### 11.7. Roles Guard

Guard phải:

1. Đọc metadata @Roles.
2. Route không khai báo role thì cho qua.
3. So sánh request.user.role.
4. Sai role thì trả 403.

RBAC không thay thế business authorization. Ví dụ MANAGER vẫn phải là manager trực tiếp của employee mới được duyệt leave.

---

## 12. Employee và master data

### 12.1. Employee API

| Method | Endpoint | Role |
|---|---|---|
| GET | /profile | Tất cả |
| POST | /employees | HR_MANAGER, ADMIN |
| GET | /employees | HR_MANAGER, ADMIN |
| GET | /employees/:id | HR_MANAGER, ADMIN |
| PATCH | /employees/:id | HR_MANAGER, ADMIN |
| DELETE | /employees/:id | HR_MANAGER, ADMIN |

### 12.2. Profile

GET /profile lấy employee ID từ JWT, không nhận employee ID từ body hoặc query.

Không trả password hoặc refresh token.

### 12.3. Danh sách employee

Ví dụ:

~~~text
GET /employees?page=1&limit=10&search=an&departmentId=1&status=ACTIVE
~~~

Giới hạn:

~~~text
page >= 1
1 <= limit <= 100
~~~

Search trên first_name, last_name, email và department name.

Response:

~~~json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
~~~

### 12.4. Update DTO

Có thể dùng PartialType:

~~~typescript
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
~~~

Nên tách riêng:

~~~text
UpdateEmployeeDto
UpdateEmployeeRoleDto
UpdateEmployeeStatusDto
~~~

Không cho HR_MANAGER tùy ý nâng role thành ADMIN nếu SRS không cho phép.

### 12.5. Department API

~~~text
POST   /departments       ADMIN
GET    /departments       HR_MANAGER, ADMIN
GET    /departments/:id   HR_MANAGER, ADMIN
PATCH  /departments/:id   ADMIN
DELETE /departments/:id   ADMIN
~~~

Không xóa department đang được sử dụng.

### 12.6. Job title API

~~~text
POST   /job-titles       HR_MANAGER, ADMIN
GET    /job-titles       HR_MANAGER, ADMIN
GET    /job-titles/:id   HR_MANAGER, ADMIN
PATCH  /job-titles/:id   HR_MANAGER, ADMIN
DELETE /job-titles/:id   HR_MANAGER, ADMIN
~~~

Không xóa job title đang được sử dụng.

---

## 13. Leave Request

### 13.1. API

| Method | Endpoint | Role |
|---|---|---|
| POST | /leave-requests | User đăng nhập |
| GET | /leave-requests | Theo phạm vi quyền |
| GET | /leave-requests/:id | Theo phạm vi quyền |
| PATCH | /leave-requests/:id/approve-manager | MANAGER |
| PATCH | /leave-requests/:id/approve-hr | HR_MANAGER |
| PATCH | /leave-requests/:id/reject-manager | MANAGER |
| PATCH | /leave-requests/:id/reject-hr | HR_MANAGER |

### 13.2. Tạo đơn

Request:

~~~json
{
  "startDate": "2026-10-01",
  "endDate": "2026-10-03",
  "type": "VACATION",
  "reason": "Nghỉ phép cá nhân"
}
~~~

Employee ID lấy từ JWT.

Kiểm tra:

- Ngày đúng định dạng.
- endDate không nhỏ hơn startDate.
- Employee đang ACTIVE.
- Type hợp lệ.
- Không bị trùng request đang xử lý.

Status ban đầu:

~~~text
PENDING
~~~

### 13.3. Scope dữ liệu

| Role | Được xem |
|---|---|
| USER | Đơn của bản thân |
| MANAGER | Đơn của nhân viên trực tiếp |
| HR_MANAGER | Tất cả |
| ADMIN | Tất cả |

### 13.4. Manager approve

Chỉ cho phép nếu:

~~~text
currentUser.role = MANAGER
leave.status = PENDING
leave.employee.manager_id = currentUser.id
~~~

Sau đó:

~~~text
status = APPROVED_BY_MANAGER
approved_by_manager_id = currentUser.id
~~~

### 13.5. HR approve

Chỉ cho phép nếu:

~~~text
currentUser.role = HR_MANAGER
leave.status = APPROVED_BY_MANAGER
~~~

Sau đó:

~~~text
status = APPROVED_BY_HR
approved_by_hr_id = currentUser.id
~~~

### 13.6. State transition

Được phép:

~~~text
PENDING -> APPROVED_BY_MANAGER
PENDING -> REJECTED
APPROVED_BY_MANAGER -> APPROVED_BY_HR
APPROVED_BY_MANAGER -> REJECTED
~~~

Không được phép:

~~~text
APPROVED_BY_HR -> PENDING
REJECTED -> APPROVED_BY_HR
APPROVED_BY_HR -> REJECTED
~~~

Mỗi approval phải chạy transaction và kiểm tra lại status.

---

## 14. Payroll

### 14.1. API

| Method | Endpoint | Role |
|---|---|---|
| POST | /payrolls/process | HR_MANAGER |
| GET | /payrolls/my | USER |
| GET | /payrolls | HR_MANAGER, ADMIN |
| GET | /payrolls/:id | Theo phạm vi quyền |

### 14.2. Process request

~~~json
{
  "payPeriodStart": "2026-09-01",
  "payPeriodEnd": "2026-09-30"
}
~~~

Kiểm tra:

- Ngày hợp lệ.
- payPeriodEnd >= payPeriodStart.
- Không tạo payroll trùng employee và kỳ.
- Không insert total_salary từ service.

### 14.3. Thuật toán

~~~text
BEGIN TRANSACTION

Lấy employee có status = ACTIVE

FOR EACH employee:
    Lấy base_salary
    Lấy leave request giao với kỳ lương
    Đếm ngày nghỉ không có status APPROVED_BY_HR
    Tính daily_salary
    Tính deductions
    INSERT payroll

COMMIT
~~~

### 14.4. Overlap ngày

Leave giao với kỳ lương khi:

~~~sql
leave.start_date <= pay_period_end
AND leave.end_date >= pay_period_start
~~~

Ngày giao nhau:

~~~text
overlap_start = MAX(leave.start_date, pay_period_start)
overlap_end = MIN(leave.end_date, pay_period_end)
overlap_days = overlap_end - overlap_start + 1
~~~

### 14.5. Generated total

Service chỉ insert:

~~~text
base_salary
bonuses
deductions
pay_period_start
pay_period_end
status
~~~

PostgreSQL tự tính:

~~~text
total_salary = base_salary + bonuses - deductions
~~~

### 14.6. Quyền xem payroll

USER chỉ được:

~~~text
WHERE payroll.employee_id = currentUser.id
~~~

HR_MANAGER và ADMIN được xem toàn bộ.

---

## 15. Audit Log bằng PostgreSQL Trigger

### 15.1. Phạm vi

Tạo trigger cho:

- employees: INSERT, UPDATE, DELETE.
- payrolls: INSERT, UPDATE, DELETE.

Không tạo trigger cho audit_logs.

### 15.2. Actor context

Context và thao tác thay đổi phải nằm trong cùng transaction và cùng EntityManager:

~~~typescript
await manager.query(
  "SELECT set_config('app.current_user_id', $1, true)",
  [String(userId)],
);

await manager.update(Employee, employeeId, updateData);
~~~

Không nối chuỗi userId trực tiếp vào SQL.

### 15.3. Trigger function

~~~sql
CREATE OR REPLACE FUNCTION fn_write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor_id INT;
  v_record_id INT;
BEGIN
  v_actor_id :=
    NULLIF(current_setting('app.current_user_id', true), '')::INT;

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
  ELSE
    v_record_id := NEW.id;
  END IF;

  INSERT INTO audit_logs (
    actor_id,
    action,
    table_name,
    record_id,
    old_value,
    new_value,
    timestamp
  )
  VALUES (
    v_actor_id,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    CASE
      WHEN TG_OP IN ('UPDATE', 'DELETE')
      THEN to_jsonb(OLD)
      ELSE NULL
    END,
    CASE
      WHEN TG_OP IN ('INSERT', 'UPDATE')
      THEN to_jsonb(NEW)
      ELSE NULL
    END,
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;
~~~

### 15.4. Gắn trigger

~~~sql
CREATE TRIGGER trg_audit_employees
AFTER INSERT OR UPDATE OR DELETE
ON employees
FOR EACH ROW
EXECUTE FUNCTION fn_write_audit_log();

CREATE TRIGGER trg_audit_payrolls
AFTER INSERT OR UPDATE OR DELETE
ON payrolls
FOR EACH ROW
EXECUTE FUNCTION fn_write_audit_log();
~~~

### 15.5. Kiểm tra trigger

~~~sql
BEGIN;

SELECT set_config('app.current_user_id', '1', true);

UPDATE employees
SET last_name = 'Updated'
WHERE id = 4;

COMMIT;

SELECT *
FROM audit_logs
WHERE table_name = 'employees'
ORDER BY id DESC
LIMIT 1;
~~~

Kết quả cần có actor_id, action, table_name, record_id, old_value và new_value.

---

## 16. API contract

### 16.1. Register

~~~text
POST /auth/register
~~~

Request:

~~~json
{
  "firstName": "An",
  "lastName": "Nguyen",
  "email": "an@example.com",
  "password": "Password@123",
  "departmentId": 1,
  "jobTitleId": 1,
  "managerId": 2
}
~~~

Không trả password.

### 16.2. Login

~~~text
POST /auth/login
~~~

Request:

~~~json
{
  "email": "user@hrm.local",
  "password": "Password@123"
}
~~~

Response:

~~~json
{
  "access_token": "jwt-access-token",
  "refresh_token": "opaque-refresh-token",
  "expires_in": 900
}
~~~

### 16.3. Error format

~~~json
{
  "success": false,
  "statusCode": 404,
  "message": "Không tìm thấy nhân viên",
  "error": "Not Found",
  "timestamp": "2026-09-17T10:00:00.000Z"
}
~~~

### 16.4. HTTP status

| Tình huống | Status |
|---|---:|
| Tạo thành công | 201 |
| Đọc/cập nhật thành công | 200 |
| Request sai | 400 |
| Chưa đăng nhập | 401 |
| Không đủ quyền | 403 |
| Không tìm thấy | 404 |
| Dữ liệu trùng | 409 |
| Lỗi hệ thống | 500 |

---

## 17. Testing

### 17.1. Mục tiêu

Coverage tối thiểu:

~~~text
Statements >= 70%
Branches   >= 70%
Functions  >= 70%
Lines      >= 70%
~~~

Tập trung test business logic trong AuthService, LeaveRequestService và PayrollService.

### 17.2. AuthService unit test

Các case:

1. Register thành công.
2. Email bị trùng.
3. Password được hash.
4. Role register luôn là USER.
5. Login thành công.
6. Sai password.
7. User không tồn tại.
8. User không ACTIVE.
9. Refresh hợp lệ.
10. Refresh token bị revoke.
11. Refresh token hết hạn.

Mock:

- Employee repository.
- Refresh token repository.
- JwtService.
- Bcrypt.

### 17.3. LeaveRequestService unit test

Các case:

1. Tạo request thành công.
2. Ngày không hợp lệ.
3. Employee không ACTIVE.
4. Request bị trùng.
5. Manager trực tiếp được duyệt.
6. Manager khác bị từ chối.
7. Sai status không được duyệt.
8. HR chỉ duyệt request đã qua manager.
9. Reject đúng quyền.
10. USER chỉ xem request của mình.

### 17.4. PayrollService unit test

Các case:

1. Chỉ lấy employee ACTIVE.
2. Tính đúng ngày overlap.
3. APPROVED_BY_HR không bị trừ.
4. PENDING bị tính không hợp lệ.
5. Deductions không âm.
6. Chặn payroll trùng kỳ.
7. Không insert total_salary.
8. Rollback khi một employee lỗi.

### 17.5. E2E auth

~~~text
POST /auth/register
POST /auth/login
GET /profile với Bearer token
~~~

Kiểm tra status, body và việc không lộ password.

### 17.6. E2E leave

~~~text
Login USER
POST /leave-requests

Login MANAGER
PATCH /leave-requests/:id/approve-manager

Login HR_MANAGER
PATCH /leave-requests/:id/approve-hr

GET /leave-requests/:id
~~~

Kiểm tra status chuyển lần lượt:

~~~text
PENDING
APPROVED_BY_MANAGER
APPROVED_BY_HR
~~~

### 17.7. Security test

- Không token trả 401.
- Token sai trả 401.
- Sai role trả 403.
- Field lạ bị từ chối.
- Không thể register thành ADMIN.
- USER không xem payroll của người khác.
- USER không gọi employee CRUD.
- Employee không bị xóa vật lý.

### 17.8. Chạy test

~~~powershell
npm run test
npm run test:e2e
npm run test:cov
~~~

E2E nên dùng database test riêng, không dùng nhầm database development.

---

## 18. Swagger và tài liệu

Swagger:

~~~text
http://localhost:3000/api/docs
~~~

Mỗi DTO cần có:

- Mô tả.
- Ví dụ.
- Validation decorator.

Ví dụ:

~~~typescript
@ApiProperty({
  description: 'Ngày bắt đầu nghỉ',
  example: '2026-10-01',
})
@IsDateString()
startDate: string;
~~~

Controller nên có:

~~~typescript
@ApiTags('Leave Requests')
@ApiBearerAuth()
@ApiOperation({
  summary: 'Tạo đơn nghỉ phép',
})
@ApiResponse({
  status: 201,
  description: 'Tạo đơn thành công',
})
~~~

Checklist:

- [ ] Có title, description và version.
- [ ] Có bearer authentication.
- [ ] Có tag cho từng module.
- [ ] DTO có example.
- [ ] Có response 200/201.
- [ ] Có response lỗi 400/401/403/404.
- [ ] Có query parameter.

---

## 19. Docker production

### 19.1. Dockerfile

~~~dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
~~~

### 19.2. Production rules

- Không commit secret.
- Không dùng synchronize.
- Chạy migration trước khi start app.
- Có health check.
- Không log password.
- Không log access token hoặc refresh token.
- Không trả stack trace cho client.

Nên bổ sung:

~~~text
GET /health
~~~

Health check kiểm tra app và database.

---

## 20. Lộ trình thời gian 10 ngày

| Ngày | Nội dung | Kết quả |
|---:|---|---|
| 1 | Project, Docker, env | App chạy |
| 2 | Entity, migration, constraints | Database hoàn chỉnh |
| 3 | Seed và common infrastructure | Có pipeline dùng chung |
| 4 | Register, login, JWT | Authentication chạy |
| 5 | Employee, profile, master data | CRUD chạy |
| 6 | Leave request | Duyệt hai cấp |
| 7 | Payroll | Tính lương |
| 8 | Trigger audit | Có audit log |
| 9 | Unit, E2E, Swagger | Test và tài liệu |
| 10 | Docker, README, demo | Nghiệm thu |

Nếu có hai tuần, dùng thời gian thêm để:

- Tăng coverage.
- Bổ sung transaction test.
- Kiểm tra race condition.
- Viết ERD.
- Refactor query.
- Chuẩn bị slide và kịch bản demo.

---

## 21. Checklist nghiệm thu

### Project

- [ ] Build thành công.
- [ ] Chạy được start:dev.
- [ ] PostgreSQL chạy bằng Docker.
- [ ] Có .env.example.
- [ ] README đầy đủ.

### Database

- [ ] Đủ bảng.
- [ ] Primary key.
- [ ] Foreign key.
- [ ] Unique constraint.
- [ ] Check constraint.
- [ ] Index.
- [ ] Generated total_salary.
- [ ] Trigger employees.
- [ ] Trigger payrolls.
- [ ] Refresh tokens.
- [ ] Seed data.

### Authentication

- [ ] Register public.
- [ ] Login public.
- [ ] Refresh public.
- [ ] Logout protected.
- [ ] Password hash.
- [ ] JWT không chứa dữ liệu nhạy cảm.
- [ ] Token hết hạn đúng.
- [ ] Refresh token revoke được.

### Authorization

- [ ] USER xem profile của mình.
- [ ] USER tạo leave.
- [ ] MANAGER duyệt nhân viên trực tiếp.
- [ ] HR_MANAGER quản lý employee.
- [ ] HR_MANAGER process payroll.
- [ ] ADMIN quản lý department.
- [ ] ADMIN xem audit.
- [ ] Sai quyền trả 403.

### Employee

- [ ] Create.
- [ ] List.
- [ ] Search.
- [ ] Pagination.
- [ ] Update.
- [ ] Soft delete.
- [ ] Không xóa vật lý.
- [ ] Chống mass assignment.

### Leave

- [ ] Validate date.
- [ ] Tạo PENDING.
- [ ] Manager approval.
- [ ] HR approval.
- [ ] Reject.
- [ ] Kiểm tra direct manager.
- [ ] Kiểm tra state transition.
- [ ] Scope dữ liệu theo role.

### Payroll

- [ ] Process theo kỳ.
- [ ] Chỉ employee ACTIVE.
- [ ] Deductions.
- [ ] Chống trùng kỳ.
- [ ] Generated total salary.
- [ ] USER chỉ xem payroll của mình.
- [ ] HR và ADMIN xem toàn bộ.

### API quality

- [ ] Swagger /api/docs.
- [ ] DTO có ApiProperty.
- [ ] Bearer auth.
- [ ] Response thành công thống nhất.
- [ ] Response lỗi thống nhất.
- [ ] Helmet.
- [ ] CORS.
- [ ] ValidationPipe.

### Testing

- [ ] Unit AuthService.
- [ ] Unit LeaveRequestService.
- [ ] Unit PayrollService.
- [ ] E2E auth.
- [ ] E2E leave.
- [ ] RBAC test.
- [ ] Validation test.
- [ ] Coverage >= 70%.

---

## 22. Kịch bản demo bảo vệ

### Bước 1: Giới thiệu

Trình bày:

- NestJS modular architecture.
- PostgreSQL 3NF.
- JWT và RBAC.
- Docker.
- PostgreSQL audit trigger.

### Bước 2: RBAC

1. Login USER.
2. Gọi GET /employees.
3. Nhận 403.
4. Login HR_MANAGER.
5. Gọi lại và nhận dữ liệu.

### Bước 3: Chống privilege escalation

1. Register tài khoản mới.
2. Gửi thêm role ADMIN.
3. Chứng minh role vẫn là USER hoặc request bị từ chối.

### Bước 4: Leave approval

1. USER tạo đơn.
2. MANAGER duyệt cấp 1.
3. HR_MANAGER duyệt cấp 2.
4. Kiểm tra APPROVED_BY_HR.

### Bước 5: Payroll

1. Tạo leave chưa duyệt HR.
2. HR_MANAGER process payroll.
3. Kiểm tra deductions.
4. Kiểm tra total_salary do database sinh.

### Bước 6: Audit

1. Update employee.
2. Truy vấn audit_logs.
3. Hiển thị actor_id, action, old_value và new_value.

### Bước 7: Test

~~~powershell
npm run test:cov
npm run test:e2e
~~~

Hiển thị coverage >= 70%.

---

## 23. Các lỗi thường gặp cần tránh

### Dùng synchronize true

Không dùng trong project cuối khóa. Dùng migration để schema có thể tái tạo.

### Cho phép client truyền role khi register

Đây là lỗi nâng quyền nghiêm trọng. Register public chỉ tạo USER.

### Đặt actor context ngoài transaction

Context phải được đặt và sử dụng trên cùng connection trong cùng transaction.

### Nối chuỗi SQL

Không nối userId hoặc input client vào SQL. Dùng parameter binding.

### Xóa vật lý employee

Dùng TERMINATED để giữ dữ liệu lịch sử.

### Tin vào employeeId từ body

Profile, leave và payroll của USER phải lấy ID từ JWT.

### Chỉ kiểm tra role

MANAGER còn phải là manager trực tiếp của employee.

### Tính total_salary trong service

Service chỉ tính deductions. PostgreSQL sinh total_salary.

### Không kiểm tra state transition

Không cho phép các chuyển đổi ngược hoặc duyệt lại request đã hoàn tất.

### Chỉ test status code

Test cần kiểm tra body, database state, permission, audit log và dữ liệu nhạy cảm.

---

## 24. Definition of Done

Một phase được xem là hoàn thành khi:

1. Code compile thành công.
2. Migration chạy được.
3. Có test cho logic chính.
4. Có xử lý lỗi.
5. Có kiểm tra quyền.
6. Có Swagger nếu phase có API.
7. Không có secret hard-code.
8. Không phá vỡ phase trước.
9. README được cập nhật nếu có thay đổi cách chạy.

Toàn bộ project hoàn thành khi:

- Từ thư mục sạch có thể chạy PostgreSQL bằng Docker.
- Có thể chạy migration từ đầu.
- Có thể seed tài khoản demo.
- Backend start thành công.
- Swagger mở được.
- Auth, leave và payroll chạy được theo SRS.
- Audit log có actor_id chính xác.
- Unit/E2E test chạy thành công.
- Coverage tối thiểu 70%.
- Người khác có thể setup project chỉ bằng README.

---

## 25. Thứ tự bắt đầu ngay

~~~powershell
cd C:\PROJECT\rikkeilearning\fjs_be_module2\Cuoi_Khoa
nest new backend --strict
cd backend
npm install @nestjs/config @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local
npm install bcrypt helmet class-validator class-transformer @nestjs/swagger
docker compose up -d
npm run start:dev
~~~

Sau khi app chạy, triển khai theo thứ tự:

~~~text
Database
-> Common infrastructure
-> Authentication
-> Employee
-> Leave request
-> Payroll
-> Audit trigger
-> Testing
-> Docker production
~~~

