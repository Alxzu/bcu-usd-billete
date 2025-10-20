/**
 * Rates Routes (API v2)
 * Multi-currency exchange rate endpoints
 */

import { Router } from 'express';
import dayjs from 'dayjs';
import { logger } from '../utils/logger.js';
import { isValidDateFormat } from '../utils/helpers.js';
import {
  getExchangeRate,
  getLatestExchangeRate,
  getMultipleCurrencyRates,
  getHistoricalRates,
} from '../services/bcu-service.js';
import {
  isValidCurrency,
  getCurrencyBySlug,
  getCurrencySlugs,
} from '../config/currency-map.js';

const router = Router();

/**
 * GET /api/v2/rates/:currency?date=YYYY-MM-DD
 * Get exchange rate for a specific currency and date
 */
router.get('/api/v2/rates/:currency', async (req, res) => {
  try {
    const currencySlug = req.params.currency;
    const dateParam = req.query.date;

    // Validate currency slug
    if (!isValidCurrency(currencySlug)) {
      return res.status(400).json({
        error: `Invalid currency: ${currencySlug}`,
        availableCurrencies: `/api/v2/currencies`,
        suggestion: `Try one of: ${getCurrencySlugs().slice(0, 5).join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate required date parameter
    if (!dateParam) {
      return res.status(400).json({
        error: 'Missing required parameter: date (format: YYYY-MM-DD)',
        example: `/api/v2/rates/${currencySlug}?date=2025-10-15`,
        latestEndpoint: `/api/v2/rates/${currencySlug}/latest`,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date format
    if (!isValidDateFormat(dateParam)) {
      return res.status(400).json({
        error: 'Invalid date format. Please use YYYY-MM-DD',
        provided: dateParam,
        example: `/api/v2/rates/${currencySlug}?date=2025-10-15`,
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
    logger.debug(
      `Requesting exchange rate for ${currencySlug} on date: ${dateISO}`
    );

    // Get exchange rate
    const currencyInfo = getCurrencyBySlug(currencySlug);
    const exchangeRate = await getExchangeRate(currencySlug, dateISO);

    // Handle case where no data is available
    if (!exchangeRate) {
      return res.status(404).json({
        error:
          'No exchange rate available for the specified date (may be holiday, weekend, or outside available range)',
        currency: {
          slug: currencySlug,
          name: currencyInfo.name,
          isoCode: currencyInfo.isoCode,
        },
        date: dateISO,
        suggestion: `/api/v2/rates/${currencySlug}/latest`,
        timestamp: new Date().toISOString(),
      });
    }

    // Return successful response
    return res.json({
      currency: {
        slug: currencySlug,
        code: currencyInfo.code,
        name: exchangeRate.currency,
        isoCode: exchangeRate.isoCode,
        group: currencyInfo.group,
      },
      date: exchangeRate.date,
      rates: {
        buy: exchangeRate.buyRate,
        sell: exchangeRate.sellRate,
      },
      source: 'Banco Central del Uruguay',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error in /api/v2/rates/${req.params.currency} endpoint`, error);

    // Handle invalid currency slug error
    if (error.message.includes('Invalid currency slug')) {
      return res.status(400).json({
        error: error.message,
        availableCurrencies: '/api/v2/currencies',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      error: 'Internal server error while querying BCU web service',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v2/rates/:currency/latest
 * Get the latest available exchange rate for a currency
 */
router.get('/api/v2/rates/:currency/latest', async (req, res) => {
  try {
    const currencySlug = req.params.currency;

    // Validate currency slug
    if (!isValidCurrency(currencySlug)) {
      return res.status(400).json({
        error: `Invalid currency: ${currencySlug}`,
        availableCurrencies: '/api/v2/currencies',
        suggestion: `Try one of: ${getCurrencySlugs().slice(0, 5).join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }

    logger.debug(`Requesting latest exchange rate for ${currencySlug}`);

    // Get latest exchange rate
    const currencyInfo = getCurrencyBySlug(currencySlug);
    const exchangeRate = await getLatestExchangeRate(currencySlug);

    // Handle case where no recent data is available
    if (!exchangeRate) {
      return res.status(404).json({
        error: 'Unable to determine the latest exchange rate',
        currency: {
          slug: currencySlug,
          name: currencyInfo.name,
          isoCode: currencyInfo.isoCode,
        },
        suggestion: 'BCU service may be temporarily unavailable or no recent data exists',
        timestamp: new Date().toISOString(),
      });
    }

    // Return successful response
    return res.json({
      currency: {
        slug: currencySlug,
        code: currencyInfo.code,
        name: exchangeRate.currency,
        isoCode: exchangeRate.isoCode,
        group: currencyInfo.group,
      },
      date: exchangeRate.date,
      rates: {
        buy: exchangeRate.buyRate,
        sell: exchangeRate.sellRate,
      },
      source: 'Banco Central del Uruguay (Latest Closing)',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error in /api/v2/rates/${req.params.currency}/latest endpoint`, error);

    // Handle invalid currency slug error
    if (error.message.includes('Invalid currency slug')) {
      return res.status(400).json({
        error: error.message,
        availableCurrencies: '/api/v2/currencies',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      error: 'Internal server error while querying latest exchange rate',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v2/rates/:currency/history?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Get historical exchange rates for a currency over a date range
 */
router.get('/api/v2/rates/:currency/history', async (req, res) => {
  try {
    const currencySlug = req.params.currency;
    const fromDate = req.query.from;
    const toDate = req.query.to;

    // Validate currency slug
    if (!isValidCurrency(currencySlug)) {
      return res.status(400).json({
        error: `Invalid currency: ${currencySlug}`,
        availableCurrencies: '/api/v2/currencies',
        timestamp: new Date().toISOString(),
      });
    }

    // Validate required date parameters
    if (!fromDate || !toDate) {
      return res.status(400).json({
        error: 'Missing required parameters: from and to (format: YYYY-MM-DD)',
        example: `/api/v2/rates/${currencySlug}/history?from=2025-10-01&to=2025-10-15`,
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date formats
    if (!isValidDateFormat(fromDate) || !isValidDateFormat(toDate)) {
      return res.status(400).json({
        error: 'Invalid date format. Please use YYYY-MM-DD for both dates',
        provided: { from: fromDate, to: toDate },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate dates are parseable
    const from = dayjs(fromDate, 'YYYY-MM-DD', true);
    const to = dayjs(toDate, 'YYYY-MM-DD', true);

    if (!from.isValid() || !to.isValid()) {
      return res.status(400).json({
        error: 'Invalid dates. Please provide valid dates in YYYY-MM-DD format',
        provided: { from: fromDate, to: toDate },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate date range
    if (to.isBefore(from)) {
      return res.status(400).json({
        error: 'Invalid date range: "to" date must be after "from" date',
        provided: { from: fromDate, to: toDate },
        timestamp: new Date().toISOString(),
      });
    }

    // Limit date range to prevent excessive queries
    const daysDiff = to.diff(from, 'day');
    if (daysDiff > 365) {
      return res.status(400).json({
        error: 'Date range too large. Maximum allowed is 365 days',
        provided: { from: fromDate, to: toDate, days: daysDiff },
        timestamp: new Date().toISOString(),
      });
    }

    logger.debug(
      `Requesting historical rates for ${currencySlug} from ${fromDate} to ${toDate}`
    );

    // Get historical data
    const currencyInfo = getCurrencyBySlug(currencySlug);
    const historicalData = await getHistoricalRates(
      currencySlug,
      from.format('YYYY-MM-DD'),
      to.format('YYYY-MM-DD')
    );

    // Return response
    return res.json({
      currency: {
        slug: currencySlug,
        name: currencyInfo.name,
        isoCode: currencyInfo.isoCode,
        group: currencyInfo.group,
      },
      period: {
        from: from.format('YYYY-MM-DD'),
        to: to.format('YYYY-MM-DD'),
        days: daysDiff + 1,
      },
      data: historicalData,
      count: historicalData.length,
      note: 'Weekends and holidays are excluded (no data available)',
      source: 'Banco Central del Uruguay',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error in /api/v2/rates/${req.params.currency}/history endpoint`, error);

    if (error.message.includes('Invalid currency slug')) {
      return res.status(400).json({
        error: error.message,
        availableCurrencies: '/api/v2/currencies',
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      error: 'Internal server error while querying historical rates',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v2/rates?currencies=usd-cash,eur,ars&date=YYYY-MM-DD
 * GET /api/v2/rates/latest?currencies=usd-cash,eur,ars
 * Get exchange rates for multiple currencies at once
 */
router.get('/api/v2/rates', async (req, res) => {
  try {
    const currenciesParam = req.query.currencies;
    const dateParam = req.query.date;
    const isLatest = req.path.includes('/latest');

    // Validate currencies parameter
    if (!currenciesParam) {
      return res.status(400).json({
        error: 'Missing required parameter: currencies (comma-separated list)',
        example: '/api/v2/rates?currencies=usd-cash,eur,ars&date=2025-10-15',
        latestExample: '/api/v2/rates/latest?currencies=usd-cash,eur,ars',
        timestamp: new Date().toISOString(),
      });
    }

    // Parse currency slugs
    const currencySlugs = currenciesParam.split(',').map(s => s.trim());

    // Validate all currency slugs
    const invalidCurrencies = currencySlugs.filter(slug => !isValidCurrency(slug));
    if (invalidCurrencies.length > 0) {
      return res.status(400).json({
        error: 'Invalid currencies provided',
        invalid: invalidCurrencies,
        availableCurrencies: '/api/v2/currencies',
        timestamp: new Date().toISOString(),
      });
    }

    // Limit number of currencies to prevent abuse
    if (currencySlugs.length > 20) {
      return res.status(400).json({
        error: 'Too many currencies requested. Maximum allowed is 20',
        provided: currencySlugs.length,
        timestamp: new Date().toISOString(),
      });
    }

    let dateISO;

    // For non-latest requests, validate date
    if (!isLatest) {
      if (!dateParam) {
        return res.status(400).json({
          error: 'Missing required parameter: date (format: YYYY-MM-DD)',
          example: `/api/v2/rates?currencies=${currenciesParam}&date=2025-10-15`,
          latestEndpoint: `/api/v2/rates/latest?currencies=${currenciesParam}`,
          timestamp: new Date().toISOString(),
        });
      }

      if (!isValidDateFormat(dateParam)) {
        return res.status(400).json({
          error: 'Invalid date format. Please use YYYY-MM-DD',
          provided: dateParam,
          timestamp: new Date().toISOString(),
        });
      }

      const date = dayjs(dateParam, 'YYYY-MM-DD', true);
      if (!date.isValid()) {
        return res.status(400).json({
          error: 'Invalid date',
          provided: dateParam,
          timestamp: new Date().toISOString(),
        });
      }

      dateISO = date.format('YYYY-MM-DD');
    }

    logger.debug(
      `Requesting ${isLatest ? 'latest' : dateISO} rates for currencies: ${currencySlugs.join(', ')}`
    );

    // Get rates for all currencies (in parallel)
    let rates;
    if (isLatest) {
      const promises = currencySlugs.map(async slug => {
        try {
          const rate = await getLatestExchangeRate(slug);
          return { slug, rate };
        } catch (error) {
          logger.error(`Failed to get latest rate for ${slug}:`, error.message);
          return { slug, rate: null, error: error.message };
        }
      });

      const results = await Promise.all(promises);
      rates = {};
      results.forEach(({ slug, rate, error }) => {
        const currencyInfo = getCurrencyBySlug(slug);
        if (rate) {
          rates[slug] = {
            buy: rate.buyRate,
            sell: rate.sellRate,
            name: rate.currency,
            isoCode: rate.isoCode,
            date: rate.date,
          };
        } else {
          rates[slug] = {
            error: error || 'No data available',
            name: currencyInfo.name,
          };
        }
      });
    } else {
      rates = await getMultipleCurrencyRates(currencySlugs, dateISO);
    }

    // Return response
    return res.json({
      base: 'UYU',
      date: isLatest ? 'latest' : dateISO,
      rates,
      source: 'Banco Central del Uruguay',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in /api/v2/rates bulk endpoint', error);
    return res.status(500).json({
      error: 'Internal server error while querying exchange rates',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v2/rates/latest?currencies=...
 * Alias for bulk latest rates
 */
router.get('/api/v2/rates/latest', async (req, res, next) => {
  // Reuse the bulk rates handler
  req.path = '/api/v2/rates/latest';
  return router.handle(req, res, next);
});

export default router;
