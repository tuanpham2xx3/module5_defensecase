import { Role } from '../../common/constants/role.enum';
import { EmployeeStatus } from '../../database/entities/employee.entity';
import { EmployeesService } from './employees.service';

describe('EmployeesService', () => {
  const employee = {
    id: 42,
    firstName: 'An',
    lastName: 'Nguyen',
    email: 'an@example.com',
    password: 'secret-hash',
    role: Role.USER,
    status: EmployeeStatus.ACTIVE,
    departmentId: 1,
    jobTitleId: 2,
    managerId: 3,
    department: { id: 1, name: 'Engineering', location: 'Hanoi' },
    jobTitle: { id: 2, title: 'Developer' },
    manager: null,
    createdAt: new Date('2026-09-23T00:00:00.000Z'),
  };
  const employeeRepository = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    delete: jest.fn(),
  };
  const departmentRepository = { findOneBy: jest.fn() };
  const jobTitleRepository = { findOneBy: jest.fn() };
  let service: EmployeesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeesService(
      employeeRepository as never,
      departmentRepository as never,
      jobTitleRepository as never,
    );
  });

  it('loads profile by JWT subject and excludes the password', async () => {
    employeeRepository.findOne.mockResolvedValue(employee);

    const result = await service.getProfile(42);

    expect(employeeRepository.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
    expect(result).toMatchObject({ id: 42, email: 'an@example.com' });
    expect(result).not.toHaveProperty('password');
  });

  it('returns paginated employee search results with metadata', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[employee], 5]),
    };
    employeeRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({ page: 2, limit: 2, search: 'eng' });

    expect(queryBuilder.skip).toHaveBeenCalledWith(2);
    expect(queryBuilder.take).toHaveBeenCalledWith(2);
    expect(result.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(result.items[0]).not.toHaveProperty('password');
  });

  it('filters list results by department and status', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    employeeRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.findAll({ page: 1, limit: 10, departmentId: 3, status: EmployeeStatus.TERMINATED });

    expect(queryBuilder.where).toHaveBeenCalledWith('employee.status = :status', { status: EmployeeStatus.TERMINATED });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('employee.department_id = :departmentId', { departmentId: 3 });
  });

  it('blocks HR_MANAGER from assigning ADMIN', async () => {
    employeeRepository.findOne.mockResolvedValue(employee);

    await expect(service.update(42, { role: Role.ADMIN } as never, {
      sub: 9,
      email: 'hr@example.com',
      role: Role.HR_MANAGER,
    })).rejects.toMatchObject({ status: 403 });
    expect(employeeRepository.save).not.toHaveBeenCalled();
  });

  it('creates an employee with a hashed password', async () => {
    employeeRepository.findOne.mockResolvedValue(null);

    const result = await service.create({
      firstName: 'New',
      lastName: 'Employee',
      email: 'new@example.com',
      password: 'Password@123',
    }, {
      sub: 1,
      email: 'admin@example.com',
      role: Role.ADMIN,
    });

    const saved = employeeRepository.save.mock.calls[0][0];
    expect(saved.password).not.toBe('Password@123');
    expect(result).not.toHaveProperty('password');
  });

  it('returns not found for an unknown employee detail', async () => {
    employeeRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toMatchObject({ status: 404 });
  });

  it('returns conflict for a duplicate employee email', async () => {
    employeeRepository.findOne.mockResolvedValue({ id: 9, email: 'an@example.com' });

    await expect(service.create({
      firstName: 'Another',
      lastName: 'Employee',
      email: ' AN@EXAMPLE.COM ',
      password: 'Password@123',
    } as never, {
      sub: 1,
      email: 'admin@example.com',
      role: Role.ADMIN,
    })).rejects.toMatchObject({ status: 409 });
  });

  it('soft-deletes an employee by changing status to TERMINATED', async () => {
    employeeRepository.findOne.mockResolvedValue(employee);

    const result = await service.remove(42, {
      sub: 1,
      email: 'admin@example.com',
      role: Role.ADMIN,
    });

    expect(employee.status).toBe(EmployeeStatus.TERMINATED);
    expect(employeeRepository.save).toHaveBeenCalledWith(employee);
    expect(employeeRepository.delete).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 42, status: EmployeeStatus.TERMINATED });
  });
});
