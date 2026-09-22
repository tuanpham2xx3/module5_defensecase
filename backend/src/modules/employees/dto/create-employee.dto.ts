import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';

import { Role } from '../../../common/constants/role.enum';

export class CreateEmployeeDto {
  @IsString()
  @Length(1, 50)
  firstName!: string;

  @IsString()
  @Length(1, 50)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: 'Mật khẩu phải có chữ cái và chữ số' })
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsInt()
  jobTitleId?: number;

  @IsOptional()
  @IsInt()
  managerId?: number;
}
