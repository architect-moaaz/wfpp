/**
 * Application Configuration
 */

module.exports = {
  server: {
    port: process.env.PORT || 4000,
    env: process.env.NODE_ENV || 'development'
  },

  database: {
    enabled: process.env.DB_ENABLED === 'true',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },

  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  },

  kafka: {
    enabled: process.env.KAFKA_ENABLED === 'true',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },

  app: {
    name: process.env.APP_NAME || 'eager_hawk',
    version: process.env.APP_VERSION || '1.0.0'
  }
};
