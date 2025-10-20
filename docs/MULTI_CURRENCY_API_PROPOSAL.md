# Multi-Currency API Proposal for BCU Exchange Rates

## Executive Summary

Based on research of the BCU (Banco Central del Uruguay) web services and existing implementations, this document proposes an improved, extensible API that supports multiple currencies beyond just USD cash.

## Current State

The current API (`/usd-rate`) is limited to:
- USD cash (DÓLAR USA BILLETE) only
- Group 2 (Local Exchange Rates) only
- Hard-coded currency selection logic

## BCU Currency Groups

The BCU organizes currencies into two groups:

### Group 0: International Exchange Rates
International arbitrage rates for major currencies:
- **USD** - US Dollar
- **EUR** - Euro
- **ARS** - Argentine Peso
- **BRL** - Brazilian Real
- And potentially others (GBP, JPY, CHF, etc.)

### Group 2: Local Exchange Rates
Local market rates with different transaction types:
- **2225** - DÓLAR USA BILLETE (USD cash)
- **2224** - DÓLAR USA CABLE (USD wire transfer)
- **2230** - DÓLAR PROMEDIO FONDO (USD average fund)
- **501** - PESO ARGENTINO BILLETE (Argentine Peso cash)
- **1001** - REAL BILLETE (Brazilian Real cash)
- **9800** - UNIDAD REAJUSTABLE (Indexed Unit)
- **9900** - UNIDAD INDEXADA (Indexed Unit)
- **9700** - UNIDAD PREVISIONAL (Pension Unit)

## Proposed API Design

### 1. RESTful Endpoints (Recommended)

#### Get All Available Currencies
```
GET /api/v2/currencies
GET /api/v2/currencies?group=local
GET /api/v2/currencies?group=international
GET /api/v2/currencies?group=all
```

**Response:**
```json
{
  "local": [
    {
      "code": "2225",
      "name": "DÓLAR USA BILLETE",
      "isoCode": "USD",
      "slug": "usd-cash",
      "group": "local"
    },
    {
      "code": "2224",
      "name": "DÓLAR USA CABLE",
      "isoCode": "USD",
      "slug": "usd-wire",
      "group": "local"
    },
    {
      "code": "501",
      "name": "PESO ARGENTINO BILLETE",
      "isoCode": "ARS",
      "slug": "ars-cash",
      "group": "local"
    },
    {
      "code": "1001",
      "name": "REAL BILLETE",
      "isoCode": "BRL",
      "slug": "brl-cash",
      "group": "local"
    }
  ],
  "international": [
    {
      "code": "usd",
      "name": "US DOLLAR",
      "isoCode": "USD",
      "slug": "usd",
      "group": "international"
    },
    {
      "code": "eur",
      "name": "EURO",
      "isoCode": "EUR",
      "slug": "eur",
      "group": "international"
    },
    {
      "code": "ars",
      "name": "PESO ARGENTINO",
      "isoCode": "ARS",
      "slug": "ars",
      "group": "international"
    },
    {
      "code": "brl",
      "name": "REAL BRASILEÑO",
      "isoCode": "BRL",
      "slug": "brl",
      "group": "international"
    }
  ]
}
```

#### Get Exchange Rate for Specific Currency
```
GET /api/v2/rates/:currency?date=YYYY-MM-DD
GET /api/v2/rates/:currency/latest
```

**Examples:**
```
GET /api/v2/rates/usd-cash?date=2025-10-15
GET /api/v2/rates/eur?date=2025-10-15
GET /api/v2/rates/ars-cash/latest
GET /api/v2/rates/brl/latest
```

**Response:**
```json
{
  "currency": {
    "code": "2225",
    "name": "DÓLAR USA BILLETE",
    "isoCode": "USD",
    "slug": "usd-cash",
    "group": "local"
  },
  "date": "2025-10-15",
  "rates": {
    "buy": 40.50,
    "sell": 42.75
  },
  "issuer": "BCU",
  "source": "Banco Central del Uruguay",
  "timestamp": "2025-10-20T19:30:00Z"
}
```

