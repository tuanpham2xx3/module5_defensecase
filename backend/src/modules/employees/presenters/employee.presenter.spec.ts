import { Role } from '../../../common/constants/role.enum.js';
import type { EmployeeRecord } from '../../../database/types.js';
import { toPublicEmployee } from './employee.presenter.js';

describe('toPublicEmployee', () => {
  it('returns the public employee shape without the password', () => {
    const employee = {
      id: 7,
      firstName: 'An',
      lastName: 'Nguyen',
      email: 'an@example.com',
      password: 'hashed-secret',
      role: Role.USER,
      status: 'ACTIVE',
      departmentId: 2,
      jobTitleId: 3,
      managerId: null,
      department: { id: 2, name: 'Engineering', location: 'Ha Noi' },
      jobTitle: { id: 3, title: 'Backend Developer' },
      manager: null,
      createdAt: new Date('2026-09-28T10:00:00.000Z'),
    } as unknown as EmployeeRecord;

    expect(toPublicEmployee(employee)).toEqual({
      id: 7,
      firstName: 'An',
      lastName: 'Nguyen',
      email: 'an@example.com',
      role: Role.USER,
      status: 'ACTIVE',
      departmentId: 2,
      jobTitleId: 3,
      managerId: null,
      department: { id: 2, name: 'Engineering', location: 'Ha Noi' },
      jobTitle: { id: 3, title: 'Backend Developer' },
      manager: null,
      createdAt: new Date('2026-09-28T10:00:00.000Z'),
    });
  });
});
