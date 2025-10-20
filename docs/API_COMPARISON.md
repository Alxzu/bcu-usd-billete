# API Comparison: Current vs Proposed

## Quick Comparison

| Feature | Current API | Proposed API v2 |
|---------|-------------|-----------------|
| **Currencies Supported** | USD cash only | All BCU currencies (USD, EUR, ARS, BRL, etc.) |
| **Groups** | Group 2 (Local) only | Both Group 0 (International) and Group 2 (Local) |
| **Endpoints** | 2 endpoints | 10+ endpoints |
| **Bulk Queries** | No | Yes (multiple currencies in one request) |
| **Historical Data** | No | Yes (date ranges) |
| **Currency Discovery** | No | Yes (`/currencies` endpoint) |
| **Caching** | No | Yes (currency lists and rates) |
| **Response Time** | Depends on BCU | Faster with caching |
| **Flexibility** | Hard-coded USD logic | Generic currency system |
| **Versioning** | No | Yes (`/api/v2`) |
| **Documentation** | README only | OpenAPI/Swagger spec |

## Current API

### Endpoints
```
GET /usd-rate?date=YYYY-MM-DD
GET /usd-rate/latest
GET /health
GET /health/detailed
```

### Example Request & Response
```bash
curl "http://localhost:3000/usd-rate?date=2025-10-15"
```

```json
{
  "currency": "DÓLAR USA BILLETE",
  "date": "2025-10-15",
  "isoCode": "USD",
  "issuer": "BCU",
  "buyRate": 40.50,
  "sellRate": 42.75,
  "source": "Central Bank of Uruguay - Exchange Rates Web Services",
  "timestamp": "2025-10-20T19:30:00.000Z"
}
```

### Limitations
- Only supports USD cash (DÓLAR USA BILLETE)
- Cannot query other currencies (EUR, ARS, BRL, etc.)
- Cannot query different USD types (cable, wire)
- No bulk queries (must make multiple requests)
- No historical data (date ranges)
- No currency discovery endpoint

## Proposed API v2

### New Endpoints

#### 1. Currency Discovery
```bash
# Get all available currencies
curl "http://localhost:3000/api/v2/currencies"

# Get only local currencies
curl "http://localhost:3000/api/v2/currencies?group=local"

# Get only international currencies
curl "http://localhost:3000/api/v2/currencies?group=international"
```

**Response:**
```json
{
  "local": [
    {"code": "2225", "name": "DÓLAR USA BILLETE", "isoCode": "USD", "slug": "usd-cash"},
    {"code": "2224", "name": "DÓLAR USA CABLE", "isoCode": "USD", "slug": "usd-wire"},
    {"code": "501", "name": "PESO ARGENTINO BILLETE", "isoCode": "ARS", "slug": "ars-cash"},
    {"code": "1001", "name": "REAL BILLETE", "isoCode": "BRL", "slug": "brl-cash"}
  ],
  "international": [
    {"code": "usd", "name": "US DOLLAR", "isoCode": "USD", "slug": "usd"},
    {"code": "eur", "name": "EURO", "isoCode": "EUR", "slug": "eur"},
    {"code": "ars", "name": "PESO ARGENTINO", "isoCode": "ARS", "slug": "ars"},
    {"code": "brl", "name": "REAL BRASILEÑO", "isoCode": "BRL", "slug": "brl"}
  ]
}
```

#### 2. Single Currency Rate
```bash
# USD cash for specific date
curl "http://localhost:3000/api/v2/rates/usd-cash?date=2025-10-15"

# EUR for specific date
curl "http://localhost:3000/api/v2/rates/eur?date=2025-10-15"

# Latest USD wire rate
curl "http://localhost:3000/api/v2/rates/usd-wire/latest"

# Latest ARS cash rate
curl "http://localhost:3000/api/v2/rates/ars-cash/latest"
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
  "source": "Banco Central del Uruguay",
  "timestamp": "2025-10-20T19:30:00Z"
}
```

#### 3. Multiple Currencies (Bulk)
```bash
# Get multiple currencies at once
curl "http://localhost:3000/api/v2/rates?currencies=usd-cash,eur,ars-cash,brl-cash&date=2025-10-15"

# Latest rates for multiple currencies
curl "http://localhost:3000/api/v2/rates/latest?currencies=usd-cash,eur,brl"
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
    "ars-cash": {
      "buy": 0.045,
      "sell": 0.052,
      "name": "PESO ARGENTINO BILLETE"
    },
    "brl": {
      "buy": 8.10,
      "sell": 9.20,
      "name": "REAL BRASILEÑO"
    }
  },
  "source": "Banco Central del Uruguay",
  "timestamp": "2025-10-20T19:30:00Z"
}
```

#### 4. Historical Data (Date Ranges)
```bash
# Get USD history for date range
curl "http://localhost:3000/api/v2/rates/usd-cash/history?from=2025-10-01&to=2025-10-15"

# Get EUR history
curl "http://localhost:3000/api/v2/rates/eur/history?from=2025-09-01&to=2025-09-30"
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
    {"date": "2025-10-01", "buy": 40.20, "sell": 42.50},
    {"date": "2025-10-02", "buy": 40.30, "sell": 42.60},
    {"date": "2025-10-06", "buy": 40.35, "sell": 42.65},
    {"date": "2025-10-07", "buy": 40.40, "sell": 42.70},
    {"date": "2025-10-15", "buy": 40.50, "sell": 42.75}
  ],
  "note": "Weekends and holidays excluded"
}
```

