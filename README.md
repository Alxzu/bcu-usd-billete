# BCU USD Billete API (con Docker)

API en Node.js para consultar el valor de **DÓLAR USA billete** del BCU por fecha específica y para el **último cierre** disponible.

## Requisitos
- Node.js 18+ (si corres sin Docker)
- Internet de salida hacia dominios de BCU

## Endpoints

- `GET /usd-billete?date=YYYY-MM-DD` — Cotización compra/venta para el día indicado.
- `GET /usd-billete/latest` — Último cierre disponible (intenta usar `awsultimocierre` y, si falla, hace fallback buscando hacia atrás).

Ejemplos:
```bash
curl "http://localhost:3000/usd-billete?date=2025-09-12"
curl "http://localhost:3000/usd-billete/latest"
```

## Correr local (sin Docker)
```bash
npm install
npm start
```

## Docker
### Build
```bash
docker build -t bcu-usd-billete:latest .
```

### Run
```bash
docker run --rm -p 3000:3000 bcu-usd-billete:latest
```

Luego accede a:
- http://localhost:3000/usd-billete?date=2025-09-12
- http://localhost:3000/usd-billete/latest

## Notas
- Grupo **2** = *Cotizaciones Locales*.
- Si consultas un día sin datos (feriado o fin de semana), `/usd-billete?date=...` devolverá `404`.
- El endpoint `/usd-billete/latest` intenta primero `awsultimocierre`; si no está disponible, usa un rango de hasta 31 días hacia atrás con `awsbcucotizaciones` y devuelve el último día con registro.
