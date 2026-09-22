import { Employee } from '../../database/entities/employee.entity';

export function toPublicEmployee(employee: Employee): Record<string, unknown> {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    role: employee.role,
    status: employee.status,
    departmentId: employee.departmentId,
    jobTitleId: employee.jobTitleId,
    managerId: employee.managerId,
    department: employee.department
      ? { id: employee.department.id, name: employee.department.name, location: employee.department.location }
      : null,
    jobTitle: employee.jobTitle
      ? { id: employee.jobTitle.id, title: employee.jobTitle.title }
      : null,
    manager: employee.manager
      ? {
          id: employee.manager.id,
          firstName: employee.manager.firstName,
          lastName: employee.manager.lastName,
          email: employee.manager.email,
          role: employee.manager.role,
          status: employee.manager.status,
        }
      : null,
    createdAt: employee.createdAt,
  };
}
