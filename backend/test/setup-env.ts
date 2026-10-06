process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgresql://test:test@127.0.0.1:5440/ticket_test';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long_xx';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_characters_xx';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
delete process.env.RESEND_API_KEY;
