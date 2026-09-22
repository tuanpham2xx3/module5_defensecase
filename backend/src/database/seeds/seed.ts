import 'dotenv/config';

import { PrismaClient, Role, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password@123';

export async function seed(): Promise<void> {
  const department = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: { budget: 100000000, location: 'Hanoi' },
    create: { name: 'Engineering', budget: 100000000, location: 'Hanoi' },
  });
  const jobTitle = await prisma.jobTitle.upsert({
    where: { title: 'Software Engineer' },
    update: { salaryRangeMin: 10000000, salaryRangeMax: 60000000 },
    create: { title: 'Software Engineer', salaryRangeMin: 10000000, salaryRangeMax: 60000000 },
  });
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  await upsertEmployee({
    firstName: 'System', lastName: 'Admin', email: 'admin@hrm.local', role: Role.ADMIN,
    departmentId: department.id, jobTitleId: jobTitle.id,
  }, password);
  await upsertEmployee({
    firstName: 'Human', lastName: 'Resources', email: 'hr@hrm.local', role: Role.HR_MANAGER,
    departmentId: department.id, jobTitleId: jobTitle.id,
  }, password);
  const manager = await upsertEmployee({
    firstName: 'Team', lastName: 'Manager', email: 'manager@hrm.local', role: Role.MANAGER,
    departmentId: department.id, jobTitleId: jobTitle.id,
  }, password);
  await upsertEmployee({
    firstName: 'Demo', lastName: 'User', email: 'user@hrm.local', role: Role.USER,
    departmentId: department.id, jobTitleId: jobTitle.id, managerId: manager.id,
  }, password);
}

async function upsertEmployee(
  input: {
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    departmentId: number;
    jobTitleId: number;
    managerId?: number;
  },
  password: string,
) {
  return prisma.employee.upsert({
    where: { email: input.email },
    update: { ...input, password, status: EmployeeStatus.ACTIVE },
    create: { ...input, password, status: EmployeeStatus.ACTIVE },
  });
}

if (require.main === module) {
  seed()
    .finally(() => prisma.$disconnect())
    .catch(() => process.exitCode = 1);
}
