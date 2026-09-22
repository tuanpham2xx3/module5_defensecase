import * as bcrypt from 'bcrypt';

import { Role } from '../../common/constants/role.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const employeeRepository = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ ...value, id: value.id ?? 7 })),
  };
  const refreshTokenRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const departmentRepository = { findOneBy: jest.fn() };
  const jobTitleRepository = { findOneBy: jest.fn() };
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
    service = new AuthService(
      employeeRepository as never,
      refreshTokenRepository as never,
      departmentRepository as never,
      jobTitleRepository as never,
      jwtService as never,
      configService as never,
    );
  });

  it('hashes registration passwords with bcrypt and always assigns USER', async () => {
    employeeRepository.findOne.mockResolvedValue(null);

    const created = await service.register({
      firstName: 'An',
      lastName: 'Nguyen',
      email: '  AN@EXAMPLE.COM ',
      password: 'Password@123',
      role: Role.ADMIN,
    } as never);

    expect(employeeRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'an@example.com',
      role: Role.USER,
      status: 'ACTIVE',
    }));
    const saved = employeeRepository.save.mock.calls[0][0];
    expect(saved.password).not.toBe('Password@123');
    await expect(bcrypt.compare('Password@123', saved.password)).resolves.toBe(true);
    expect(created).not.toHaveProperty('password');
    expect(created.role).toBe(Role.USER);
  });

  it('rejects duplicate normalized emails', async () => {
    employeeRepository.findOne.mockResolvedValue({ id: 1 });

    await expect(service.register({
      firstName: 'An',
      lastName: 'Nguyen',
      email: ' AN@EXAMPLE.COM ',
      password: 'Password@123',
    } as never)).rejects.toMatchObject({ status: 409 });
    expect(employeeRepository.create).not.toHaveBeenCalled();
  });

  it('returns access and opaque refresh tokens without exposing the password', async () => {
    const employee = {
      id: 7,
      firstName: 'An',
      lastName: 'Nguyen',
      email: 'an@example.com',
      password: 'bcrypt-hash',
      role: Role.USER,
      status: 'ACTIVE',
      departmentId: null,
      jobTitleId: null,
      managerId: null,
    };

    const result = await service.login(employee as never);

    expect(result.access_token).toBe('jwt-access-token');
    expect(result.refresh_token).toMatch(/^[a-f0-9]{96}$/);
    expect(result.expires_in).toBe(900);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 7, email: 'an@example.com', role: Role.USER },
      expect.objectContaining({ expiresIn: '15m' }),
    );
    expect(refreshTokenRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: 7,
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
  });
});
