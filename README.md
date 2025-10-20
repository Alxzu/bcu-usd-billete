# BCU Multi-Currency Exchange Rate API

Modern Node.js REST API for querying **exchange rates for multiple currencies** (USD, EUR, ARS, BRL, and more) from BCU (Central Bank of Uruguay). Built with best practices, modular architecture, and Docker support.

## 🚀 Features

- ✅ **Multi-Currency Support**: Query USD, EUR, ARS, BRL, and all BCU-provided currencies
- ✅ **Modern API v2**: RESTful design with comprehensive multi-currency endpoints
- ✅ **Bulk Queries**: Get multiple currencies in a single request
- ✅ **Historical Data**: Query date ranges for trend analysis
- ✅ **Currency Discovery**: Auto-discover available currencies from BCU
- ✅ **Backward Compatible**: Legacy USD-only endpoints still supported
- ✅ **Modern Architecture**: Modular design with clean separation of concerns
- ✅ **Health Checks**: Built-in monitoring endpoints for system health
- ✅ **Docker Ready**: Containerized deployment with optimized image
- ✅ **Code Quality**: Prettier & ESLint for consistent code style
- ✅ **Error Handling**: Comprehensive error responses with proper HTTP status codes
- ✅ **CORS Enabled**: Ready for web application integration
- ✅ **Structured Logging**: Environment-aware logging with multiple levels
- ✅ **Graceful Shutdown**: Proper cleanup and signal handling

## 📋 Requirements

- **Node.js 20+** (LTS recommended)
- **Internet access** to BCU domains
- **Docker** (optional, for containerized deployment)

## 🛠️ Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode with auto-restart
npm run dev

# Format code (recommended before commits)
npm run format
```

### Docker Deployment

```bash
# Build the Docker image
docker build -t bcu-usd-billete:latest .

# Run the container
docker run --rm -p 3000:3000 bcu-usd-billete:latest

# Custom port
docker run --rm -p 8080:3000 -e PORT=3000 bcu-usd-billete:latest
```

## 📡 API Endpoints

### API v2 (Multi-Currency)

#### Currency Discovery
| Method | Endpoint                                  | Description                           |
| ------ | ----------------------------------------- | ------------------------------------- |
| `GET`  | `/api/v2/currencies?group=local`          | List all local market currencies      |
| `GET`  | `/api/v2/currencies?group=international`  | List all international currencies     |
| `GET`  | `/api/v2/currencies?group=all`            | List all available currencies         |

#### Exchange Rates
| Method | Endpoint                                         | Description                                    |
| ------ | ------------------------------------------------ | ---------------------------------------------- |
| `GET`  | `/api/v2/rates/:currency?date=YYYY-MM-DD`        | Get rate for specific currency and date        |
| `GET`  | `/api/v2/rates/:currency/latest`                 | Get latest rate for specific currency          |
| `GET`  | `/api/v2/rates/:currency/history?from=...&to=...`| Get historical rates for date range (max 365d) |
| `GET`  | `/api/v2/rates?currencies=slug1,slug2&date=...`  | Get multiple currencies at once                |
| `GET`  | `/api/v2/rates/latest?currencies=slug1,slug2`    | Get latest rates for multiple currencies       |

**Available Currency Slugs:**
- Local: `usd-cash`, `usd-wire`, `usd-average`, `ars-cash`, `brl-cash`, `ur`, `ui`, `up`
- International: `usd`, `eur`, `ars`, `brl`, `gbp`, `jpy`, `chf`

### Legacy Endpoints (v1)

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| `GET`  | `/usd-rate?date=YYYY-MM-DD` | Get USD buy/sell rates for specific date |
| `GET`  | `/usd-rate/latest`          | Get latest available exchange rate       |
| `GET`  | `/health`                   | Basic health check                       |
| `GET`  | `/health/detailed`          | Detailed system health information       |

### Deprecated Endpoints

| Method | Endpoint                       | Description                                |
| ------ | ------------------------------ | ------------------------------------------ |
| `GET`  | `/usd-billete?date=YYYY-MM-DD` | ↳ Redirects to `/usd-rate?date=YYYY-MM-DD` |
| `GET`  | `/usd-billete/latest`          | ↳ Redirects to `/usd-rate/latest`          |

### Example Usage

#### API v2 (Multi-Currency)

```bash
# Discover available currencies
curl "http://localhost:3000/api/v2/currencies?group=local"
curl "http://localhost:3000/api/v2/currencies?group=international"

