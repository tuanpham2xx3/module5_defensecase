import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { PayrollsService } from "./payrolls.service.js";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { Role } from "@prisma/client";
import { PayrollProcessDto } from "./dto/payroll-process.dto.js";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { AdminPayrollQuery, PayrollQuery } from "./dto/payroll-filter.query.js";

@ApiTags("Payrolls")
@ApiBearerAuth()
@Controller("payrolls")
export class PayrollsController {
  constructor(private readonly payrollsService: PayrollsService) {}

  @Roles(Role.HR_MANAGER)
  @Post("/process")
  createPayroll(@CurrentUser() user: any, @Body() dto: PayrollProcessDto) {
    return this.payrollsService.createPayroll(dto, user);
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
