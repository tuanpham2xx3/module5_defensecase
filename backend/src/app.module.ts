import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from './common/core.module.js';
import { validateEnvironment } from './config/environment.validation.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';
import { LeaveRequestModule } from './modules/leave-request/leave-request.module.js';
import { PayrollsModule } from './modules/payrolls/payrolls.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    CoreModule,
    PrismaModule,
    AuthModule,
    EmployeesModule,
    LeaveRequestModule,
    PayrollsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
