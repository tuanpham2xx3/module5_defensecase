import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { CoreModule } from './common/core.module.js';

describe('AppModule', () => {
  const providers = Reflect.getMetadata('providers', CoreModule) as Array<{ provide?: unknown }>;

  it('imports the global core infrastructure module', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];

    expect(imports).toContain(CoreModule);
  });

  it('registers the response interceptor as a global provider', () => {
    expect(providers.filter((provider) => provider.provide === APP_INTERCEPTOR)).toHaveLength(1);
  });

  it('registers the HTTP exception filter as a global provider', () => {
    expect(providers.filter((provider) => provider.provide === APP_FILTER)).toHaveLength(1);
  });
});
