/**
 * Currency Routes (API v2)
 * Endpoints for discovering available currencies
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { getCurrencyList } from '../services/bcu-service.js';
import {
  LOCAL_CURRENCIES,
  INTERNATIONAL_CURRENCIES,
  ALL_CURRENCIES,
} from '../config/currency-map.js';

const router = Router();

/**
 * GET /api/v2/currencies
 * Get list of available currencies
 * Query params:
 *   - group: 'local', 'international', or 'all' (default: 'all')
 *   - source: 'static' (currency map) or 'live' (from BCU) (default: 'static')
 */
router.get('/api/v2/currencies', async (req, res) => {
  try {
    const group = req.query.group || 'all';
    const source = req.query.source || 'static';

    // Validate group parameter
    if (!['local', 'international', 'all'].includes(group)) {
      return res.status(400).json({
        error: 'Invalid group parameter',
        allowed: ['local', 'international', 'all'],
        provided: group,
        timestamp: new Date().toISOString(),
      });
    }

    // Static response from currency map (faster, always available)
    if (source === 'static') {
      const response = {
        source: 'static',
        timestamp: new Date().toISOString(),
      };

      if (group === 'local' || group === 'all') {
        response.local = Object.values(LOCAL_CURRENCIES).map(c => ({
          code: c.code,
          name: c.name,
          isoCode: c.isoCode,
          slug: c.slug,
          group: c.group,
          description: c.description,
        }));
      }

      if (group === 'international' || group === 'all') {
        response.international = Object.values(INTERNATIONAL_CURRENCIES).map(
          c => ({
            code: c.code,
            name: c.name,
            isoCode: c.isoCode,
            slug: c.slug,
            group: c.group,
            description: c.description,
          })
        );
      }

      return res.json(response);
    }

    // Live response from BCU SOAP service (slower, always up-to-date)
    if (source === 'live') {
      const response = {
        source: 'live',
        timestamp: new Date().toISOString(),
      };

      if (group === 'local' || group === 'all') {
        try {
          response.local = await getCurrencyList(2); // Group 2 = Local
        } catch (error) {
          logger.error('Failed to get local currencies from BCU', error);
          response.local = { error: 'Failed to fetch from BCU' };
        }
      }

      if (group === 'international' || group === 'all') {
        try {
          response.international = await getCurrencyList(0); // Group 0 = International
        } catch (error) {
          logger.error('Failed to get international currencies from BCU', error);
          response.international = { error: 'Failed to fetch from BCU' };
        }
      }

      return res.json(response);
    }

    // Invalid source parameter
    return res.status(400).json({
      error: 'Invalid source parameter',
      allowed: ['static', 'live'],
      provided: source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in /api/v2/currencies endpoint', error);
    return res.status(500).json({
      error: 'Internal server error while retrieving currency list',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
