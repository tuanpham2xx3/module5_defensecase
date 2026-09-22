import { EmployeeStatus } from '@prisma/client';

import { Role } from '../../common/constants/role.enum';
import { EmployeesService } from './employees.service';

describe('EmployeesService with Prisma', () => {
  const employee = {
    id: 42, firstName: 'An', lastName: 'Nguyen', email: 'an@example.com', password: 'secret-hash',
    role: Role.USER, status: EmployeeStatus.ACTIVE, departmentId: 1, jobTitleId: 2, managerId: 3,
    department: { id: 1, name: 'Engineering', location: 'Hanoi' },
    jobTitle: { id: 2, title: 'Developer' }, manager: null,
    createdAt: new Date('2026-09-23T00:00:00.000Z'),
  };
  const prisma = {
    employee: {
      findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    department: { findUnique: jest.fn() },
    jobTitle: { findUnique: jest.fn() },
  };
  let service: EmployeesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeesService(prisma as never);
    prisma.employee.create.mockImplementation(async ({ data }) => ({ ...employee, ...data }));
    prisma.employee.update.mockResolvedValue(employee);
    prisma.department.findUnique.mockResolvedValue({ id: 1 });
    prisma.jobTitle.findUnique.mockResolvedValue({ id: 2 });
  });

  it('loads profile by JWT subject and excludes the password', async () => {
    prisma.employee.findUnique.mockResolvedValue(employee);
    const result = await service.getProfile(42);

    expect(prisma.employee.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
    expect(result).toMatchObject({ id: 42, email: 'an@example.com' });
    expect(result).not.toHaveProperty('password');
  });

  it('returns paginated employee search results with metadata', async () => {
    prisma.employee.findMany.mockResolvedValue([employee]);
    prisma.employee.count.mockResolvedValue(5);
    const result = await service.findAll({ page: 2, limit: 2, search: 'eng' });

    expect(prisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 2, take: 2 }));
    expect(result.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(result.items[0]).not.toHaveProperty('password');
  });

  it('filters list results by department and status', async () => {
    prisma.employee.findMany.mockResolvedValue([]);
    prisma.employee.count.mockResolvedValue(0);
    await service.findAll({ page: 1, limit: 10, departmentId: 3, status: EmployeeStatus.TERMINATED });

    expect(prisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ departmentId: 3, status: EmployeeStatus.TERMINATED }),
    }));
  });

  it('blocks HR_MANAGER from assigning ADMIN', async () => {
    prisma.employee.findUnique.mockResolvedValue(employee);
    await expect(service.update(42, { role: Role.ADMIN } as never, {
      sub: 9, email: 'hr@example.com', role: Role.HR_MANAGER,
    })).rejects.toMatchObject({ status: 403 });
    expect(prisma.employee.update).not.toHaveBeenCalled();
  });

  it('creates an employee with a hashed password', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);
    const result = await service.create({
      firstName: 'New', lastName: 'Employee', email: 'new@example.com', password: 'Password@123',
    }, { sub: 1, email: 'admin@example.com', role: Role.ADMIN });

    const saved = prisma.employee.create.mock.calls[0][0].data;
    expect(saved.password).not.toBe('Password@123');
    expect(result).not.toHaveProperty('password');
  });

  it('returns not found for an unknown employee detail', async () => {
    prisma.employee.findUnique.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toMatchObject({ status: 404 });
  });

  it('returns conflict for a duplicate employee email', async () => {
    prisma.employee.findUnique.mockResolvedValue({ id: 9, email: 'an@example.com' });
    await expect(service.create({
      firstName: 'Another', lastName: 'Employee', email: ' AN@EXAMPLE.COM ', password: 'Password@123',
    } as never, { sub: 1, email: 'admin@example.com', role: Role.ADMIN })).rejects.toMatchObject({ status: 409 });
  });

  it('soft-deletes an employee by changing status to TERMINATED', async () => {
    prisma.employee.findUnique.mockResolvedValue(employee);
    const result = await service.remove(42, { sub: 1, email: 'admin@example.com', role: Role.ADMIN });

    expect(prisma.employee.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42 }, data: { status: EmployeeStatus.TERMINATED },
    }));
    expect(result).toMatchObject({ id: 42 });
  });
});
