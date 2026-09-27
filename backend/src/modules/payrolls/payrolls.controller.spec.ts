import { Test, TestingModule } from '@nestjs/testing';
import { PayrollStatus } from '@prisma/client';
import { PayrollsController } from './payrolls.controller';
import { PayrollsService } from './payrolls.service';

describe('PayrollsController', () => {
  let controller: PayrollsController;
  let service: PayrollsService;

  const mockPayrollsService = {
    createPayroll: jest.fn().mockResolvedValue({ message: 'OK', processedEmployees: 1 }),
    getPayroll: jest.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
    getAllPayrolls: jest.fn().mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollsController],
      providers: [
        {
          provide: PayrollsService,
          useValue: mockPayrollsService,
        },
      ],
    }).compile();

    controller = module.get<PayrollsController>(PayrollsController);
    service = module.get<PayrollsService>(PayrollsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call createPayroll on service', async () => {
    const dto = {
      pay_period_start: new Date('2026-09-01'),
      pay_period_end: new Date('2026-09-30'),
    };
    const res = await controller.createPayroll(dto);
    expect(service.createPayroll).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ message: 'OK', processedEmployees: 1 });
  });

  it('should call getPayroll with current user', async () => {
    const user = { sub: 1, role: 'USER' };
    const query = { page: 1, limit: 10, pay_period_start: new Date(), pay_period_end: new Date() };
    const res = await controller.getPayroll(user, query);
    expect(service.getPayroll).toHaveBeenCalledWith(user, query);
    expect(res.meta.total).toBe(0);
  });

  it('should call getAllPayrolls with admin query', async () => {
    const query = {
      page: 1,
      limit: 10,
      pay_period_start: new Date(),
      pay_period_end: new Date(),
      employeeName: 'Test',
      status: PayrollStatus.PENDING,
    };
    const res = await controller.getAllPayrolls(query);
    expect(service.getAllPayrolls).toHaveBeenCalledWith(query);
    expect(res.items).toEqual([]);
  });
});
