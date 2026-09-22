import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

import { createGlobalValidationPipe } from '../main';

class QueryDto {
  @Type(() => Number)
  @IsInt()
  page!: number;
}

describe('global validation configuration', () => {
  it('rejects unknown properties and transforms primitive query values', async () => {
    const pipe = createGlobalValidationPipe();

    await expect(
      pipe.transform(
        { page: '2', injected: 'admin' },
        { type: 'query', metatype: QueryDto, data: '' },
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ statusCode: 400 }),
    });

    await expect(
      pipe.transform(
        { page: '2' },
        { type: 'query', metatype: QueryDto, data: '' },
      ),
    ).resolves.toEqual({ page: 2 });
  });
});
