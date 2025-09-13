/**
 * Express Middleware
 * Common middleware functions for the application
 */

import express from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * CORS Middleware
 * Enable Cross-Origin Resource Sharing for all routes
 */
export const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
};

/**
 * Request Logging Middleware
 * Log incoming requests (only in development)
 */
export const requestLoggingMiddleware = (req, res, next) => {
  if (config.server.env === 'development') {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(
        `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
      );
    });
  }

  next();
};

/**
 * JSON Parser Middleware
 * Parse JSON bodies with error handling
 */
export const jsonParserMiddleware = express.json({
  limit: '10mb',
  type: 'application/json',
});

/**
 * Error Handler Middleware
 * Global error handling for unhandled errors
 */
export const errorHandlerMiddleware = (error, req, res, _next) => {
  logger.error('Unhandled application error', error);

  // Don't send error details in production
  const isDevelopment = config.server.env === 'development';

  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && {
      details: error.message,
      stack: error.stack,
    }),
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 Not Found Middleware
 * Handle requests to non-existent endpoints
 */
export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /usd-rate?date=YYYY-MM-DD',
      'GET /usd-rate/latest',
    ],
    timestamp: new Date().toISOString(),
  });
};
