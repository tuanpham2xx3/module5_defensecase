import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    example: '2026-10-01',
    description: 'Leave start date (YYYY-MM-DD or ISO 8601)',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty({
    example: '2026-10-05',
    description: 'Leave end date (must be >= startDate)',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiProperty({
    enum: LeaveType,
    example: LeaveType.VACATION,
    description: 'Type of leave (SICK, CASUAL, VACATION)',
  })
  @IsEnum(LeaveType)
  type!: LeaveType;

  @ApiPropertyOptional({
    example: 'Annual family vacation trip',
    description: 'Reason for requesting leave',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
