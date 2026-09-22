import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Employee } from './employee.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100, unique: true })
  name!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  budget!: string;

  @Column({ length: 150 })
  location!: string;

  @OneToMany(() => Employee, (employee) => employee.department)
  employees!: Employee[];
}
