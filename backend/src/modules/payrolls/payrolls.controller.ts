import { Body, Controller, Get, Post } from "@nestjs/common";
import { PayrollsService } from "./payrolls.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { PayrollProcessDto } from "./dto/payroll-process.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

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

  @Roles(Role.USER)
  @Get("/me")
  getPayroll(@CurrentUser() user: any, @Body() dto: PayrollProcessDto) {
    return this.payrollsService.getPayroll(user, dto);
  }
}
