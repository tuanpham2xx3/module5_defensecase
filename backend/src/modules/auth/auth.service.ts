import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { Role } from '../../common/constants/role.enum';
import { toPublicEmployee } from '../../common/utils/employee-presenter';
import { Department } from '../../database/entities/department.entity';
import { Employee, EmployeeStatus } from '../../database/entities/employee.entity';
import { JobTitle } from '../../database/entities/job-title.entity';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
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
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(JobTitle) private readonly jobTitleRepository: Repository<JobTitle>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<Record<string, unknown>> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.employeeRepository.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    if (dto.departmentId !== undefined && !(await this.departmentRepository.findOneBy({ id: dto.departmentId }))) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }
    if (dto.jobTitleId !== undefined && !(await this.jobTitleRepository.findOneBy({ id: dto.jobTitleId }))) {
      throw new NotFoundException('Không tìm thấy chức danh');
    }
    if (dto.managerId !== undefined) {
      const manager = await this.employeeRepository.findOne({ where: { id: dto.managerId } });
      if (!manager || manager.status !== EmployeeStatus.ACTIVE) {
        throw new NotFoundException('Không tìm thấy quản lý đang hoạt động');
      }
    }

    const employee = this.employeeRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      password: await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS),
      role: Role.USER,
      status: EmployeeStatus.ACTIVE,
      departmentId: dto.departmentId ?? null,
      jobTitleId: dto.jobTitleId ?? null,
      managerId: dto.managerId ?? null,
    });
    const saved = await this.employeeRepository.save(employee);
    return toPublicEmployee(saved);
  }

  async validateUser(email: string, password: string): Promise<Employee | null> {
    const employee = await this.employeeRepository.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!employee || employee.status !== EmployeeStatus.ACTIVE) return null;
    return (await bcrypt.compare(password, employee.password)) ? employee : null;
  }

  async login(employee: Employee): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const payload: JwtPayload = { sub: employee.id, email: employee.email, role: employee.role };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: accessExpiresIn as never });
    const refreshToken = randomBytes(48).toString('hex');

    await this.refreshTokenRepository.save(this.refreshTokenRepository.create({
      employeeId: employee.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + durationToMilliseconds(refreshExpiresIn, 7 * 86_400_000)),
      revokedAt: null,
    }));

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Math.floor(durationToMilliseconds(accessExpiresIn, 900_000) / 1000),
    };
  }

  async refresh(dto: RefreshDto): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hashRefreshToken(dto.refreshToken), revokedAt: IsNull() },
      relations: { employee: true },
    });
    if (!token || token.expiresAt.getTime() <= Date.now() || token.employee.status !== EmployeeStatus.ACTIVE) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }
    token.revokedAt = new Date();
    await this.refreshTokenRepository.save(token);
    return this.login(token.employee);
  }

  async logout(dto: RefreshDto): Promise<{ message: string }> {
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash: hashRefreshToken(dto.refreshToken), revokedAt: IsNull() },
    });
    if (token) {
      token.revokedAt = new Date();
      await this.refreshTokenRepository.save(token);
    }
    return { message: 'Đăng xuất thành công' };
  }

  async loginWithCredentials(dto: LoginDto): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const employee = await this.validateUser(dto.email, dto.password);
    if (!employee) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.login(employee);
  }
}
