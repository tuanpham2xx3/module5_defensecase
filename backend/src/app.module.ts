import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from './common/core.module.js';
import { validateEnvironment } from './config/environment.validation.js';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    CoreModule,
    PrismaModule,
    AuthModule,
    EmployeesModule,
  ],
})
export class AppModule {}
