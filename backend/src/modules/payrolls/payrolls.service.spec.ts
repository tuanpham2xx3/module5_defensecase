import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeStatus, LeaveStatus, PayrollStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PayrollsService } from './payrolls.service';

describe('PayrollsService', () => {
  let service: PayrollsService;

  const mockPrismaService: any = {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    payroll: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };
  mockPrismaService.$transaction = jest.fn((callback: (tx: any) => Promise<any>) =>
    callback(mockPrismaService),
  );

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PayrollsService>(PayrollsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayroll', () => {
    it('should throw BadRequestException if pay_period_start > pay_period_end', async () => {
      await expect(
        service.createPayroll({
          pay_period_start: new Date('2026-09-30'),
          pay_period_end: new Date('2026-09-01'),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process payroll with deductions correctly and create record', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        {
          id: 1,
          status: EmployeeStatus.ACTIVE,
          jobTitle: { salaryRangeMin: 22000000 },
          leaveRequests: [
            {
              startDate: new Date('2026-09-01'),
              endDate: new Date('2026-09-08'), // 8 days approved -> 8 - 7 (max) = 1 excess day
              status: LeaveStatus.APPROVED_BY_HR,
            },
            {
              startDate: new Date('2026-09-10'),
              endDate: new Date('2026-09-11'), // 2 days unapproved pending
              status: LeaveStatus.PENDING,
            },
          ],
        },
      ]);
      mockPrismaService.payroll.findFirst.mockResolvedValue(null);
      mockPrismaService.payroll.create.mockResolvedValue({ id: 10 });

      const result = await service.createPayroll({
        pay_period_start: new Date('2026-09-01'),
        pay_period_end: new Date('2026-09-30'),
      });

      expect(result.message).toBe('Xử lý bảng lương thành công');
      expect(result.processedEmployees).toBe(1);
      expect(mockPrismaService.payroll.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            employeeId: 1,
            baseSalary: 22000000,
            deductions: 3000000,
            totalSalary: 19000000,
          }),
        }),
      );
    });

    it('should update existing payroll record if already processed for same period (idempotent)', async () => {
      mockPrismaService.employee.findMany.mockResolvedValue([
        {
          id: 2,
          status: EmployeeStatus.ACTIVE,
          jobTitle: null,
          leaveRequests: [],
        },
      ]);
      mockPrismaService.payroll.findFirst.mockResolvedValue({ id: 99 });
      mockPrismaService.payroll.update.mockResolvedValue({ id: 99 });

      const result = await service.createPayroll({
        pay_period_start: new Date('2026-09-01'),
        pay_period_end: new Date('2026-09-30'),
      });

      expect(result.processedEmployees).toBe(1);
      expect(mockPrismaService.payroll.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 99 },
          data: expect.objectContaining({
            baseSalary: 10000000,
            deductions: 0,
            totalSalary: 10000000,
          }),
        }),
      );
    });
  });

  describe('getPayroll', () => {
    it('should throw NotFoundException if employee not found', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue(null);

      await expect(
        service.getPayroll({ sub: 999 }, { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return paginated payrolls for current user with metadata', async () => {
      mockPrismaService.employee.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.payroll.findMany.mockResolvedValue([
        { id: 1, employeeId: 1, totalSalary: 15000000 },
      ]);
      mockPrismaService.payroll.count.mockResolvedValue(1);

      const result = await service.getPayroll(
        { sub: 1 },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('getAllPayrolls', () => {
    it('should filter by employeeName with insensitive OR, status, and dates', async () => {
      mockPrismaService.payroll.findMany.mockResolvedValue([
        { id: 1, employeeId: 1, totalSalary: 20000000, employee: { firstName: 'John', lastName: 'Doe' } },
      ]);
      mockPrismaService.payroll.count.mockResolvedValue(1);

      const result = await service.getAllPayrolls({
        page: 1,
        limit: 10,
        employeeName: 'John',
        status: PayrollStatus.PENDING,
        pay_period_start: new Date('2026-09-01'),
        pay_period_end: new Date('2026-09-30'),
      });

      expect(result.items).toHaveLength(1);
      expect(mockPrismaService.payroll.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PayrollStatus.PENDING,
            employee: {
              OR: [
                { firstName: { contains: 'John', mode: 'insensitive' } },
                { lastName: { contains: 'John', mode: 'insensitive' } },
                { email: { contains: 'John', mode: 'insensitive' } },
              ],
            },
          }),
        }),
      );
    });
  });
});