# Get specific currency rate
curl "http://localhost:3000/api/v2/rates/usd-cash?date=2025-09-12"
curl "http://localhost:3000/api/v2/rates/eur?date=2025-09-12"
curl "http://localhost:3000/api/v2/rates/ars-cash/latest"

# Get multiple currencies at once
curl "http://localhost:3000/api/v2/rates?currencies=usd-cash,eur,ars&date=2025-09-12"
curl "http://localhost:3000/api/v2/rates/latest?currencies=usd-cash,eur,brl"

# Get historical data (date range)
curl "http://localhost:3000/api/v2/rates/usd-cash/history?from=2025-09-01&to=2025-09-30"
curl "http://localhost:3000/api/v2/rates/eur/history?from=2025-10-01&to=2025-10-15"
```

#### Legacy v1 Endpoints (Still Supported)

```bash
# Query rate for specific date
curl "http://localhost:3000/usd-rate?date=2025-09-12"

# Get latest available rate
curl "http://localhost:3000/usd-rate/latest"

# Health checks
curl "http://localhost:3000/health"
curl "http://localhost:3000/health/detailed"
```

## 📁 Project Structure

```
├── src/
│   ├── config/           # Application configuration
│   ├── middleware/       # Express middleware stack
│   ├── routes/          # API route handlers
│   │   ├── exchange-rates.js  # Main USD rate endpoints
│   │   ├── health.js          # Health check endpoints
│   │   └── legacy.js          # Legacy redirect endpoints
│   ├── services/        # Business logic layer
│   │   └── bcu-service.js     # BCU SOAP integration
│   ├── utils/           # Utility functions
│   │   ├── helpers.js         # Common utilities
│   │   ├── logger.js          # Logging system
│   │   └── soap-client.js     # SOAP client wrapper
│   └── index.js         # Main application entry point
├── .prettierrc          # Code formatting configuration
├── .prettierignore      # Prettier ignore rules
├── package.json         # Dependencies and scripts
├── Dockerfile          # Container configuration
├── CLAUDE.md           # Development documentation
└── README.md           # This file
```

## 🔧 Development Scripts

```bash
# Core commands
npm start              # Start production server
npm run dev            # Development mode with NODE_ENV=development

# Code formatting
npm run format         # Format all code with Prettier
npm run format:check   # Check if code is properly formatted
npm run format:src     # Format only src/ directory

