import * as bcrypt from 'bcrypt';

import { Role } from '../../common/constants/role.enum';
import { AuthService } from './auth.service';

describe('AuthService with Prisma', () => {
  const prisma = {
    employee: { findUnique: jest.fn(), create: jest.fn() },
    department: { findUnique: jest.fn() },
    jobTitle: { findUnique: jest.fn() },
    refreshToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  };
  const jwtService = { signAsync: jest.fn(async () => 'jwt-access-token') };
  const configService = {
    get: jest.fn((key: string, fallback: string | number) => {
      if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
      return fallback;
    }),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as never, jwtService as never, configService as never);
  });

  it('creates a Prisma employee with a bcrypt password and forced USER role', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);
    prisma.employee.create.mockImplementation(async ({ data }) => ({
      ...data, id: 7, createdAt: new Date(), department: null, jobTitle: null, manager: null,
    }));

    const created = await service.register({
      firstName: 'An', lastName: 'Nguyen', email: '  AN@EXAMPLE.COM ', password: 'Password@123', role: Role.ADMIN,
    } as never);

    expect(prisma.employee.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'an@example.com', role: Role.USER, status: 'ACTIVE' }),
    }));
    const saved = prisma.employee.create.mock.calls[0][0].data;
    expect(saved.password).not.toBe('Password@123');
    await expect(bcrypt.compare('Password@123', saved.password)).resolves.toBe(true);
    expect(created).not.toHaveProperty('password');
    expect(created.role).toBe(Role.USER);
  });

  it('rejects duplicate normalized emails', async () => {
    prisma.employee.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.register({
      firstName: 'An', lastName: 'Nguyen', email: ' AN@EXAMPLE.COM ', password: 'Password@123',
    } as never)).rejects.toMatchObject({ status: 409 });
    expect(prisma.employee.create).not.toHaveBeenCalled();
  });

  it('returns access and opaque refresh tokens without exposing the password', async () => {
    prisma.refreshToken.create.mockResolvedValue({});
    const employee = { id: 7, email: 'an@example.com', password: 'bcrypt-hash', role: Role.USER, status: 'ACTIVE' };

    const result = await service.login(employee as never);

    expect(result.access_token).toBe('jwt-access-token');
    expect(result.refresh_token).toMatch(/^[a-f0-9]{96}$/);
    expect(result.expires_in).toBe(900);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 7, email: 'an@example.com', role: Role.USER }, expect.objectContaining({ expiresIn: '15m' }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ employeeId: 7, tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    }));
  });

  it('validates only active users with the correct password', async () => {
    const passwordHash = await bcrypt.hash('Password@123', 10);
    prisma.employee.findUnique.mockResolvedValue({
      id: 7, email: 'an@example.com', password: passwordHash, role: Role.USER, status: 'ACTIVE',
    });

    await expect(service.validateUser(' AN@EXAMPLE.COM ', 'Password@123')).resolves.toMatchObject({ id: 7 });
    await expect(service.validateUser('an@example.com', 'wrong-password')).resolves.toBeNull();
    prisma.employee.findUnique.mockResolvedValue({ status: 'INACTIVE', password: passwordHash });
    await expect(service.validateUser('an@example.com', 'Password@123')).resolves.toBeNull();
  });

  it('rejects invalid refresh tokens and revokes a valid logout token', async () => {
    prisma.refreshToken.findFirst.mockResolvedValueOnce(null);
    await expect(service.refresh({ refreshToken: 'invalid-refresh-token' })).rejects.toMatchObject({ status: 401 });

    prisma.refreshToken.findFirst.mockResolvedValueOnce({ id: 4, revokedAt: null });
    await expect(service.logout({ refreshToken: 'valid-refresh-token' })).resolves.toEqual({ message: 'Đăng xuất thành công' });
    expect(prisma.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4 } }));
  });

  it('rotates a valid refresh token', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 4, expiresAt: new Date(Date.now() + 60_000), revokedAt: null,
      employee: { id: 7, email: 'an@example.com', role: Role.USER, status: 'ACTIVE' },
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.refresh({ refreshToken: 'valid-refresh-token' });

    expect(prisma.refreshToken.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4 } }));
    expect(result.access_token).toBe('jwt-access-token');
  });
});
