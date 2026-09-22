import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('registers authentication and role guards as global APP_GUARD providers', () => {
    const providers = Reflect.getMetadata('providers', AuthModule) as Array<{ provide?: unknown }>;

    expect(providers.filter((provider) => provider.provide === APP_GUARD)).toHaveLength(2);
  });
});
