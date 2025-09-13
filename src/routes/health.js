/**
 * Health Check Routes
 * System health and status endpoints
 */

import { Router } from 'express';
import { config } from '../config/index.js';

const router = Router();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: config.app.name,
    version: config.app.version,
    environment: config.server.env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used:
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      total:
        Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
    },
  });
});

/**
 * GET /health/detailed
 * Detailed health check with system information
 */
router.get('/health/detailed', (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: 'OK',
    service: config.app.name,
    version: config.app.version,
    environment: config.server.env,
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
    },
    memory: {
      rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
    },
    services: {
      bcuExchangeRates: config.bcu.wsdl.exchangeRates,
      bcuCurrencies: config.bcu.wsdl.currencies,
      bcuLastClosing: config.bcu.wsdl.lastClosing,
    },
  });
});

export default router;
