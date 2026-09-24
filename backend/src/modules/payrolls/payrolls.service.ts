import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { PayrollProcessDto } from "./dto/payroll-process.dto";
import { EmployeeStatus, LeaveStatus } from "@prisma/client";

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

  async createPayroll(dto: PayrollProcessDto) {
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

      await this.prisma.payroll.create({
        data: {
          employeeId: employee.id,
          baseSalary,
          bonuses: 0,
          deductions,
          payPeriodStart: dto.pay_period_start,
          payPeriodEnd: dto.pay_period_end,
        },
      });
    }

    return {
      message: "Xử lý bảng lương thành công",
      processedEmployees: activeEmployeeList.length,
    };
  }

  async getPayroll(user: any, dto: PayrollProcessDto) {
    const payroll = await this.prisma.payroll.findMany();
  }
}
