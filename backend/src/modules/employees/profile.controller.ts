import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';
import { EmployeesService } from './employees.service.js';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller()
export class ProfileController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.employeesService.getProfile(user.sub);
  }
}
