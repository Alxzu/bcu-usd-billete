# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern Node.js REST API that provides USD exchange rates from the Banco Central del Uruguay (BCU) SOAP web services. The API has been refactored from a monolithic structure into a modular, maintainable architecture following Node.js best practices.

## Architecture v2.0

### Modular Structure

```
src/
├── config/index.js          # Centralized configuration management
├── middleware/index.js      # Express middleware stack (CORS, logging, etc.)
├── routes/
│   ├── exchange-rates.js    # Main USD rate endpoints (/usd-rate)
│   ├── health.js           # Health check endpoints (/health)
│   └── legacy.js           # Legacy redirects (/usd-billete -> /usd-rate)
├── services/
│   └── bcu-service.js      # Core BCU SOAP integration logic
├── utils/
│   ├── helpers.js          # Common utilities (date validation, etc.)
│   ├── logger.js           # Structured logging system
│   └── soap-client.js      # SOAP client wrapper with retry logic
└── index.js                # Main application entry point
```

### Core Components

**src/index.js** - Main application entry point with:

- `createApp()` - Express app factory with middleware stack
- `startServer(app)` - Server startup with error handling
- `setupGracefulShutdown()` - Signal handling and graceful shutdown
- `bootstrap()` - Complete application initialization

**src/services/bcu-service.js** - Business logic with three main functions:

1. `getUSDCurrencyCode()` - Queries BCU `awsbcumonedas` service to find "DÓLAR USA BILLETE" code
2. `getExchangeRateByDate(date)` - Queries BCU `awsbcucotizaciones` for specific date rates
3. `getLatestUSDExchangeRate()` - Gets latest rates with fallback logic

**src/utils/soap-client.js** - SOAP integration utilities:

- `createSOAPClient(wsdlUrl)` - Creates and caches SOAP clients
- `invokeSOAPMethod(client, methodNames, args)` - Handles method resolution across BCU service variations

## Common Commands

**Development:**

```bash
npm install         # Install dependencies
npm start           # Start production server using src/index.js
npm run dev         # Development mode with auto-restart (--watch)
PORT=3000 npm start # Custom port (useful if 3000 is occupied)
```

**Code Quality:**

```bash
npm run format       # Format all code with Prettier
npm run format:check # Check if code is properly formatted
npm run format:src   # Format only src/ directory
npm run lint         # Lint code with ESLint
npm run lint:fix     # Auto-fix ESLint issues
```

**Maintenance:**

```bash
npm run security:audit  # Check for security vulnerabilities
npm run security:fix    # Auto-fix security issues
npm run outdated        # Check for outdated dependencies
npm run clean           # Remove node_modules and package-lock.json
npm run reinstall       # Clean install dependencies
```

**Docker:**

```bash
npm run docker:build   # Build Docker image
npm run docker:run     # Run production container
npm run docker:dev     # Run development container
```

**Manual Docker Commands:**

```bash
docker build -t bcu-usd-billete:latest .
docker run --rm -p 3000:3000 bcu-usd-billete:latest
```

**Testing endpoints:**

```bash
# Modern endpoints (recommended)
curl "http://localhost:3000/usd-rate?date=2025-09-12"
curl "http://localhost:3000/usd-rate/latest"
curl "http://localhost:3000/health"
curl "http://localhost:3000/health/detailed"

# Legacy endpoints (redirect to modern ones)
curl "http://localhost:3000/usd-billete?date=2025-09-12"  # -> /usd-rate
curl "http://localhost:3000/usd-billete/latest"           # -> /usd-rate/latest
```

## API Endpoints

### Modern Endpoints (v2.0)

- `GET /usd-rate?date=YYYY-MM-DD` - Buy/sell rates for specific date (404 if no data)
- `GET /usd-rate/latest` - Most recent available rates with fallback logic
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information

### Legacy Endpoints (Deprecated)

- `GET /usd-billete?date=YYYY-MM-DD` - 301 redirect to `/usd-rate?date=YYYY-MM-DD`
- `GET /usd-billete/latest` - 301 redirect to `/usd-rate/latest`

## BCU SOAP Integration

The API integrates with three BCU web services:

- **Currencies**: `https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcumonedas?wsdl`
- **Exchange Rates**: `https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones?wsdl`
- **Last Closing**: `https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsultimocierre?wsdl`

### Critical Implementation Details

**Date Query Handling**: When querying a single date, BCU returns `datoscotizaciones.dato` as a single object. For date ranges, it's an array. The code handles both cases in `src/services/bcu-service.js:getExchangeRateByDate()`.

**Error Codes**: BCU returns error code 100 for "No existe cotización para la fecha indicada" - this is normal for weekends/holidays and returns 404 to client.

**Currency Filtering**: Searches for USD using normalized text matching "DOLAR USA", "DLS USA", or "DLS. USA" patterns, prioritizing entries containing "BILLETE".

**Retry Logic**: SOAP client includes automatic retry logic for transient network errors.

## Development Guidelines

### File Naming Convention

- Use kebab-case for all file names (exchange-rates.js, bcu-service.js, etc.)
- Organize by domain: routes/, services/, utils/, config/, middleware/

### Code Quality

- **Prettier** is configured for consistent code formatting
- **ESLint** is configured for code quality and best practices
- Run `npm run format` and `npm run lint` before committing changes
- Configuration files:
  - `.prettierrc` - Code formatting (single quotes, semicolons, 2-space indentation)
  - `eslint.config.js` - Code quality rules (ES6+, best practices, error prevention)

### Error Handling

- Services throw structured errors that middleware converts to HTTP responses
- All errors include proper HTTP status codes and structured JSON responses
- Logging captures errors with appropriate levels (error, warn, info, debug)

### Configuration

- Environment variables handled in `src/config/index.js`
- Development vs production modes supported via `NODE_ENV`
- Port configuration via `PORT` environment variable

### Adding New Features

1. Business logic → `src/services/`
2. HTTP endpoints → `src/routes/`
3. Utilities → `src/utils/`
4. Configuration → `src/config/`
5. Middleware → `src/middleware/`

## Development Notes

**Port Issues**: Default port 3000 may conflict with other services (like OrbStack). Use `PORT=3000 npm start` as alternative.

**Debugging SOAP**: The `bcu-service.js` functions can be enhanced with additional logging to inspect raw BCU SOAP responses when troubleshooting data extraction issues.

**Dependencies**:

- Requires Node.js 20+ (LTS recommended)
- Uses ES modules (`"type": "module"`)
- Core dependencies: `express@5.1.0`, `soap@1.3.0`, `dayjs@1.11.18`
- Dev dependencies: `eslint@9.35.0`, `prettier@3.6.2`, `eslint-config-prettier@10.1.8`

**Entry Point**:

- **Only**: `node src/index.js` or `npm start`
- The legacy server.js file has been removed for cleaner architecture

## Testing

Test with different scenarios:

- Valid business days (should return data)
- Weekends/holidays (should return 404)
- Future dates (should return 404)
- Invalid date formats (should return 400)
- Latest endpoint (should always return recent data or fallback)

## Performance Notes

- SOAP clients are cached to avoid repeated WSDL parsing
- Graceful shutdown ensures proper cleanup of resources
- Request logging helps monitor API usage and performance
- to memorize