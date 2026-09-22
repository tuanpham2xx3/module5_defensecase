import 'dotenv/config';

import * as bcrypt from 'bcrypt';

import dataSource from '../data-source';
import { Department } from '../entities/department.entity';
import { Employee, EmployeeStatus } from '../entities/employee.entity';
import { JobTitle } from '../entities/job-title.entity';
import { Role } from '../../common/constants/role.enum';

const DEMO_PASSWORD = 'Password@123';

export async function seed(): Promise<void> {
  await dataSource.initialize();
  await dataSource.runMigrations();

  const departments = dataSource.getRepository(Department);
  const jobTitles = dataSource.getRepository(JobTitle);
  const employees = dataSource.getRepository(Employee);

  let department = await departments.findOneBy({ name: 'Engineering' });
  if (!department) {
    department = await departments.save(departments.create({
      name: 'Engineering',
      budget: '100000000',
      location: 'Hanoi',
    }));
  }

  let jobTitle = await jobTitles.findOneBy({ title: 'Software Engineer' });
  if (!jobTitle) {
    jobTitle = await jobTitles.save(jobTitles.create({
      title: 'Software Engineer',
      salaryRangeMin: '10000000',
      salaryRangeMax: '60000000',
    }));
  }

  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const admin = await upsertEmployee(employees, {
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@hrm.local',
    role: Role.ADMIN,
    departmentId: department.id,
    jobTitleId: jobTitle.id,
  }, password);
  const hr = await upsertEmployee(employees, {
    firstName: 'Human',
    lastName: 'Resources',
    email: 'hr@hrm.local',
    role: Role.HR_MANAGER,
    departmentId: department.id,
    jobTitleId: jobTitle.id,
  }, password);
  const manager = await upsertEmployee(employees, {
    firstName: 'Team',
    lastName: 'Manager',
    email: 'manager@hrm.local',
    role: Role.MANAGER,
    departmentId: department.id,
    jobTitleId: jobTitle.id,
  }, password);
  await upsertEmployee(employees, {
    firstName: 'Demo',
    lastName: 'User',
    email: 'user@hrm.local',
    role: Role.USER,
    departmentId: department.id,
    jobTitleId: jobTitle.id,
    managerId: manager.id,
  }, password);

  void admin;
  void hr;
  await dataSource.destroy();
}

async function upsertEmployee(
  repository: ReturnType<typeof dataSource.getRepository<Employee>>,
  input: Pick<Employee, 'firstName' | 'lastName' | 'email' | 'role' | 'departmentId' | 'jobTitleId'> & { managerId?: number },
  password: string,
): Promise<Employee> {
  const existing = await repository.findOneBy({ email: input.email });
  if (existing) {
    Object.assign(existing, input, { password, status: EmployeeStatus.ACTIVE });
    return repository.save(existing);
  }
  return repository.save(repository.create({
    ...input,
    password,
    status: EmployeeStatus.ACTIVE,
    managerId: input.managerId ?? null,
  }));
}

if (require.main === module) {
  void seed();
}
