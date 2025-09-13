/**
 * BCU Service Layer
 * Handles all interactions with BCU SOAP web services
 */

import dayjs from 'dayjs';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { normalizeString } from '../utils/helpers.js';
import { createSOAPClient, invokeSOAPMethod } from '../utils/soap-client.js';

/**
 * Get the currency code for USD cash within Group 2 (Local Exchange Rates)
 * Prioritizes entries containing "CASH" or "BILLETE"
 *
 * @returns {Promise<{code: number, name: string}>} Currency code and name
 * @throws {Error} If USD currency not found or SOAP service fails
 */
export async function getUSDCurrencyCode() {
  const client = await createSOAPClient(config.bcu.wsdl.currencies);
  const args = { Entrada: { Grupo: config.bcu.localExchangeRatesGroup } };

  const result = await invokeSOAPMethod(
    client,
    [
      'Execute',
      'awsbcumonedas',
      'execute',
      'WSBCUMONEDAS',
      'WSCotizacionesMonedas',
    ],
    args
  );

  if (!result) {
    throw new Error(
      'Failed to invoke BCU currencies web service (awsbcumonedas)'
    );
  }

  // Extract currency list from various possible response structures
  const currencyList =
    result?.Salida?.['wsmonedasout.Linea'] ||
    result?.wsmonedasout?.Monedas ||
    result?.wsmonedasout ||
    result?.return?.Monedas ||
    result?.return ||
    [];

  const currencies = Array.isArray(currencyList)
    ? currencyList
    : Object.values(currencyList || {});

  // Search for USD using normalized text matching
  const usdCandidates = currencies.filter(currency => {
    const normalizedName = normalizeString(currency?.Nombre);
    const originalName = currency?.Nombre || '';
    return (
      normalizedName.includes('DOLAR USA') ||
      normalizedName.includes('DLS USA') ||
      normalizedName.includes('DLS. USA') ||
      originalName.includes('DLS. USA')
    );
  });

  if (usdCandidates.length === 0) {
    logger.error(
      'Available currencies:',
      currencies.map(c => c?.Nombre).join(', ')
    );
    throw new Error(
      'USD currency not found within Group 2 (Local Exchange Rates)'
    );
  }

  // Prioritize entries containing "CASH" or "BILLETE"
  const cashEntry = usdCandidates.find(
    currency =>
      normalizeString(currency?.Nombre).includes('BILLETE') ||
      normalizeString(currency?.Nombre).includes('CASH')
  );

  const selectedCurrency = cashEntry || usdCandidates[0];
  const code = Number(selectedCurrency?.Codigo);

  if (!Number.isFinite(code)) {
    throw new Error('Invalid currency code received from BCU service');
  }

  logger.info(
    `Selected USD currency: ${selectedCurrency?.Nombre} (Code: ${code})`
  );
  return { code, name: selectedCurrency?.Nombre };
}

/**
 * Query exchange rate for a specific currency and date
 *
 * @param {number} currencyCode - BCU currency code
 * @param {string} dateISO - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Exchange rate data or null if no data available
 * @throws {Error} If SOAP service fails or returns error
 */
export async function getExchangeRateByDate(currencyCode, dateISO) {
  const client = await createSOAPClient(config.bcu.wsdl.exchangeRates);
  const args = {
    Entrada: {
      Moneda: { item: [currencyCode] },
      FechaDesde: dateISO,
      FechaHasta: dateISO,
      Grupo: config.bcu.localExchangeRatesGroup,
    },
  };

  const result = await invokeSOAPMethod(
    client,
    [
      'Execute',
      'awsbcucotizaciones',
      'execute',
      'WSBCUCOTIZACIONES',
      'WSCotizaciones',
    ],
    args
  );

  if (!result) {
    throw new Error(
      'Failed to invoke BCU exchange rates web service (awsbcucotizaciones)'
    );
  }

  logger.debug('BCU SOAP response received', result);

  // Check response status for errors
  const status =
    result?.Salida?.respuestastatus ||
    result?.wsbcucotizacionesout?.respuestastatus ||
    result?.respuestastatus ||
    result?.return?.respuestastatus;

  const errorCode = Number(
    status?.codigoerror ??
      status?.Codigoerror ??
      status?.Codigoerr ??
      status?.Codigo ??
      0
  );

  if (Number.isFinite(errorCode) && errorCode !== 0) {
    if (errorCode === 100) {
      logger.info(`No exchange rate data available for date: ${dateISO}`);
      return null; // No data available for this date (normal for weekends/holidays)
    }
    const message =
      status?.Mensaje || status?.mensaje || 'BCU web service error';
    throw new Error(`BCU Error ${errorCode}: ${message}`);
  }

  // Extract exchange rate data from response
  const exchangeData =
    result?.Salida?.datoscotizaciones?.['datoscotizaciones.dato'] ||
    result?.Salida?.datoscotizaciones ||
    result?.wsbcucotizacionesout?.datoscotizaciones ||
    result?.datoscotizaciones ||
    result?.return?.datoscotizaciones ||
    [];

  // Handle both single object and array responses
  // Single date queries return object, date ranges return array
  let dataList;
  if (Array.isArray(exchangeData)) {
    dataList = exchangeData;
  } else if (exchangeData && typeof exchangeData === 'object') {
    dataList = [exchangeData]; // Wrap single object in array
  } else {
    dataList = Object.values(exchangeData || {});
  }

  // Find matching record for the requested currency and date
  const record = dataList.find(
    r =>
      Number(r?.Moneda) === Number(currencyCode) &&
      dayjs(r?.Fecha).format('YYYY-MM-DD') === dateISO
  );

  if (!record) {
    logger.debug(
      `No matching record found for currency ${currencyCode} on ${dateISO}`
    );
    return null;
  }

  // Return standardized exchange rate object
  return {
    date: dayjs(record.Fecha).format('YYYY-MM-DD'),
    currency: record?.Nombre,
    isoCode: record?.CodigoISO,
    issuer: record?.Emisor,
    buyRate: Number(record?.TCC),
    sellRate: Number(record?.TCV),
    arbitrage: record?.ArbAct !== null ? Number(record.ArbAct) : null,
    arbitrageMethod: record?.FormaArbitrar ?? null,
  };
}

