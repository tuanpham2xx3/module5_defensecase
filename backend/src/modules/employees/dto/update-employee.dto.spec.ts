import { getMetadataStorage } from 'class-validator';

import { CreateEmployeeDto } from './create-employee.dto';
import { UpdateEmployeeDto } from './update-employee.dto';

describe('UpdateEmployeeDto', () => {
  it('inherits CreateEmployeeDto through PartialType', () => {
    const properties = getMetadataStorage()
      .getTargetValidationMetadatas(UpdateEmployeeDto, '', false, false)
      .map((metadata) => metadata.propertyName);

    expect(UpdateEmployeeDto.prototype).not.toBe(CreateEmployeeDto.prototype);
    expect(properties).toEqual(expect.arrayContaining(['firstName', 'lastName', 'email', 'password']));
  });
});
