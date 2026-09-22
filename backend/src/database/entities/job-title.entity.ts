import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from './employee.entity';

@Entity('job_titles')
export class JobTitle {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, unique: true })
  title!: string;

  @Column({ name: 'salary_range_min', type: 'numeric', precision: 10, scale: 2 })
  salaryRangeMin!: string;

  @Column({ name: 'salary_range_max', type: 'numeric', precision: 10, scale: 2 })
  salaryRangeMax!: string;

  @OneToMany(() => Employee, (employee) => employee.jobTitle)
  employees!: Employee[];
}
