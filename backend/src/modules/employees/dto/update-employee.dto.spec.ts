import { getMetadataStorage } from 'class-validator';

import { CreateEmployeeDto } from './create-employee.dto.js';
import { UpdateEmployeeDto } from './update-employee.dto.js';

describe('UpdateEmployeeDto', () => {
  it('inherits CreateEmployeeDto through PartialType', () => {
    const properties = getMetadataStorage()
      .getTargetValidationMetadatas(UpdateEmployeeDto, '', false, false)
      .map((metadata) => metadata.propertyName);

    expect(UpdateEmployeeDto.prototype).not.toBe(CreateEmployeeDto.prototype);
    expect(properties).toEqual(expect.arrayContaining(['firstName', 'lastName', 'email', 'password']));
  });
});
