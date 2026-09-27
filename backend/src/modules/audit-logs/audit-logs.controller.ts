import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';

@Controller('audit-logs')
@Roles(Role.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}
