import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { LeaveRequestDto } from './dto/leave-request.dto';

@Injectable()
export class LeaveRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async createLeaveRequest(userId: number, dto: LeaveRequestDto) {
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

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: userId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        type: dto.type,
        reason: dto.reason,
      },
    });
  }

  async approveLeaveRequestManager(userId: number, id: number) {
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

    return this.prisma.leaveRequest.update({
      where: {
        id,
      },
      data: {
        status: LeaveStatus.APPROVED_BY_MANAGER,
        approvedByManagerId: userId,
      },
    });
  }

  async approveLeaveRequestHRManager(userId: number, id: number) {
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

    return this.prisma.leaveRequest.update({
      where: {
        id,
      },
      data: {
        status: LeaveStatus.APPROVED_BY_HR,
        approvedByHrId: userId,
      },
    });
  }
}
