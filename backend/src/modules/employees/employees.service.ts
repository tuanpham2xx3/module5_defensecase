import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { Role } from '../../common/constants/role.enum';
import { toPublicEmployee } from '../../common/utils/employee-presenter';
import { PrismaService } from '../../database/prisma.service';
import { employeeInclude } from '../../database/types';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(employeeId: number): Promise<Record<string, unknown>> {
    return toPublicEmployee(await this.findEntity(employeeId));
  }

  async findAll(query: EmployeeQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();
    const where = {
      status: query.status ?? EmployeeStatus.ACTIVE,
      ...(query.departmentId !== undefined ? { departmentId: query.departmentId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { department: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: employeeInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items: employees.map(toPublicEmployee),
      meta: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) },
    };
  }

  async findOne(id: number): Promise<Record<string, unknown>> {
    return toPublicEmployee(await this.findEntity(id));
  }

  async create(dto: CreateEmployeeDto, actor: JwtPayload): Promise<Record<string, unknown>> {
    this.assertCanManage(actor);
    this.assertRoleAssignment(actor, dto.role);
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.employee.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');
    await this.validateReferences(dto);

    return toPublicEmployee(await this.prisma.employee.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        password: await bcrypt.hash(dto.password, 10),
        role: dto.role ?? Role.USER,
        status: EmployeeStatus.ACTIVE,
        departmentId: dto.departmentId ?? null,
        jobTitleId: dto.jobTitleId ?? null,
        managerId: dto.managerId ?? null,
      },
      include: employeeInclude,
    }));
  }

  async update(id: number, dto: UpdateEmployeeDto, actor: JwtPayload): Promise<Record<string, unknown>> {
    this.assertCanManage(actor);
    this.assertRoleAssignment(actor, dto.role);
    const employee = await this.findEntity(id);
    if (dto.email && dto.email.trim().toLowerCase() !== employee.email) {
      const duplicate = await this.prisma.employee.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
      if (duplicate && duplicate.id !== id) throw new ConflictException('Email đã được sử dụng');
    }
    await this.validateReferences(dto);

    return toPublicEmployee(await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
        ...(dto.password !== undefined ? { password: await bcrypt.hash(dto.password, 10) } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.jobTitleId !== undefined ? { jobTitleId: dto.jobTitleId } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
      },
      include: employeeInclude,
    }));
  }

  async remove(id: number, actor: JwtPayload): Promise<Record<string, unknown>> {
    this.assertCanManage(actor);
    await this.findEntity(id);
    return toPublicEmployee(await this.prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.TERMINATED },
      include: employeeInclude,
    }));
  }

  private async findEntity(id: number) {
    const employee = await this.prisma.employee.findUnique({ where: { id }, include: employeeInclude });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên');
    return employee;
  }

  private assertCanManage(actor: JwtPayload): void {
    if (actor.role !== Role.ADMIN && actor.role !== Role.HR_MANAGER) {
      throw new ForbiddenException('Chỉ HR_MANAGER hoặc ADMIN được quản lý nhân sự');
    }
  }

  private assertRoleAssignment(actor: JwtPayload, role: Role | undefined): void {
    if (role === Role.ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('HR_MANAGER không được cấp quyền ADMIN');
    }
  }

  private async validateReferences(dto: Pick<CreateEmployeeDto, 'departmentId' | 'jobTitleId' | 'managerId'>): Promise<void> {
    if (dto.departmentId !== undefined && !(await this.prisma.department.findUnique({ where: { id: dto.departmentId } }))) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }
    if (dto.jobTitleId !== undefined && !(await this.prisma.jobTitle.findUnique({ where: { id: dto.jobTitleId } }))) {
      throw new NotFoundException('Không tìm thấy chức danh');
    }
    if (dto.managerId !== undefined) {
      const manager = await this.prisma.employee.findUnique({ where: { id: dto.managerId } });
      if (!manager || manager.status !== EmployeeStatus.ACTIVE || manager.role !== Role.MANAGER) {
        throw new NotFoundException('Không tìm thấy quản lý đang hoạt động');
      }
    }
  }
}
