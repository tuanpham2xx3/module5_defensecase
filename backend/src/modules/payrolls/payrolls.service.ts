import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { PayrollProcessDto } from "./dto/payroll-process.dto.js";
import { EmployeeStatus, LeaveStatus, Prisma } from "@prisma/client";
import { AdminPayrollQuery, PayrollQuery } from "./dto/payroll-filter.query.js";
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

@Injectable()
export class PayrollsService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateLeaveDays(
    leaveStart: Date,
    periodStart: Date,
    leaveEnd: Date,
    periodEnd: Date,
  ): number {
    const start = Math.max(
      new Date(leaveStart).getTime(),
      new Date(periodStart).getTime(),
    );

    const end = Math.min(
      new Date(leaveEnd).getTime(),
      new Date(periodEnd).getTime(),
    );

    if (end < start) return 0;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    return Math.floor((end - start) / ONE_DAY_MS) + 1;
  }

  async createPayroll(dto: PayrollProcessDto, actor?: JwtPayload) {
    if (new Date(dto.pay_period_start) > new Date(dto.pay_period_end)) {
      throw new BadRequestException(
        "Ngày bắt đầu kỳ lương không được lớn hơn ngày kết thúc!",
      );
    }

    /**
     * 1. Lấy toàn bộ nhân viên đang hoạt động
     * 2. Tự động tính toán số ngày nghỉ phép KHÔNG HỢP LỆ:
     * - Nghỉ phép vượt quá số ngày được phép
     * - Đơn phép không được duyệt cấp cuối với hr manager
     * 3. Cột total_salary được tự sinh từ db với công thức:
     * (base_salary + bonuses - deductions)
     */

    const activeEmployeeList = await this.prisma.employee.findMany({
      where: {
        status: EmployeeStatus.ACTIVE,
      },
      include: {
        jobTitle: true,
        leaveRequests: {
          where: {
            startDate: { lte: dto.pay_period_end },
            endDate: { gte: dto.pay_period_start },
          },
        },
      },
    });

    return this.prisma.$transaction(async (tx) => {
      if (actor?.sub) await tx.$executeRaw`SELECT set_config('app.current_user_id', ${actor.sub.toString()}, true);`;
      for (const employee of activeEmployeeList) {
        let unapprovedDays = 0;
        let totalLeavesDays = 0;

        employee.leaveRequests.forEach((request) => {
          const days = this.calculateLeaveDays(
            request.startDate,
            dto.pay_period_start,
            request.endDate,
            dto.pay_period_end,
          );

          if (request.status === LeaveStatus.APPROVED_BY_HR) {
            totalLeavesDays += days;
          } else {
            unapprovedDays += days;
          }
        });

        const maxLeaveDays = Number(process.env.MAXIMUM_LEAVE_DAYS || 2);
        const excessDays = Math.max(0, totalLeavesDays - maxLeaveDays);
        unapprovedDays += excessDays;

        const standardWorkingDays = Number(
          process.env.STANDARD_WORKING_DAYS || 22,
        );
        const baseSalary = Number(employee.jobTitle?.salaryRangeMin || 10000000);
        const deductions = Math.max(
          0,
          (baseSalary / standardWorkingDays) * unapprovedDays,
        );
        const bonuses = 0;
        const totalSalary = Math.max(0, baseSalary + bonuses - deductions);

        const existingPayroll = await tx.payroll.findFirst({
          where: {
            employeeId: employee.id,
            payPeriodStart: new Date(dto.pay_period_start),
            payPeriodEnd: new Date(dto.pay_period_end),
          },
        });

        if (existingPayroll) {
          await tx.payroll.update({
            where: { id: existingPayroll.id },
            data: {
              baseSalary,
              bonuses,
              deductions,
              totalSalary,
            },
          });
        } else {
          await tx.payroll.create({
            data: {
              employeeId: employee.id,
              baseSalary,
              bonuses,
              deductions,
              totalSalary,
              payPeriodStart: dto.pay_period_start,
              payPeriodEnd: dto.pay_period_end,
            },
          });
        }
      }

      return {
        message: "Xử lý bảng lương thành công",
        processedEmployees: activeEmployeeList.length,
      };
    });
  }

  async getPayroll(user: any, query: PayrollQuery) {
    const employeeId = user.sub ?? user.id;
    const employee = await this.prisma.employee.findUnique({
      where: {
        id: employeeId,
      },
    });

    if (!employee) {
      throw new NotFoundException("Không tìm thấy thông tin nhân viên!");
    }

    const where: Prisma.PayrollWhereInput = {
      employeeId: employee.id,
    };

    if (query.pay_period_start || query.pay_period_end) {
      where.payPeriodStart = {
        ...(query.pay_period_start
          ? { gte: new Date(query.pay_period_start) }
          : {}),
        ...(query.pay_period_end
          ? { lte: new Date(query.pay_period_end) }
          : {}),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { payPeriodStart: "desc" },
      }),
      this.prisma.payroll.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      meta: { page, limit, total, totalPages },
    };
  }

  async getAllPayrolls(query: AdminPayrollQuery) {
    const where: Prisma.PayrollWhereInput = {};

    if (query.employeeName) {
      const search = query.employeeName.trim();

      where.employee = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.pay_period_start || query.pay_period_end) {
      where.payPeriodStart = {
        ...(query.pay_period_start
          ? { gte: new Date(query.pay_period_start) }
          : {}),
        ...(query.pay_period_end
          ? { lte: new Date(query.pay_period_end) }
          : {}),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.payroll.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items,
      meta: { page, limit, total, totalPages },
    };
  }
}
