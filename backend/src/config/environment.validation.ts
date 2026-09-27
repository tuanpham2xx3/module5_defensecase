export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGINS: string;
}

function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function duration(config: Record<string, unknown>, key: string, fallback: string): string {
  const value = typeof config[key] === 'string' ? config[key].trim() : fallback;
  if (!/^\d+[smhd]$/.test(value)) {
    throw new Error(`${key} must use a duration such as 15m, 12h, or 7d`);
  }
  return value;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const databaseUrl = requiredString(config, 'DATABASE_URL');
  const jwtAccessSecret = requiredString(config, 'JWT_ACCESS_SECRET');
  if (jwtAccessSecret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    NODE_ENV: typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development',
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_ACCESS_EXPIRES_IN: duration(config, 'JWT_ACCESS_EXPIRES_IN', '15m'),
    JWT_REFRESH_EXPIRES_IN: duration(config, 'JWT_REFRESH_EXPIRES_IN', '7d'),
    CORS_ORIGINS: typeof config.CORS_ORIGINS === 'string' ? config.CORS_ORIGINS : '',
  };
}
