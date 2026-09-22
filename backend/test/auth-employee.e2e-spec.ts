import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { configureApp } from '../src/main';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { LocalStrategy } from '../src/modules/auth/strategies/local.strategy';
import { EmployeesController } from '../src/modules/employees/employees.controller';
import { EmployeesService } from '../src/modules/employees/employees.service';
import { ProfileController } from '../src/modules/employees/profile.controller';

describe('Authentication and employee API (e2e)', () => {
  let app: INestApplication;
  const email = `e2e-${Date.now()}@example.com`;
  let accessToken: string;
  let jwtService: JwtService;
  const authService = {
    validateUser: jest.fn(async () => ({ id: 1, email, role: 'USER', status: 'ACTIVE' })),
    register: jest.fn(async (dto: { email: string }) => ({ id: 1, email: dto.email, role: 'USER', status: 'ACTIVE' })),
    login: jest.fn(async (user: { id: number; email: string; role: string }) => ({
      access_token: jwtService.sign({ sub: user.id, email: user.email, role: user.role }),
      refresh_token: 'refresh-token-for-e2e',
      expires_in: 900,
    })),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
  const employeesService = {
    getProfile: jest.fn(async (id: number) => ({ id, email, role: 'USER', status: 'ACTIVE' })),
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [AuthController, EmployeesController, ProfileController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: EmployeesService, useValue: employeesService },
        { provide: ConfigService, useValue: { get: (_key: string, fallback: string) => fallback === 'development-only-change-me' ? 'test-secret' : fallback } },
        LocalStrategy,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    jwtService = moduleRef.get(JwtService);
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a USER without exposing a password and reports HTTP 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ firstName: 'E2E', lastName: 'User', email, password: 'Password@123' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(201);
    expect(response.body.data).not.toHaveProperty('password');
    expect(response.body.data.role).toBe('USER');
  });

  it('logs in, returns tokens, and reads the profile from the JWT subject', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Password@123' })
      .expect(200);

    expect(login.body.statusCode).toBe(200);
    expect(login.body.data.access_token).toEqual(expect.any(String));
    expect(login.body.data.refresh_token).toEqual(expect.any(String));
    accessToken = login.body.data.access_token;

    const profile = await request(app.getHttpServer())
      .get('/profile?employeeId=999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profile.body.data.email).toBe(email);
    expect(profile.body.data).not.toHaveProperty('password');
  });

  it('rejects invalid tokens, USER employee CRUD, and extra registration fields', async () => {
    await request(app.getHttpServer()).get('/profile').set('Authorization', 'Bearer invalid').expect(401);
    await request(app.getHttpServer()).get('/employees').set('Authorization', `Bearer ${accessToken}`).expect(403);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ firstName: 'Attack', lastName: 'User', email: `attack-${Date.now()}@example.com`, password: 'Password@123', role: 'ADMIN' })
      .expect(400);
  });
});
