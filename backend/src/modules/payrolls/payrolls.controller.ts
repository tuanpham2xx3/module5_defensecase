import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { PayrollsService } from "./payrolls.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { PayrollProcessDto } from "./dto/payroll-process.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AdminPayrollQuery, PayrollQuery } from "./dto/payroll-filter.query";

@ApiTags("Payrolls")
@ApiBearerAuth()
@Controller("payrolls")
export class PayrollsController {
  constructor(private readonly payrollsService: PayrollsService) {}

  @Roles(Role.HR_MANAGER)
  @Post("/process")
  createPayroll(@Body() dto: PayrollProcessDto) {
    return this.payrollsService.createPayroll(dto);
  }

  @Get("/me")
  getPayroll(@CurrentUser() user: any, @Query() query: PayrollQuery) {
    return this.payrollsService.getPayroll(user, query);
  }

  @Roles(Role.HR_MANAGER, Role.ADMIN)
  @Get()
  getAllPayrolls(@Query() query: AdminPayrollQuery) {
    return this.payrollsService.getAllPayrolls(query);
  }
}