/**
 * Get the latest available exchange rate for USD
 * First tries the last closing service, then falls back to scanning recent dates
 *
 * @param {number} currencyCode - BCU currency code
 * @returns {Promise<Object|null>} Latest exchange rate data or null if not found
 * @throws {Error} If SOAP service fails
 */
export async function getLatestUSDExchangeRate(currencyCode) {
  // Strategy 1: Try direct last closing service
  try {
    logger.debug('Attempting to get latest rate via last closing service');
    const client = await createSOAPClient(config.bcu.wsdl.lastClosing);
    const args = {
      wsultimocierrein: { Grupo: config.bcu.localExchangeRatesGroup },
    };

    const result = await invokeSOAPMethod(
      client,
      ['awsultimocierre', 'execute', 'WSULTIMOCIERRE', 'WSUltimoCierre'],
      args
    );

    const lastClosingDate =
      result?.wsultimocierreout?.UltimoCierre ||
      result?.UltimoCierre ||
      result?.return?.UltimoCierre;

    if (lastClosingDate) {
      const dateISO = dayjs(lastClosingDate).format('YYYY-MM-DD');
      const exchangeRate = await getExchangeRateByDate(currencyCode, dateISO);
      if (exchangeRate) {
        logger.info(`Latest rate found via last closing service: ${dateISO}`);
        return exchangeRate;
      }
    }
  } catch (error) {
    logger.warn(
      'Last closing service failed, using fallback method',
      error.message
    );
  }

  // Strategy 2: Fallback - scan last N days for most recent data
  logger.debug('Using fallback method to find latest rate');
  const today = dayjs().format('YYYY-MM-DD');
  const startDate = dayjs()
    .subtract(config.bcu.maxDaysLookback, 'day')
    .format('YYYY-MM-DD');

  const client = await createSOAPClient(config.bcu.wsdl.exchangeRates);
  const args = {
    Entrada: {
      Moneda: { item: [currencyCode] },
      FechaDesde: startDate,
      FechaHasta: today,
      Grupo: config.bcu.localExchangeRatesGroup,
    },
  };

  const result = await invokeSOAPMethod(
    client,
    [
      'Execute',
      'awsbcucotizaciones',
      'execute',
      'WSBCUCOTIZACIONES',
      'WSCotizaciones',
    ],
    args
  );

  if (!result) {
    throw new Error(
      'Failed to invoke BCU exchange rates web service (fallback method)'
    );
  }

  // Extract data from response
  const exchangeData =
    result?.Salida?.datoscotizaciones?.['datoscotizaciones.dato'] ||
    result?.Salida?.datoscotizaciones ||
    result?.wsbcucotizacionesout?.datoscotizaciones ||
    result?.datoscotizaciones ||
    result?.return?.datoscotizaciones ||
    [];

  const dataList = Array.isArray(exchangeData)
    ? exchangeData
    : Object.values(exchangeData || {});

  // Sort by date descending and take the most recent
  const sortedRecords = dataList
    .filter(r => Number(r?.Moneda) === Number(currencyCode))
    .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

  if (sortedRecords.length === 0) {
    logger.warn(
      `No recent exchange rate data found for currency ${currencyCode}`
    );
    return null;
  }

  const latestRecord = sortedRecords[0];
  logger.info(`Latest rate found via fallback method: ${latestRecord.Fecha}`);

  return {
    date: dayjs(latestRecord.Fecha).format('YYYY-MM-DD'),
    currency: latestRecord?.Nombre,
    isoCode: latestRecord?.CodigoISO,
    issuer: latestRecord?.Emisor,
    buyRate: Number(latestRecord?.TCC),
    sellRate: Number(latestRecord?.TCV),
    arbitrage:
      latestRecord?.ArbAct !== null ? Number(latestRecord.ArbAct) : null,
    arbitrageMethod: latestRecord?.FormaArbitrar ?? null,
  };
}
