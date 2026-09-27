import { validateEnvironment } from './environment.validation.js';

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/hrm_db?schema=public',
  JWT_ACCESS_SECRET: 'a-secure-access-secret-with-32-characters',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  CORS_ORIGINS: 'http://localhost:3001',
};

describe('validateEnvironment', () => {
  it('normalizes a valid environment', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: 'test',
      PORT: 3000,
      DATABASE_URL: validEnvironment.DATABASE_URL,
      JWT_ACCESS_SECRET: validEnvironment.JWT_ACCESS_SECRET,
    });
  });

  it('rejects a missing database URL', () => {
    expect(() => validateEnvironment({ ...validEnvironment, DATABASE_URL: '' }))
      .toThrow('DATABASE_URL is required');
  });

  it('rejects a weak JWT access secret', () => {
    expect(() => validateEnvironment({ ...validEnvironment, JWT_ACCESS_SECRET: 'short' }))
      .toThrow('JWT_ACCESS_SECRET must contain at least 32 characters');
  });
});
