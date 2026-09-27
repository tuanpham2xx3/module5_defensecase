import type { EmployeeStatus, Role } from '@prisma/client';

export interface EmployeeDepartmentResponse {
  id: number;
  name: string;
  location: string;
}

export interface EmployeeJobTitleResponse {
  id: number;
  title: string;
}

export interface EmployeeManagerResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: EmployeeStatus;
}

export interface EmployeeResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: EmployeeStatus;
  departmentId: number | null;
  jobTitleId: number | null;
  managerId: number | null;
  department: EmployeeDepartmentResponse | null;
  jobTitle: EmployeeJobTitleResponse | null;
  manager: EmployeeManagerResponse | null;
  createdAt: Date;
}
