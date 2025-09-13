/**
 * Helper Utilities
 * Common utility functions used across the application
 */

/**
 * Normalize strings for comparison by removing diacritics and converting to uppercase
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export const normalizeString = str =>
  (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid format
 */
export const isValidDateFormat = dateString => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateString);
};

/**
 * Create standardized API error response
 * @param {string} message - Error message
 * @param {Object} additional - Additional error data
 * @returns {Object} Error response object
 */
export const createErrorResponse = (message, additional = {}) => ({
  error: message,
  timestamp: new Date().toISOString(),
  ...additional,
});

/**
 * Create standardized API success response
 * @param {Object} data - Response data
 * @param {Object} meta - Additional metadata
 * @returns {Object} Success response object
 */
export const createSuccessResponse = (data, meta = {}) => ({
  ...data,
  ...meta,
  timestamp: new Date().toISOString(),
});
