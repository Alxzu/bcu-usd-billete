/**
 * Utility script to discover all currencies available from BCU
 * This helps us understand what currencies we can offer in our API
 */

import { createSOAPClient, invokeSOAPMethod } from '../src/utils/soap-client.js';
import { logger } from '../src/utils/logger.js';

const BCU_WSDL = {
  currencies: 'https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcumonedas?wsdl',
};

async function discoverAllCurrencies() {
  try {
    console.log('Discovering all currencies from BCU...\n');

    // Query both Group 0 (International) and Group 2 (Local)
    const groups = [
      { id: 0, name: 'International Exchange Rates' },
      { id: 2, name: 'Local Exchange Rates' }
    ];

    for (const group of groups) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Group ${group.id}: ${group.name}`);
      console.log('='.repeat(60));

      const client = await createSOAPClient(BCU_WSDL.currencies);
      const args = { Entrada: { Grupo: group.id } };

      const result = await invokeSOAPMethod(
        client,
        ['Execute', 'awsbcumonedas', 'execute', 'WSBCUMONEDAS', 'WSCotizacionesMonedas'],
        args
      );

      if (!result) {
        console.log(`❌ Failed to retrieve currencies for group ${group.id}`);
        continue;
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

      console.log(`\nFound ${currencies.length} currencies:\n`);

      currencies.forEach((currency, index) => {
        console.log(`${index + 1}. ${currency?.Nombre || 'Unknown'}`);
        console.log(`   Code: ${currency?.Codigo}`);
        console.log(`   ISO Code: ${currency?.CodigoISO || 'N/A'}`);
        console.log('');
      });
    }

    console.log('\n✅ Discovery complete!\n');
  } catch (error) {
    logger.error('Error discovering currencies:', error);
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the discovery
discoverAllCurrencies();
