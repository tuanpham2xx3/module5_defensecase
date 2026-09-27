import type { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('refuses to start without a JWT access secret', () => {
    const configService = {
      get: (_key: string, fallback: string) => fallback,
      getOrThrow: (key: string) => {
        throw new Error(`${key} is required`);
      },
    } as unknown as ConfigService;

    expect(() => new JwtStrategy(configService)).toThrow('JWT_ACCESS_SECRET is required');
  });
});
