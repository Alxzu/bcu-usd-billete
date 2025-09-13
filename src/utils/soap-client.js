/**
 * SOAP Client Utility
 * Generic utility for invoking BCU SOAP methods with fallback handling
 */

import soap from 'soap';
import { logger } from './logger.js';

/**
 * Generic method to invoke BCU SOAP methods with fallback method names
 * BCU services have inconsistent method naming across different WSDL versions
 * This utility tries multiple possible method names until one succeeds
 *
 * @param {Object} client - SOAP client instance
 * @param {string[]} methodNames - Array of possible method names to try
 * @param {Object} args - Arguments to pass to the SOAP method
 * @returns {Promise<Object|null>} Response object or null if all methods failed
 */
export async function invokeSOAPMethod(client, methodNames, args) {
  /**
   * Resolve async method from client, checking both top-level and nested service/port structure
   * @param {Object} c - SOAP client
   * @param {string} name - Method name to look for
   * @returns {Function|null} Bound async method or null if not found
   */
  const resolveAsyncMethod = (c, name) => {
    // Check top-level method
    if (typeof c?.[name + 'Async'] === 'function') {
      return c[name + 'Async'].bind(c);
    }

    // Check nested service/port structure
    for (const serviceName of Object.keys(c || {})) {
      const service = c[serviceName];
      if (!service || typeof service !== 'object') {
        continue;
      }

      for (const portName of Object.keys(service)) {
        const port = service[portName];
        if (port && typeof port[name + 'Async'] === 'function') {
          return port[name + 'Async'].bind(port);
        }
      }
    }
    return null;
  };

  // Try each method name until one succeeds
  for (const methodName of methodNames) {
    const asyncFunction = resolveAsyncMethod(client, methodName);
    if (asyncFunction) {
      try {
        logger.debug(`Attempting SOAP method: ${methodName}`, args);
        const response = await asyncFunction(args);
        const result = Array.isArray(response) ? response[0] : response;
        logger.debug(`SOAP method ${methodName} succeeded`, result);
        return result;
      } catch (error) {
        logger.warn(
          `SOAP method ${methodName} failed, trying next`,
          error.message
        );
      }
    } else {
      logger.debug(`SOAP method ${methodName} not found in client`);
    }
  }

  logger.error(`All SOAP methods failed for: ${methodNames.join(', ')}`);
  return null;
}

/**
 * Create SOAP client with error handling and retry logic
 * @param {string} wsdlUrl - WSDL URL
 * @param {number} retries - Number of retries (default: 3)
 * @returns {Promise<Object>} SOAP client
 */
export async function createSOAPClient(wsdlUrl, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.debug(
        `Creating SOAP client (attempt ${attempt}/${retries}): ${wsdlUrl}`
      );
      const client = await soap.createClientAsync(wsdlUrl);
      logger.debug(`SOAP client created successfully: ${wsdlUrl}`);
      return client;
    } catch (error) {
      lastError = error;
      logger.warn(
        `SOAP client creation failed (attempt ${attempt}/${retries})`,
        error.message
      );

      if (attempt < retries) {
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        logger.debug(`Waiting ${waitTime}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(
    `Failed to create SOAP client after ${retries} attempts: ${lastError.message}`
  );
}
