/**
 * Legacy Compatibility Routes
 * Provides backward compatibility for old API endpoints
 */

import { Router } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /usd-billete?date=YYYY-MM-DD
 * Legacy endpoint - redirects to /usd-rate?date=YYYY-MM-DD
 * @deprecated Use /usd-rate instead
 */
router.get('/usd-billete', (req, res) => {
  const queryString = req.url.substring('/usd-billete'.length);
  const redirectUrl = `/usd-rate${queryString}`;

  logger.warn('Deprecated endpoint /usd-billete accessed', {
    originalUrl: req.url,
    redirectUrl: redirectUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // 301 Moved Permanently - indicates this is a permanent redirect
  return res.redirect(301, redirectUrl);
});

/**
 * GET /usd-billete/latest
 * Legacy endpoint - redirects to /usd-rate/latest
 * @deprecated Use /usd-rate/latest instead
 */
router.get('/usd-billete/latest', (req, res) => {
  logger.warn('Deprecated endpoint /usd-billete/latest accessed', {
    originalUrl: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // 301 Moved Permanently - indicates this is a permanent redirect
  return res.redirect(301, '/usd-rate/latest');
});

export default router;
