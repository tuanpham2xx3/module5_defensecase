process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://user:password@localhost:5432/hrm_test?schema=public';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-with-at-least-32-characters';
process.env.JWT_ACCESS_EXPIRES_IN ??= '15m';
process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
process.env.CORS_ORIGINS ??= 'http://localhost:3001';
process.env.MAXIMUM_LEAVE_DAYS ??= '7';
process.env.STANDARD_WORKING_DAYS ??= '22';