# Custom port (if 3000 is occupied)
PORT=3000 npm start
```

## 📊 Response Format

### Successful Response

```json
{
  "date": "2025-09-12",
  "currency": "USD",
  "buyRate": 42.5,
  "sellRate": 43.5,
  "source": "BCU"
}
```

### Error Response

```json
{
  "error": "No exchange rate data available for the specified date",
  "code": "NO_DATA_FOUND",
  "timestamp": "2025-09-13T10:30:00.000Z"
}
```

### Health Check Response

```json
{
  "status": "OK",
  "service": "BCU USD Exchange Rate API",
  "version": "2.0.0",
  "environment": "production",
  "timestamp": "2025-09-13T16:00:00.000Z",
  "uptime": 3600.123,
  "memory": {
    "used": 45.67,
    "total": 128.0
  }
}
```

## 🌐 Environment Variables

| Variable   | Default      | Description                                    |
| ---------- | ------------ | ---------------------------------------------- |
| `PORT`     | `3000`       | Server listening port                          |
| `NODE_ENV` | `production` | Environment mode (`development`, `production`) |

## ⚙️ Technical Details

### BCU Integration

The API integrates with three BCU SOAP web services:

- **Currencies**: Currency code resolution for "DÓLAR USA BILLETE"
- **Exchange Rates**: Historical and current exchange rate data
- **Last Closing**: Most recent closing rate with fallback mechanism

### Key Implementation Notes

- **Date Handling**: Supports single-date queries (returns object) and date-range queries (returns array)
- **Error Codes**: BCU error code 100 indicates no data for date (weekends/holidays) → returns HTTP 404
- **Retry Logic**: Automatic retry mechanism for transient network errors
- **Fallback Strategy**: Latest endpoint tries primary service, then scans up to 31 days back
- **Currency Matching**: Searches for USD using normalized text patterns ("DOLAR USA", "DLS USA", etc.)

## 🏗️ Architecture Highlights

### Modern Node.js Patterns

- **ES Modules**: Native ESM with `"type": "module"`
- **Async/Await**: Modern asynchronous programming
- **Express Middleware**: Modular request processing pipeline
- **Structured Errors**: Consistent error handling across all layers

### Code Quality

- **Prettier Integration**: Automated code formatting
- **Modular Design**: Clear separation of concerns
- **Configuration Management**: Centralized environment handling
- **Logging System**: Structured logs with appropriate levels

### Production Ready

- **Docker Optimized**: Multi-stage builds and security best practices
- **Health Monitoring**: Built-in health check endpoints
- **Graceful Shutdown**: Proper cleanup on termination signals
- **Memory Management**: Efficient resource usage

## 🧪 Testing Scenarios

Test the API with different scenarios:

```bash
# Valid business days (should return data)
curl "http://localhost:3000/usd-rate?date=2025-09-12"

# Weekends/holidays (should return 404)
curl "http://localhost:3000/usd-rate?date=2025-09-14"

# Future dates (should return 404)
curl "http://localhost:3000/usd-rate?date=2025-12-31"

# Invalid date format (should return 400)
curl "http://localhost:3000/usd-rate?date=invalid-date"

# Latest endpoint (should always return recent data)
curl "http://localhost:3000/usd-rate/latest"
```

## 🚨 Common Issues

### Port Conflicts

If port 3000 is occupied (e.g., by OrbStack):

```bash
PORT=3000 npm start
```

### Network Issues

Ensure outbound internet access to BCU domains:

- `cotizaciones.bcu.gub.uy`

### Date Format

Always use `YYYY-MM-DD` format for date queries.

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature-name`
3. **Format** your code: `npm run format`
4. **Test** your changes thoroughly
5. **Submit** a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🛠️ Changelog

### v2.1.0 (API v2 - Multi-Currency Support)

- ✨ **NEW**: Multi-currency API v2 supporting USD, EUR, ARS, BRL, and more
- ✨ **NEW**: Currency discovery endpoint (`/api/v2/currencies`)
- ✨ **NEW**: Bulk currency queries (get multiple currencies in one request)
- ✨ **NEW**: Historical data endpoint (date range queries)
- ✨ **NEW**: Support for both local and international currency groups
- ✨ Enhanced service layer with generic currency functions
- ✨ Currency mapping system with slugs (e.g., `usd-cash`, `eur`)
- ✅ Full backward compatibility with v1 endpoints
- 📚 Comprehensive API documentation

### v2.0.0

- ✨ Complete architecture refactor to modular design
- ✨ Added health check endpoints
- ✨ Integrated Prettier and ESLint for code quality
- ✨ Modern ES modules and Node.js 20+ support
- ✨ Enhanced error handling and logging
- ✨ Docker optimization and security improvements
- ✨ Legacy endpoint redirects for backward compatibility
- 🗑️ Removed monolithic server.js structure

---

**Built with ❤️ for the Uruguayan development community**

For detailed development information, see [CLAUDE.md](./CLAUDE.md).
