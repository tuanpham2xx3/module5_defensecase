import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Role } from '../../common/constants/role.enum';
import { Department } from './department.entity';
import { JobTitle } from './job-title.entity';

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'first_name', length: 50 })
  firstName!: string;

  @Column({ name: 'last_name', length: 50 })
  lastName!: string;

  @Column({ length: 150, unique: true })
  email!: string;

  @Column({ length: 255 })
  password!: string;

  @Column({ type: 'enum', enum: Role, enumName: 'employee_role_enum', default: Role.USER })
  role!: Role;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId!: number | null;

  @ManyToOne(() => Department, (department) => department.employees, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @Column({ name: 'job_title_id', type: 'int', nullable: true })
  jobTitleId!: number | null;

  @ManyToOne(() => JobTitle, (jobTitle) => jobTitle.employees, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'job_title_id' })
  jobTitle!: JobTitle | null;

  @Column({ name: 'manager_id', type: 'int', nullable: true })
  managerId!: number | null;

  @ManyToOne(() => Employee, (employee) => employee.directReports, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'manager_id' })
  manager!: Employee | null;

  @OneToMany(() => Employee, (employee) => employee.manager)
  directReports!: Employee[];

  @Column({ type: 'enum', enum: EmployeeStatus, enumName: 'employee_status_enum', default: EmployeeStatus.ACTIVE })
  status!: EmployeeStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
