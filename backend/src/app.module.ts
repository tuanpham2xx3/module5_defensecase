import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Department } from './database/entities/department.entity';
import { Employee } from './database/entities/employee.entity';
import { JobTitle } from './database/entities/job-title.entity';
import { RefreshToken } from './database/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'hrm_user'),
        password: configService.get<string>('DB_PASSWORD', 'hrm_password'),
        database: configService.get<string>('DB_NAME', 'hrm_db'),
        entities: [Employee, Department, JobTitle, RefreshToken],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: false,
      }),
    }),
  ],
})
export class AppModule {}
