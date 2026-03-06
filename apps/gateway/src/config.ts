import 'dotenv/config';

const required = (name: string, fallback?: string) => {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env ${name}`);
  }
  return value;
};

export const config = {
  port: Number(required('PORT', '8080')),
  authSecret: required('AUTH_SECRET'),
  protocolVersion: required('PROTOCOL_VERSION', '0.1.0'),
  redisUrl: required('REDIS_URL', 'redis://127.0.0.1:6379'),
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'
};
