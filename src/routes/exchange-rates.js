/**
 * Exchange Rate Routes
 * REST API endpoints for USD exchange rate queries
 */

import { Router } from 'express';
import dayjs from 'dayjs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { isValidDateFormat } from '../utils/helpers.js';
import {
  getUSDCurrencyCode,
  getExchangeRateByDate,
  getLatestUSDExchangeRate,
} from '../services/bcu-service.js';

const router = Router();

/**
 * GET /usd-rate?date=YYYY-MM-DD
 * Get USD exchange rate for a specific date
 */
router.get('/usd-rate', async (req, res) => {
  try {
    const dateParam = req.query.date;

    // Validate required date parameter
    if (!dateParam) {
      return res.status(400).json({
        error: 'Missing required parameter: date (format: YYYY-MM-DD)',
        example: '/usd-rate?date=2025-08-28',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date format
    if (!isValidDateFormat(dateParam)) {
      return res.status(400).json({
        error: 'Invalid date format. Please use YYYY-MM-DD',
        provided: dateParam,
        example: '/usd-rate?date=2025-08-28',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date is parseable
    const date = dayjs(dateParam, 'YYYY-MM-DD', true);
    if (!date.isValid()) {
      return res.status(400).json({
        error: 'Invalid date. Please provide a valid date in YYYY-MM-DD format',
        provided: dateParam,
        timestamp: new Date().toISOString(),
      });
    }

    const dateISO = date.format('YYYY-MM-DD');
    logger.debug(`Requesting exchange rate for date: ${dateISO}`);

    // Get currency code and exchange rate
    const { code, name } = await getUSDCurrencyCode();
    const exchangeRate = await getExchangeRateByDate(code, dateISO);

    // Handle case where no data is available
    if (!exchangeRate) {
      return res.status(404).json({
        error:
          'No exchange rate available for the specified date (may be holiday, weekend, or outside available range)',
        currency: name,
        date: dateISO,
        suggestion: 'Try /usd-rate/latest for the most recent available rate',
        timestamp: new Date().toISOString(),
      });
    }

    // Return successful response
    return res.json({
      currency: name,
      date: exchangeRate.date,
      isoCode: exchangeRate.isoCode,
      issuer: exchangeRate.issuer,
      buyRate: exchangeRate.buyRate,
      sellRate: exchangeRate.sellRate,
      source: 'Central Bank of Uruguay - Exchange Rates Web Services',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in /usd-rate endpoint', error);

    // Return different error details based on environment
    const isDevelopment = config.server.env === 'development';
    return res.status(500).json({
      error:
        'Internal server error while querying BCU web service. Please verify connectivity and service availability.',
      ...(isDevelopment && { details: error.message }),
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /usd-rate/latest
 * Get the latest available USD exchange rate
 */
router.get('/usd-rate/latest', async (req, res) => {
  try {
    logger.debug('Requesting latest exchange rate');

    // Get currency code and latest exchange rate
    const { code, name } = await getUSDCurrencyCode();
    const exchangeRate = await getLatestUSDExchangeRate(code);

    // Handle case where no recent data is available
    if (!exchangeRate) {
      return res.status(404).json({
        error: 'Unable to determine the latest exchange rate',
        currency: name,
        suggestion:
          'BCU service may be temporarily unavailable or no recent data exists',
        timestamp: new Date().toISOString(),
      });
    }

    // Return successful response
    return res.json({
      currency: name,
      date: exchangeRate.date,
      isoCode: exchangeRate.isoCode,
      issuer: exchangeRate.issuer,
      buyRate: exchangeRate.buyRate,
      sellRate: exchangeRate.sellRate,
      source:
        'Central Bank of Uruguay - Exchange Rates Web Services (Latest Closing)',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in /usd-rate/latest endpoint', error);

    // Return different error details based on environment
    const isDevelopment = config.server.env === 'development';
    return res.status(500).json({
      error: 'Internal server error while querying latest exchange rate',
      ...(isDevelopment && { details: error.message }),
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
