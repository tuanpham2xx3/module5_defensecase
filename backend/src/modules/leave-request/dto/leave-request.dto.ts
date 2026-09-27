import { LeaveType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class LeaveRequestDto {
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @IsEnum(LeaveType)
  type!: LeaveType;

  @IsString()
  @IsOptional()
  reason?: string;
}
