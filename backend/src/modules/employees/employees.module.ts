import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Department } from '../../database/entities/department.entity';
import { Employee } from '../../database/entities/employee.entity';
import { JobTitle } from '../../database/entities/job-title.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Department, JobTitle])],
  controllers: [EmployeesController, ProfileController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
