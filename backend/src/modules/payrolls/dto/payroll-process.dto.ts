import { Type } from "class-transformer";
import { IsDate, IsNotEmpty } from "class-validator";

export class PayrollProcessDto {
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  pay_period_start: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  pay_period_end: Date;
}
