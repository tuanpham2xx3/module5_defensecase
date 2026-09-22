import { Module } from '@nestjs/common';

import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { ProfileController } from './profile.controller';

@Module({
  controllers: [EmployeesController, ProfileController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
