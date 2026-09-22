import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

import { Role } from '../../common/constants/role.enum';
import { toPublicEmployee } from '../../common/utils/employee-presenter';
import { PrismaService } from '../../database/prisma.service';
import { employeeInclude, EmployeeForAuth } from '../../database/types';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_SALT_ROUNDS = 10;

function durationToMilliseconds(value: string | number, fallback: number): number {
  if (typeof value === 'number') return value * 1000;
  const match = /^([0-9]+)([smhd])$/.exec(value);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return amount * multiplier;
}

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<Record<string, unknown>> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.employee.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    if (dto.departmentId !== undefined && !(await this.prisma.department.findUnique({ where: { id: dto.departmentId } }))) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }
    if (dto.jobTitleId !== undefined && !(await this.prisma.jobTitle.findUnique({ where: { id: dto.jobTitleId } }))) {
      throw new NotFoundException('Không tìm thấy chức danh');
    }
    if (dto.managerId !== undefined) {
      const manager = await this.prisma.employee.findUnique({ where: { id: dto.managerId } });
      if (!manager || manager.status !== 'ACTIVE') {
        throw new NotFoundException('Không tìm thấy quản lý đang hoạt động');
      }
    }

    const saved = await this.prisma.employee.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        password: await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS),
        role: Role.USER,
        status: 'ACTIVE',
        departmentId: dto.departmentId ?? null,
        jobTitleId: dto.jobTitleId ?? null,
        managerId: dto.managerId ?? null,
      },
      include: employeeInclude,
    });
    return toPublicEmployee(saved);
  }

  async validateUser(email: string, password: string): Promise<EmployeeForAuth | null> {
    const employee = await this.prisma.employee.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!employee || employee.status !== 'ACTIVE') return null;
    return (await bcrypt.compare(password, employee.password)) ? employee : null;
  }

  async login(employee: EmployeeForAuth): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const payload: JwtPayload = { sub: employee.id, email: employee.email, role: employee.role };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: accessExpiresIn as never });
    const refreshToken = randomBytes(48).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        employeeId: employee.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + durationToMilliseconds(refreshExpiresIn, 7 * 86_400_000)),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Math.floor(durationToMilliseconds(accessExpiresIn, 900_000) / 1000),
    };
  }

  async refresh(dto: RefreshDto): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hashRefreshToken(dto.refreshToken), revokedAt: null },
      include: { employee: true },
    });
    if (!token || token.expiresAt.getTime() <= Date.now() || token.employee.status !== 'ACTIVE') {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
    await this.prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    return this.login(token.employee);
  }

  async logout(dto: RefreshDto): Promise<{ message: string }> {
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hashRefreshToken(dto.refreshToken), revokedAt: null },
    });
    if (token) {
      await this.prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: new Date() } });
    }
    return { message: 'Đăng xuất thành công' };
  }

  async loginWithCredentials(dto: LoginDto): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const employee = await this.validateUser(dto.email, dto.password);
    if (!employee) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.login(employee);
  }
}
