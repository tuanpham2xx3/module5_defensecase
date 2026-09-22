import { Prisma } from '@prisma/client';

export const employeeInclude = {
  department: true,
  jobTitle: true,
  manager: true,
} satisfies Prisma.EmployeeInclude;

export type EmployeeRecord = Prisma.EmployeeGetPayload<{ include: typeof employeeInclude }>;
export type EmployeeForAuth = Prisma.EmployeeGetPayload<{}>;