#### Get Multiple Currencies at Once
```
GET /api/v2/rates?currencies=usd-cash,eur,ars&date=YYYY-MM-DD
GET /api/v2/rates/latest?currencies=usd-cash,eur,brl-cash
```

**Response:**
```json
{
  "date": "2025-10-15",
  "base": "UYU",
  "rates": {
    "usd-cash": {
      "buy": 40.50,
      "sell": 42.75,
      "name": "DÓLAR USA BILLETE"
    },
    "eur": {
      "buy": 44.20,
      "sell": 46.80,
      "name": "EURO"
    },
    "ars": {
      "buy": 0.045,
      "sell": 0.052,
      "name": "PESO ARGENTINO"
    }
  },
  "source": "Banco Central del Uruguay",
  "timestamp": "2025-10-20T19:30:00Z"
}
```

#### Get Historical Rates (Date Range)
```
GET /api/v2/rates/:currency/history?from=YYYY-MM-DD&to=YYYY-MM-DD
```

**Example:**
```
GET /api/v2/rates/usd-cash/history?from=2025-10-01&to=2025-10-15
```

**Response:**
```json
{
  "currency": {
    "slug": "usd-cash",
    "name": "DÓLAR USA BILLETE",
    "isoCode": "USD"
  },
  "period": {
    "from": "2025-10-01",
    "to": "2025-10-15"
  },
  "data": [
    {
      "date": "2025-10-01",
      "buy": 40.20,
      "sell": 42.50
    },
    {
      "date": "2025-10-02",
      "buy": 40.30,
      "sell": 42.60
    }
  ]
}
```

### 2. Alternative: Group-Based Endpoints

```
GET /api/v2/local/rates/:currency?date=YYYY-MM-DD
GET /api/v2/international/rates/:currency?date=YYYY-MM-DD
```

### 3. Backward Compatibility

