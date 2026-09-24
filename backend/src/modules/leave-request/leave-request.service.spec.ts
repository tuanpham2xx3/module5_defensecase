import { LeaveStatus, LeaveType } from '@prisma/client';

import { LeaveRequestService } from './leave-request.service';

describe('LeaveRequestService', () => {
  let service: LeaveRequestService;
  const prisma = {
    employee: {
      findUnique: jest.fn(),
    },
    leaveRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeaveRequestService(prisma as never);
  });

  describe('createLeaveRequest', () => {
    it('creates a leave request for an active employee', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 1 });
      prisma.leaveRequest.create.mockResolvedValue({
        id: 10,
        employeeId: 1,
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-05'),
        type: LeaveType.VACATION,
        status: LeaveStatus.PENDING,
        reason: 'Resting',
      });

      const result = await service.createLeaveRequest(1, {
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-05'),
        type: LeaveType.VACATION,
        reason: 'Resting',
      });

      expect(prisma.leaveRequest.create).toHaveBeenCalled();
      expect(result).toMatchObject({ id: 10, status: LeaveStatus.PENDING });
    });

    it('throws BadRequestException if endDate < startDate', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 1 });
      await expect(
        service.createLeaveRequest(1, {
          startDate: new Date('2026-10-05'),
          endDate: new Date('2026-10-01'),
          type: LeaveType.VACATION,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('throws NotFoundException if employee not found', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(
        service.createLeaveRequest(999, {
          startDate: new Date('2026-10-01'),
          endDate: new Date('2026-10-05'),
          type: LeaveType.VACATION,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('approveLeaveRequestManager', () => {
    it('approves leave request when user is direct manager', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({
        id: 10,
        status: LeaveStatus.PENDING,
        employee: { managerId: 5 },
      });
      prisma.leaveRequest.update.mockResolvedValue({
        id: 10,
        status: LeaveStatus.APPROVED_BY_MANAGER,
        approvedByManagerId: 5,
      });

      const result = await service.approveLeaveRequestManager(5, 10);
      expect(result.status).toBe(LeaveStatus.APPROVED_BY_MANAGER);
    });

    it('throws ForbiddenException when user is NOT the direct manager', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({
        id: 10,
        status: LeaveStatus.PENDING,
        employee: { managerId: 5 },
      });

      await expect(service.approveLeaveRequestManager(99, 10)).rejects.toMatchObject({
        status: 403,
      });
    });

    it('throws BadRequestException when request is not PENDING', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({
        id: 10,
        status: LeaveStatus.APPROVED_BY_MANAGER,
        employee: { managerId: 5 },
      });

      await expect(service.approveLeaveRequestManager(5, 10)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe('approveLeaveRequestHRManager', () => {
    it('approves leave request when status is APPROVED_BY_MANAGER', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({
        id: 10,
        status: LeaveStatus.APPROVED_BY_MANAGER,
      });
      prisma.leaveRequest.update.mockResolvedValue({
        id: 10,
        status: LeaveStatus.APPROVED_BY_HR,
        approvedByHrId: 2,
      });

      const result = await service.approveLeaveRequestHRManager(2, 10);
      expect(result.status).toBe(LeaveStatus.APPROVED_BY_HR);
    });

    it('throws BadRequestException when status is not APPROVED_BY_MANAGER', async () => {
      prisma.leaveRequest.findUnique.mockResolvedValue({
        id: 10,
        status: LeaveStatus.PENDING,
      });

      await expect(service.approveLeaveRequestHRManager(2, 10)).rejects.toMatchObject({
        status: 400,
      });
    });
  });
});
