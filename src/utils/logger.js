/**
 * Logger Utility
 * Environment-aware logging system
 */

import { config } from '../config/index.js';

const isDevelopment = config.server.env === 'development';

export const logger = {
  /**
   * Log informational messages (only in development)
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  info: (message, data = null) => {
    if (isDevelopment) {
      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] [INFO] ${message}`,
        data ? JSON.stringify(data, null, 2) : ''
      );
    }
  },

  /**
   * Log error messages (always shown)
   * @param {string} message - Error message
   * @param {Error|any} error - Error object or additional data
   */
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(
      `[${timestamp}] [ERROR] ${message}`,
      error ? error.stack || error : ''
    );
  },

  /**
   * Log warning messages (always shown)
   * @param {string} message - Warning message
   * @param {any} data - Optional data to log
   */
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.warn(
      `[${timestamp}] [WARN] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    );
  },

  /**
   * Log debug messages (only in development)
   * @param {string} message - Debug message
   * @param {any} data - Optional data to log
   */
  debug: (message, data = null) => {
    if (isDevelopment) {
      const timestamp = new Date().toISOString();
      console.debug(
        `[${timestamp}] [DEBUG] ${message}`,
        data ? JSON.stringify(data, null, 2) : ''
      );
    }
  },
};
