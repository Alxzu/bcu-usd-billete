/**
 * Currency Mapping Configuration
 * Maps currency slugs to BCU codes and metadata
 */

/**
 * Local Exchange Rates (Group 2)
 * These use numeric BCU codes
 */
export const LOCAL_CURRENCIES = {
  'usd-cash': {
    code: 2225,
    name: 'DÓLAR USA BILLETE',
    isoCode: 'USD',
    slug: 'usd-cash',
    group: 'local',
    description: 'US Dollar cash/banknotes',
    searchTerms: ['DOLAR USA', 'DLS USA', 'DLS. USA', 'BILLETE'],
  },
  'usd-wire': {
    code: 2224,
    name: 'DÓLAR USA CABLE',
    isoCode: 'USD',
    slug: 'usd-wire',
    group: 'local',
    description: 'US Dollar wire transfer',
    searchTerms: ['DOLAR USA', 'DLS USA', 'DLS. USA', 'CABLE'],
  },
  'usd-average': {
    code: 2230,
    name: 'DÓLAR PROMEDIO FONDO',
    isoCode: 'USD',
    slug: 'usd-average',
    group: 'local',
    description: 'US Dollar average fund rate',
    searchTerms: ['DOLAR', 'PROMED', 'FONDO'],
  },
  'ars-cash': {
    code: 501,
    name: 'PESO ARGENTINO BILLETE',
    isoCode: 'ARS',
    slug: 'ars-cash',
    group: 'local',
    description: 'Argentine Peso cash/banknotes',
    searchTerms: ['PESO ARG', 'BILLETE'],
  },
  'brl-cash': {
    code: 1001,
    name: 'REAL BILLETE',
    isoCode: 'BRL',
    slug: 'brl-cash',
    group: 'local',
    description: 'Brazilian Real cash/banknotes',
    searchTerms: ['REAL', 'BILLETE'],
  },
  ur: {
    code: 9800,
    name: 'UNIDAD REAJUSTABLE',
    isoCode: 'UYU',
    slug: 'ur',
    group: 'local',
    description: 'Uruguayan Reajustable Unit (indexed)',
    searchTerms: ['UNIDAD REAJUST'],
  },
  ui: {
    code: 9900,
    name: 'UNIDAD INDEXADA',
    isoCode: 'UYU',
    slug: 'ui',
    group: 'local',
    description: 'Uruguayan Indexed Unit',
    searchTerms: ['UNIDAD INDEX'],
  },
  up: {
    code: 9700,
    name: 'UNIDAD PREVISIONAL',
    isoCode: 'UYU',
    slug: 'up',
    group: 'local',
    description: 'Uruguayan Pension Unit',
    searchTerms: ['UNIDAD PREVIS'],
  },
};

/**
 * International Exchange Rates (Group 0)
 * These use ISO codes or string identifiers
 */
export const INTERNATIONAL_CURRENCIES = {
  usd: {
    code: 'USD',
    name: 'US DOLLAR',
    isoCode: 'USD',
    slug: 'usd',
    group: 'international',
    description: 'US Dollar international arbitrage',
    searchTerms: ['DOLAR', 'USD'],
  },
  eur: {
    code: 'EUR',
    name: 'EURO',
    isoCode: 'EUR',
    slug: 'eur',
    group: 'international',
    description: 'Euro international arbitrage',
    searchTerms: ['EURO', 'EUR'],
  },
  ars: {
    code: 'ARS',
    name: 'PESO ARGENTINO',
    isoCode: 'ARS',
    slug: 'ars',
    group: 'international',
    description: 'Argentine Peso international arbitrage',
    searchTerms: ['PESO ARG', 'ARS'],
  },
  brl: {
    code: 'BRL',
    name: 'REAL BRASILEÑO',
    isoCode: 'BRL',
    slug: 'brl',
    group: 'international',
    description: 'Brazilian Real international arbitrage',
    searchTerms: ['REAL', 'BRL'],
  },
  gbp: {
    code: 'GBP',
    name: 'BRITISH POUND',
    isoCode: 'GBP',
    slug: 'gbp',
    group: 'international',
    description: 'British Pound international arbitrage',
    searchTerms: ['LIBRA', 'POUND', 'GBP'],
  },
  jpy: {
    code: 'JPY',
    name: 'JAPANESE YEN',
    isoCode: 'JPY',
    slug: 'jpy',
    group: 'international',
    description: 'Japanese Yen international arbitrage',
    searchTerms: ['YEN', 'JPY'],
  },
  chf: {
    code: 'CHF',
    name: 'SWISS FRANC',
    isoCode: 'CHF',
    slug: 'chf',
    group: 'international',
    description: 'Swiss Franc international arbitrage',
    searchTerms: ['FRANCO', 'CHF'],
  },
};

/**
 * Combined currency map
 */
export const ALL_CURRENCIES = {
  ...LOCAL_CURRENCIES,
  ...INTERNATIONAL_CURRENCIES,
};

/**
 * Get currency metadata by slug
 * @param {string} slug - Currency slug (e.g., 'usd-cash', 'eur')
 * @returns {Object|null} Currency metadata or null if not found
 */
export function getCurrencyBySlug(slug) {
  return ALL_CURRENCIES[slug] || null;
}

/**
 * Get currency metadata by BCU code
 * @param {number|string} code - BCU currency code
 * @param {string} group - 'local' or 'international'
 * @returns {Object|null} Currency metadata or null if not found
 */
export function getCurrencyByCode(code, group = 'local') {
  const currencies = group === 'local' ? LOCAL_CURRENCIES : INTERNATIONAL_CURRENCIES;
  return Object.values(currencies).find(c => c.code === code) || null;
}

/**
 * Get all currencies for a specific group
 * @param {string} group - 'local', 'international', or 'all'
 * @returns {Object} Currency map
 */
export function getCurrenciesByGroup(group = 'all') {
  switch (group) {
    case 'local':
      return LOCAL_CURRENCIES;
    case 'international':
      return INTERNATIONAL_CURRENCIES;
    case 'all':
    default:
      return ALL_CURRENCIES;
  }
}

/**
 * Get BCU group ID for a currency
 * @param {string} slug - Currency slug
 * @returns {number} Group ID (0 for international, 2 for local)
 */
export function getGroupId(slug) {
  const currency = getCurrencyBySlug(slug);
  if (!currency) return null;
  return currency.group === 'international' ? 0 : 2;
}

/**
 * Validate if a currency slug exists
 * @param {string} slug - Currency slug
 * @returns {boolean}
 */
export function isValidCurrency(slug) {
  return slug in ALL_CURRENCIES;
}

/**
 * Get list of all currency slugs
 * @param {string} group - 'local', 'international', or 'all'
 * @returns {string[]} Array of currency slugs
 */
export function getCurrencySlugs(group = 'all') {
  return Object.keys(getCurrenciesByGroup(group));
}