Keep existing endpoints with deprecation notices:
```
GET /usd-rate?date=YYYY-MM-DD → Deprecated, use /api/v2/rates/usd-cash
GET /usd-rate/latest → Deprecated, use /api/v2/rates/usd-cash/latest
GET /usd-billete/* → Already redirects to /usd-rate
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. **Refactor bcu-service.js**
   - Extract currency-specific logic into generic functions
   - Create `getCurrencyList(group)` function
   - Create `getExchangeRateGeneric(currencyCode, group, date)`
   - Add currency mapping/slug system

2. **Create currency mapping system**
   - `src/config/currency-map.js` - Map slugs to BCU codes
   - Support both numeric codes (Group 2) and ISO codes (Group 0)

3. **Add caching layer**
   - Cache currency lists (refresh daily)
   - Cache exchange rates (5-15 minute TTL)

### Phase 2: New API Routes (Week 2)
1. **Create `/api/v2/currencies` endpoint**
   - List all available currencies
   - Filter by group
   - Include metadata (slug, ISO code, name)

2. **Create `/api/v2/rates/:currency` endpoint**
   - Support both local and international currencies
   - Date query parameter
   - `/latest` sub-route

3. **Create `/api/v2/rates` bulk endpoint**
   - Multiple currencies in one request
   - Optimize with parallel SOAP requests

### Phase 3: Advanced Features (Week 3)
1. **Historical data endpoint**
   - Date range queries
   - Pagination for large ranges
   - CSV/JSON export options

2. **Rate comparison endpoint**
   - Compare multiple currencies side-by-side
   - Calculate cross-rates

3. **Webhooks/notifications**
   - Alert when rates change significantly
   - Daily rate summaries

### Phase 4: Polish & Documentation (Week 4)
1. **API documentation**
   - OpenAPI/Swagger specification
   - Interactive API explorer
   - Code examples in multiple languages

2. **Rate limiting**
   - Implement per-IP rate limiting
   - API key system for higher limits

3. **Monitoring & analytics**
   - Track popular currencies
   - Performance metrics
   - Error tracking

## Technical Considerations

### 1. Currency Slug System

Create a standardized slug format:
- **Local currencies:** `{iso-code}-{type}` (e.g., `usd-cash`, `usd-wire`, `ars-cash`)
- **International currencies:** `{iso-code}` (e.g., `usd`, `eur`, `ars`, `brl`)
- **Indexed units:** `{name}` (e.g., `ur`, `ui`, `up`)

### 2. Caching Strategy

```javascript
// Currency list cache
const CURRENCY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Exchange rate cache
const RATE_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const HISTORICAL_RATE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
```

### 3. Error Handling

Unified error responses:
```json
{
  "error": {
    "code": "CURRENCY_NOT_FOUND",
    "message": "Currency 'xyz' is not available",
    "availableCurrencies": "/api/v2/currencies",
    "timestamp": "2025-10-20T19:30:00Z"
  }
}
```

### 4. Performance Optimization

- **Parallel requests:** When querying multiple currencies, make parallel SOAP calls
- **Request batching:** Allow batch requests to reduce round trips
- **Compression:** Enable gzip compression for responses
- **CDN:** Cache currency lists and historical data on CDN

### 5. Database Considerations

For production, consider adding:
- PostgreSQL/MongoDB for caching exchange rates
- Redis for session/cache management
- Time-series database for historical data analysis

## Migration Path

### Step 1: Soft Launch
- Deploy new API as `/api/v2/*`
- Keep old endpoints running
- Add deprecation headers to old endpoints

### Step 2: Communication
- Update documentation
- Notify existing users via email/blog post
- Provide migration guide with examples

### Step 3: Deprecation Period (6 months)
- Monitor usage of old endpoints
- Log warnings for old endpoint usage
- Continue supporting both APIs

### Step 4: Sunset
- Remove old endpoints (except redirects)
- Keep `/usd-rate` → `/api/v2/rates/usd-cash` redirect permanently

## Example Use Cases

### Use Case 1: Currency Exchange Website
```javascript
// Display all available currencies
const currencies = await fetch('/api/v2/currencies').then(r => r.json());

// Get latest rates for popular currencies
const rates = await fetch(
  '/api/v2/rates/latest?currencies=usd-cash,eur,ars-cash,brl-cash'
).then(r => r.json());
```

### Use Case 2: Financial Dashboard
```javascript
// Get historical USD trend for last 30 days
const history = await fetch(
  '/api/v2/rates/usd-cash/history?from=2025-09-20&to=2025-10-20'
).then(r => r.json());

// Plot chart with buy/sell rates over time
```

### Use Case 3: Mobile App
```javascript
// Get single currency for today
const usdRate = await fetch('/api/v2/rates/usd-cash/latest').then(r => r.json());

// Calculate conversion
const uyu = 1000;
const usd = uyu / usdRate.rates.sell;
```

## Benefits

1. **Flexibility:** Support all BCU currencies, not just USD
2. **Extensibility:** Easy to add new currencies as BCU adds them
3. **Performance:** Caching and parallel requests improve speed
4. **Developer Experience:** Clear, RESTful API with good documentation
5. **Future-proof:** Versioned API allows evolution without breaking changes
6. **Analytics:** Track which currencies are most popular
7. **Reduced Load:** Caching reduces load on BCU SOAP services

## Open Questions

1. Should we support currency code lookup by ISO code directly? (e.g., `/api/v2/rates/USD` → automatically select best USD variant)
2. Do we need authentication/API keys for public API?
3. Should we provide GraphQL endpoint in addition to REST?
4. Do we need webhook support for real-time updates?
5. Should we calculate and provide cross-rates (e.g., USD/EUR)?

## Next Steps

1. Review and approve this proposal
2. Create detailed technical specification
3. Set up project tracking (GitHub issues/project board)
4. Begin Phase 1 implementation
5. Set up staging environment for testing

---

**Document Version:** 1.0
**Date:** 2025-10-20
**Author:** Claude Code
**Status:** Proposal for Review
