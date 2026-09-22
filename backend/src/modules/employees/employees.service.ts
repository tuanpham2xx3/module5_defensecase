import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../../common/constants/role.enum';
import { toPublicEmployee } from '../../common/utils/employee-presenter';
import { Department } from '../../database/entities/department.entity';
import { Employee, EmployeeStatus } from '../../database/entities/employee.entity';
import { JobTitle } from '../../database/entities/job-title.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department) private readonly departmentRepository: Repository<Department>,
    @InjectRepository(JobTitle) private readonly jobTitleRepository: Repository<JobTitle>,
  ) {}

  async getProfile(employeeId: number): Promise<Record<string, unknown>> {
    return toPublicEmployee(await this.findEntity(employeeId));
  }

  async findAll(query: EmployeeQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const builder = this.employeeRepository.createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.jobTitle', 'jobTitle')
      .leftJoinAndSelect('employee.manager', 'manager')
      .where('employee.status = :status', { status: query.status ?? EmployeeStatus.ACTIVE });

    if (query.search?.trim()) {
      builder.andWhere(
        '(employee.first_name ILIKE :search OR employee.last_name ILIKE :search OR employee.email ILIKE :search OR department.name ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }
    if (query.departmentId !== undefined) {
      builder.andWhere('employee.department_id = :departmentId', { departmentId: query.departmentId });
    }

    const [employees, total] = await builder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
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
    const existing = await this.employeeRepository.findOne({ where: { email } });
    if (existing) throw new ConflictException('Email đã được sử dụng');
    await this.validateReferences(dto);

    const employee = this.employeeRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email,
      password: await bcrypt.hash(dto.password, 10),
      role: dto.role ?? Role.USER,
      status: EmployeeStatus.ACTIVE,
      departmentId: dto.departmentId ?? null,
      jobTitleId: dto.jobTitleId ?? null,
      managerId: dto.managerId ?? null,
    });
    return toPublicEmployee(await this.employeeRepository.save(employee));
  }

  async update(id: number, dto: UpdateEmployeeDto, actor: JwtPayload): Promise<Record<string, unknown>> {
    this.assertCanManage(actor);
    this.assertRoleAssignment(actor, dto.role);
    const employee = await this.findEntity(id);
    if (dto.email && dto.email.trim().toLowerCase() !== employee.email) {
      const duplicate = await this.employeeRepository.findOne({ where: { email: dto.email.trim().toLowerCase() } });
      if (duplicate && duplicate.id !== id) throw new ConflictException('Email đã được sử dụng');
    }
    await this.validateReferences(dto);

    if (dto.firstName !== undefined) employee.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) employee.lastName = dto.lastName.trim();
    if (dto.email !== undefined) employee.email = dto.email.trim().toLowerCase();
    if (dto.password !== undefined) employee.password = await bcrypt.hash(dto.password, 10);
    if (dto.role !== undefined) employee.role = dto.role;
    if (dto.departmentId !== undefined) employee.departmentId = dto.departmentId;
    if (dto.jobTitleId !== undefined) employee.jobTitleId = dto.jobTitleId;
    if (dto.managerId !== undefined) employee.managerId = dto.managerId;
    return toPublicEmployee(await this.employeeRepository.save(employee));
  }

  async remove(id: number, actor: JwtPayload): Promise<Record<string, unknown>> {
    this.assertCanManage(actor);
    const employee = await this.findEntity(id);
    employee.status = EmployeeStatus.TERMINATED;
    return toPublicEmployee(await this.employeeRepository.save(employee));
  }

  private async findEntity(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: { department: true, jobTitle: true, manager: true },
    });
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
    if (dto.departmentId !== undefined && !(await this.departmentRepository.findOneBy({ id: dto.departmentId }))) {
      throw new NotFoundException('Không tìm thấy phòng ban');
    }
    if (dto.jobTitleId !== undefined && !(await this.jobTitleRepository.findOneBy({ id: dto.jobTitleId }))) {
      throw new NotFoundException('Không tìm thấy chức danh');
    }
    if (dto.managerId !== undefined) {
      const manager = await this.employeeRepository.findOne({ where: { id: dto.managerId } });
      if (!manager || manager.status !== EmployeeStatus.ACTIVE || manager.role !== Role.MANAGER) {
        throw new NotFoundException('Không tìm thấy quản lý đang hoạt động');
      }
    }
  }
}