## Migration Examples

### Scenario 1: Simple USD Query

**Before (Current API):**
```javascript
const response = await fetch('/usd-rate?date=2025-10-15');
const data = await response.json();
console.log(`USD Buy: ${data.buyRate}, Sell: ${data.sellRate}`);
```

**After (Proposed API v2):**
```javascript
const response = await fetch('/api/v2/rates/usd-cash?date=2025-10-15');
const data = await response.json();
console.log(`USD Buy: ${data.rates.buy}, Sell: ${data.rates.sell}`);
```

**Or keep using the old endpoint** (backward compatible):
```javascript
// Old endpoint still works!
const response = await fetch('/usd-rate?date=2025-10-15');
const data = await response.json();
console.log(`USD Buy: ${data.buyRate}, Sell: ${data.sellRate}`);
```

### Scenario 2: Multiple Currencies

**Before (Current API) - Requires 3 requests:**
```javascript
// Not possible! Must use external EUR/ARS APIs or make multiple requests to BCU
const usd = await fetch('/usd-rate/latest').then(r => r.json());
// No way to get EUR or ARS through this API
```

**After (Proposed API v2) - Single request:**
```javascript
const response = await fetch(
  '/api/v2/rates/latest?currencies=usd-cash,eur,ars-cash'
);
const data = await response.json();

console.log('USD:', data.rates['usd-cash']);
console.log('EUR:', data.rates.eur);
console.log('ARS:', data.rates['ars-cash']);
```

### Scenario 3: Currency Exchange Calculator

**Before (Current API):**
```javascript
// Only works for USD
const rate = await fetch('/usd-rate/latest').then(r => r.json());
const uyu = 1000;
const usd = uyu / rate.sellRate;
console.log(`${uyu} UYU = ${usd.toFixed(2)} USD`);
```

**After (Proposed API v2):**
```javascript
// Works for any currency!
const rates = await fetch(
  '/api/v2/rates/latest?currencies=usd-cash,eur,brl'
).then(r => r.json());

const uyu = 1000;

const usd = uyu / rates.rates['usd-cash'].sell;
const eur = uyu / rates.rates.eur.sell;
const brl = uyu / rates.rates.brl.sell;

console.log(`${uyu} UYU = ${usd.toFixed(2)} USD`);
console.log(`${uyu} UYU = ${eur.toFixed(2)} EUR`);
console.log(`${uyu} UYU = ${brl.toFixed(2)} BRL`);
```

### Scenario 4: Historical Chart

**Before (Current API):**
```javascript
// Not supported! Would need to make 30+ requests for 30 days
const dates = generateDateRange('2025-09-01', '2025-09-30');
const promises = dates.map(date =>
  fetch(`/usd-rate?date=${date}`).then(r => r.json())
);
const results = await Promise.all(promises);
// 30 API calls!
```

**After (Proposed API v2):**
```javascript
// Single request for entire date range
const history = await fetch(
  '/api/v2/rates/usd-cash/history?from=2025-09-01&to=2025-09-30'
).then(r => r.json());

// Plot chart directly
plotChart(history.data);
```

## Key Advantages

### 1. Multi-Currency Support
- **Current:** USD only
- **Proposed:** EUR, USD, ARS, BRL, and more

### 2. Performance
- **Current:** Direct BCU SOAP calls every time
- **Proposed:** Cached responses, parallel requests, faster response times

### 3. Reduced API Calls
- **Current:** 1 currency = 1 request, 30 days = 30 requests
- **Proposed:** Multiple currencies in 1 request, 30 days in 1 request

### 4. Developer Experience
- **Current:** Limited documentation, single use case
- **Proposed:** OpenAPI docs, interactive explorer, multiple examples

### 5. Future-Proof
- **Current:** Hard to add new features without breaking changes
- **Proposed:** Versioned API (`/api/v2`), can evolve independently

## Backward Compatibility

All existing endpoints remain functional:
- `/usd-rate?date=YYYY-MM-DD` → Still works
- `/usd-rate/latest` → Still works
- `/usd-billete/*` → Still redirects to `/usd-rate`

New endpoints are additive, not replacing:
- `/api/v2/*` → New endpoints
- `/usd-rate` → Legacy endpoint (no breaking changes)

## Timeline

- **Phase 1 (Week 1):** Foundation & refactoring
- **Phase 2 (Week 2):** New API routes
- **Phase 3 (Week 3):** Advanced features
- **Phase 4 (Week 4):** Documentation & polish

## Decision Required

Should we proceed with implementing the proposed API v2?

- ✅ **Yes** → Continue to implementation Phase 1
- ❓ **Questions** → Review proposal, clarify requirements
- ✏️ **Modifications** → Update proposal based on feedback

---

**See also:** [MULTI_CURRENCY_API_PROPOSAL.md](./MULTI_CURRENCY_API_PROPOSAL.md) for full technical details.
