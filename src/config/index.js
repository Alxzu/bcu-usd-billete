/**
 * Application Configuration
 * Central configuration for all environment variables and constants
 */

export const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'production',
  },

  // BCU Web Service Endpoints
  bcu: {
    wsdl: {
      exchangeRates:
        'https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones?wsdl',
      currencies:
        'https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcumonedas?wsdl',
      lastClosing:
        'https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsultimocierre?wsdl',
    },

    // Group 2 = Local Exchange Rates (according to BCU documentation)
    localExchangeRatesGroup: 2,

    // Maximum days to look back for latest rate fallback
    maxDaysLookback: 31,
  },

  // Application Constants
  app: {
    name: 'BCU USD Exchange Rate API',
    version: '2.0.0',
  },
};
