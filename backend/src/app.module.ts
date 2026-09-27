import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './database/prisma.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { LeaveRequestModule } from './modules/leave-request/leave-request.module';
import { PayrollsModule } from './modules/payrolls/payrolls.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    LeaveRequestModule,
    PayrollsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
