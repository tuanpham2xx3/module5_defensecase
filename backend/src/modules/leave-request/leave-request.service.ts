import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus, Prisma, Role } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { LeaveQueryDto } from './dto/leave-query.dto.js';
import { LeaveRequestDto } from './dto/leave-request.dto.js';

@Injectable()
export class LeaveRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createLeaveRequest(userId: number, dto: LeaveRequestDto, actor?: JwtPayload) {
    const employee = await this.prisma.employee.findUnique({
      where: {
        id: userId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Không tìm thấy thông tin nhân viên');
    }

    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.setAuditActor(tx, actor);
      return tx.leaveRequest.create({ data: {
        employeeId: userId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        type: dto.type,
        reason: dto.reason,
      } });
    });
  }

  async approveLeaveRequestManager(userId: number, id: number, actor?: JwtPayload) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: {
        id,
      },
      include: {
        employee: {
          select: {
            managerId: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Không tìm thấy đơn nghỉ phép');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Đơn nghỉ phép này đã được xử lý trước đó');
    }

    if (userId !== leaveRequest.employee.managerId) {
      throw new ForbiddenException('Bạn không phải là quản lý trực tiếp của nhân viên này');
    }

    return this.prisma.$transaction(async (tx) => { await this.setAuditActor(tx, actor); return tx.leaveRequest.update({
      where: {
        id,
      },
      data: {
        status: LeaveStatus.APPROVED_BY_MANAGER,
        approvedByManagerId: userId,
      },
    }); });
  }

  async rejectLeaveRequestManager(userId: number, id: number, actor?: JwtPayload) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: {
        id,
      },
      include: {
        employee: {
          select: {
            managerId: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Không tìm thấy đơn nghỉ phép');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Đơn nghỉ phép này đã được xử lý trước đó');
    }

    if (userId !== leaveRequest.employee.managerId) {
      throw new ForbiddenException('Bạn không phải là quản lý trực tiếp của nhân viên này');
    }

    return this.prisma.$transaction(async (tx) => { await this.setAuditActor(tx, actor); return tx.leaveRequest.update({
      where: {
        id,
      },
      data: {
        status: LeaveStatus.REJECTED,
        approvedByManagerId: userId,
      },
    }); });
  }

  async approveLeaveRequestHRManager(userId: number, id: number, actor?: JwtPayload) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: {
        id,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Không tìm thấy đơn nghỉ phép');
    }

    if (leaveRequest.status !== LeaveStatus.APPROVED_BY_MANAGER) {
      throw new BadRequestException('Đơn nghỉ phép cần được Quản lý trực tiếp phê duyệt trước');
    }

    return this.prisma.$transaction(async (tx) => { await this.setAuditActor(tx, actor); return tx.leaveRequest.update({
      where: {
        id,
      },
      data: {
        status: LeaveStatus.APPROVED_BY_HR,
        approvedByHrId: userId,
      },
    }); });
  }

  async rejectLeaveRequestHRManager(userId: number, id: number, actor?: JwtPayload) {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: {
        id,
      },
    });

    if (!leaveRequest) {
      throw new NotFoundException('Không tìm thấy đơn nghỉ phép');
    }

    if (
      leaveRequest.status !== LeaveStatus.PENDING &&
      leaveRequest.status !== LeaveStatus.APPROVED_BY_MANAGER
    ) {
      throw new BadRequestException('Đơn nghỉ phép này đã được xử lý trước đó');
    }

    return this.prisma.$transaction(async (tx) => { await this.setAuditActor(tx, actor); return tx.leaveRequest.update({
      where: {
        id,
      },
      data: {
        status: LeaveStatus.REJECTED,
        approvedByHrId: userId,
      },
    }); });
  }

  private async setAuditActor(tx: any, actor?: JwtPayload): Promise<void> {
    if (actor?.sub) await tx.$executeRaw`SELECT set_config('app.current_user_id', ${actor.sub.toString()}, true);`;
  }

  async getMyLeaveRequests(userId: number, query: LeaveQueryDto) {
    const where: Prisma.LeaveRequestWhereInput = {
      employeeId: userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.startDate = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      meta: { page, limit, total, totalPages },
    };
  }

  async getLeaveRequests(user: JwtPayload, query: LeaveQueryDto) {
    const where: Prisma.LeaveRequestWhereInput = {};

    // Phân quyền theo vai trò: MANAGER chỉ xem cấp dưới, HR/ADMIN xem toàn công ty
    if (user.role === Role.MANAGER) {
      where.employee = {
        managerId: user.sub,
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.startDate = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      meta: { page, limit, total, totalPages },
    };
  }
}
