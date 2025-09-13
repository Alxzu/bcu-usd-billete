/**
 * Main Application Entry Point
 * BCU USD Exchange Rate API
 *
 * @version 2.0.0
 * @author BCU USD API Team
 * @license MIT
 */

import express from 'express';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import {
  corsMiddleware,
  requestLoggingMiddleware,
  jsonParserMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware,
} from './middleware/index.js';

// Route imports
import healthRoutes from './routes/health.js';
import exchangeRateRoutes from './routes/exchange-rates.js';
import legacyRoutes from './routes/legacy.js';

/**
 * Create and configure Express application
 * @returns {express.Application} Configured Express app
 */
export function createApp() {
  const app = express();

  // Trust proxy for accurate client IP detection
  app.set('trust proxy', 1);

  // Apply global middleware
  app.use(corsMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(jsonParserMiddleware);

  // Mount route handlers
  app.use('/', healthRoutes);
  app.use('/', exchangeRateRoutes);
  app.use('/', legacyRoutes);

  // Apply error handling middleware (must be last)
  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}

/**
 * Start the server
 * @param {express.Application} app - Express application
 * @returns {Promise<http.Server>} Running server instance
 */
export function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(config.server.port, error => {
      if (error) {
        logger.error('Failed to start server', error);
        return reject(error);
      }

      logger.info(
        `${config.app.name} v${config.app.version} listening on http://localhost:${config.server.port}`
      );
      logger.info(`Environment: ${config.server.env}`);
      logger.info('Available endpoints:');
      logger.info('  GET /health');
      logger.info('  GET /health/detailed');
      logger.info('  GET /usd-rate?date=YYYY-MM-DD');
      logger.info('  GET /usd-rate/latest');
      logger.info('Legacy endpoints (deprecated):');
      logger.info(
        '  GET /usd-billete?date=YYYY-MM-DD → redirects to /usd-rate'
      );
      logger.info('  GET /usd-billete/latest → redirects to /usd-rate/latest');

      resolve(server);
    });

    // Handle server errors
    server.on('error', error => {
      if (error.code === 'EADDRINUSE') {
        logger.error(
          `Port ${config.server.port} is already in use. Try setting PORT environment variable to a different port.`
        );
      } else {
        logger.error('Server error', error);
      }
      reject(error);
    });
  });
}

/**
 * Graceful shutdown handler
 * @param {http.Server} server - Server instance to shut down
 */
export function setupGracefulShutdown(server) {
  const shutdown = signal => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    server.close(error => {
      if (error) {
        logger.error('Error during server shutdown', error);
        process.exit(1);
      }

      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions and rejections
  process.on('uncaughtException', error => {
    logger.error('Uncaught Exception', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

/**
 * Main application bootstrap function
 * @returns {Promise<http.Server>} Running server instance
 */
export async function bootstrap() {
  try {
    // Create Express application
    const app = createApp();

    // Start the server
    const server = await startServer(app);

    // Setup graceful shutdown
    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error('Failed to start application', error);
    throw error;
  }
}

/**
 * Start the application if this file is run directly
 * This allows both programmatic usage (import) and direct execution (node src/index.js)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap().catch(error => {
    logger.error('Application startup failed', error);
    process.exit(1);
  });
}
