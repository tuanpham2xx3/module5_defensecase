import { Test, TestingModule } from '@nestjs/testing';

import { Role } from '../../common/constants/role.enum';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';

describe('LeaveRequestController', () => {
  let controller: LeaveRequestController;
  const mockService = {
    createLeaveRequest: jest.fn(),
    getMyLeaveRequests: jest.fn(),
    getLeaveRequests: jest.fn(),
    approveLeaveRequestManager: jest.fn(),
    rejectLeaveRequestManager: jest.fn(),
    approveLeaveRequestHRManager: jest.fn(),
    rejectLeaveRequestHRManager: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveRequestController],
      providers: [
        {
          provide: LeaveRequestService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<LeaveRequestController>(LeaveRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates createLeaveRequest to service', async () => {
    mockService.createLeaveRequest.mockResolvedValue({ id: 1 });
    const user = { sub: 10, email: 'test@hrm.local', role: Role.USER };
    const dto = { startDate: new Date('2026-10-01'), endDate: new Date('2026-10-02'), type: 'VACATION' as never };

    const result = await controller.createLeaveRequest(user, dto);
    expect(mockService.createLeaveRequest).toHaveBeenCalledWith(10, dto);
    expect(result).toEqual({ id: 1 });
  });

  it('delegates getMyLeaveRequests to service', async () => {
    mockService.getMyLeaveRequests.mockResolvedValue({ items: [], meta: { total: 0 } });
    const user = { sub: 10, email: 'test@hrm.local', role: Role.USER };
    const query = { page: 1, limit: 10 };

    const result = await controller.getMyLeaveRequests(user, query);
    expect(mockService.getMyLeaveRequests).toHaveBeenCalledWith(10, query);
    expect(result.items).toEqual([]);
  });

  it('delegates getLeaveRequests to service', async () => {
    mockService.getLeaveRequests.mockResolvedValue({ items: [], meta: { total: 0 } });
    const user = { sub: 5, email: 'mgr@hrm.local', role: Role.MANAGER };
    const query = { page: 1, limit: 10 };

    const result = await controller.getLeaveRequests(user, query);
    expect(mockService.getLeaveRequests).toHaveBeenCalledWith(user, query);
    expect(result.items).toEqual([]);
  });

  it('delegates approveLeaveRequestManager to service', async () => {
    mockService.approveLeaveRequestManager.mockResolvedValue({ id: 1 });
    const user = { sub: 5, email: 'mgr@hrm.local', role: Role.MANAGER };

    const result = await controller.approveLeaveRequestManager(user, 1);
    expect(mockService.approveLeaveRequestManager).toHaveBeenCalledWith(5, 1);
    expect(result).toEqual({ id: 1 });
  });

  it('delegates rejectLeaveRequestManager to service', async () => {
    mockService.rejectLeaveRequestManager.mockResolvedValue({ id: 1 });
    const user = { sub: 5, email: 'mgr@hrm.local', role: Role.MANAGER };

    const result = await controller.rejectLeaveRequestManager(user, 1);
    expect(mockService.rejectLeaveRequestManager).toHaveBeenCalledWith(5, 1);
    expect(result).toEqual({ id: 1 });
  });

  it('delegates approveLeaveRequestHRManager to service', async () => {
    mockService.approveLeaveRequestHRManager.mockResolvedValue({ id: 1 });
    const user = { sub: 2, email: 'hr@hrm.local', role: Role.HR_MANAGER };

    const result = await controller.approveLeaveRequestHRManager(user, 1);
    expect(mockService.approveLeaveRequestHRManager).toHaveBeenCalledWith(2, 1);
    expect(result).toEqual({ id: 1 });
  });

  it('delegates rejectLeaveRequestHRManager to service', async () => {
    mockService.rejectLeaveRequestHRManager.mockResolvedValue({ id: 1 });
    const user = { sub: 2, email: 'hr@hrm.local', role: Role.HR_MANAGER };

    const result = await controller.rejectLeaveRequestHRManager(user, 1);
    expect(mockService.rejectLeaveRequestHRManager).toHaveBeenCalledWith(2, 1);
    expect(result).toEqual({ id: 1 });
  });
});
