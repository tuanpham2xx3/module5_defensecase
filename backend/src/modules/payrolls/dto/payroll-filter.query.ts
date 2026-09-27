import { PayrollStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class PayrollQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  pay_period_start?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  pay_period_end?: Date;
}

export class AdminPayrollQuery extends PayrollQuery {
  @IsOptional()
  @IsString()
  employeeName?: string;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;
}
