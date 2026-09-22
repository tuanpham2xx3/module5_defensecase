import 'dotenv/config';

import { DataSource } from 'typeorm';

import { Department } from './entities/department.entity';
import { Employee } from './entities/employee.entity';
import { JobTitle } from './entities/job-title.entity';
import { RefreshToken } from './entities/refresh-token.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'hrm_user',
  password: process.env.DB_PASSWORD ?? 'hrm_password',
  database: process.env.DB_NAME ?? 'hrm_db',
  entities: [Employee, Department, JobTitle, RefreshToken],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
