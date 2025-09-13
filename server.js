import express from "express";
import dayjs from "dayjs";
import soap from "soap";

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoints SOAP (según la especificación del BCU)
const WSDL_COTIZACIONES =
  "https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcucotizaciones?wsdl";
const WSDL_MONEDAS =
  "https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsbcumonedas?wsdl";
const WSDL_ULTIMO_CIERRE =
  "https://cotizaciones.bcu.gub.uy/wscotizaciones/servlet/awsultimocierre?wsdl";

// Grupo 2 = Cotizaciones Locales (según doc)
const GRUPO_COTIZACIONES_LOCALES = 2;

// Utilidad: normaliza cadenas para comparar
const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();

async function invocarMetodo(client, nombres, args) {
  // helper: locate method both at top-level and under service/port
  const resolveAsync = (c, name) => {
    if (typeof c?.[name + "Async"] === "function") return c[name + "Async"].bind(c);
    for (const svcName of Object.keys(c || {})) {
      const svc = c[svcName];
      if (!svc || typeof svc !== "object") continue;
      for (const portName of Object.keys(svc)) {
        const port = svc[portName];
        if (port && typeof port[name + "Async"] === "function") {
          return port[name + "Async"].bind(port);
        }
      }
    }
    return null;
  };

  for (const m of nombres) {
    const asyncFn = resolveAsync(client, m);
    if (asyncFn) {
      try {
        const resp = await asyncFn(args);
        if (Array.isArray(resp)) return resp[0];
        return resp;
      } catch (e) {
        // probar siguiente nombre
      }
    }
  }
  return null;
}

/**
 * Obtiene el código de moneda para "DÓLAR USA BILLETE" dentro del Grupo 2.
 * Si hay múltiples variantes, prioriza las que contengan "BILLETE".
 */
async function obtenerCodigoMonedaUSD() {
  const client = await soap.createClientAsync(WSDL_MONEDAS);
  // Según WSDL, el elemento de entrada es "Entrada" con tipo "wsmonedasin"
  const args = { Entrada: { Grupo: GRUPO_COTIZACIONES_LOCALES } };

  const result = await invocarMetodo(client, [
    "Execute",
    "awsbcumonedas",
    "execute",
    "WSBCUMONEDAS",
    "WSCotizacionesMonedas",
  ], args);

  if (!result) {
    throw new Error("No se pudo invocar awsbcumonedas (WSDL de monedas).");
  }

  // Adaptado según la estructura real del servicio que devuelve:
  // { Salida: { 'wsmonedasout.Linea': [ {Codigo, Nombre}, ... ] } }
  const lista =
    result?.Salida?.['wsmonedasout.Linea'] ||
    result?.wsmonedasout?.Monedas ||
    result?.wsmonedasout ||
    result?.return?.Monedas ||
    result?.return ||
    [];

const items = Array.isArray(lista) ? lista : Object.values(lista || {});
  // Aquí normalizamos para buscar tanto "DOLAR USA" como "DLS. USA" (formato en BCU)
  const candidatos = items.filter((it) => {
    const normalizedName = norm(it?.Nombre);
    return normalizedName.includes("DOLAR USA") || normalizedName.includes("DLS USA") || normalizedName.includes("DLS. USA");
  });
  if (candidatos.length === 0) {
    console.error("Monedas disponibles:", items.map(it => it?.Nombre).join(", "));
    throw new Error("No se encontró 'DÓLAR USA/DLS. USA' dentro del Grupo 2.");
  }
  const conBillete = candidatos.find((it) => norm(it?.Nombre).includes("BILLETE"));
  const elegido = conBillete || candidatos[0];
  const codigo = Number(elegido?.Codigo);
  if (!Number.isFinite(codigo)) {
    throw new Error("Código de moneda inválido.");
  }
  return { codigo, nombre: elegido?.Nombre };
}

/**
 * Consulta cotización para una moneda y fecha (mismo día como desde/hasta).
 * Devuelve el primer registro coincidente de ese día para la moneda y grupo.
 */
async function obtenerCotizacionPorFecha(monedaCodigo, fechaISO) {
  const client = await soap.createClientAsync(WSDL_COTIZACIONES);
  const args = {
    Entrada: {
      Moneda: { item: [monedaCodigo] },
      FechaDesde: fechaISO,
      FechaHasta: fechaISO,
      Grupo: GRUPO_COTIZACIONES_LOCALES,
    },
  };

  const result = await invocarMetodo(client, [
    "Execute",
    "awsbcucotizaciones",
    "execute",
    "WSBCUCOTIZACIONES",
    "WSCotizaciones",
  ], args);

  if (!result) {
    throw new Error("No se pudo invocar awsbcucotizaciones.");
  }


  const status =
    result?.Salida?.respuestastatus ||
    result?.wsbcucotizacionesout?.respuestastatus ||
    result?.respuestastatus ||
    result?.return?.respuestastatus;

  const codErr = Number(status?.codigoerror ?? status?.Codigoerror ?? status?.Codigoerr ?? status?.Codigo ?? 0);
  
  if (Number.isFinite(codErr) && codErr !== 0) {
    if (codErr === 100) return null; // no existe cotización para la fecha
    const msg = status?.Mensaje || status?.mensaje || "Error del servicio de cotizaciones";
    throw new Error(`Código ${codErr}: ${msg}`);
  }

  const datos =
    result?.Salida?.datoscotizaciones?.['datoscotizaciones.dato'] ||
    result?.Salida?.datoscotizaciones ||
    result?.wsbcucotizacionesout?.datoscotizaciones ||
    result?.datoscotizaciones ||
    result?.return?.datoscotizaciones ||
    [];

  // Handle both single object and array responses
  let lista;
  if (Array.isArray(datos)) {
    lista = datos;
  } else if (datos && typeof datos === 'object') {
    // For single date queries, the response is a single object, not an array
    lista = [datos];
  } else {
    lista = Object.values(datos || {});
  }
  
  const registro = lista.find(
    (r) =>
      Number(r?.Moneda) === Number(monedaCodigo) &&
      dayjs(r?.Fecha).format("YYYY-MM-DD") === fechaISO
  );
  

  if (!registro) return null;

  return {
    fecha: dayjs(registro.Fecha).format("YYYY-MM-DD"),
    moneda: registro?.Nombre,
    codigoISO: registro?.CodigoISO,
    emisor: registro?.Emisor,
    compra: Number(registro?.TCC),
    venta: Number(registro?.TCV),
    arbitraje: registro?.ArbAct != null ? Number(registro.ArbAct) : null,
    formaArbitrar: registro?.FormaArbitrar ?? null,
  };
}

/**
 * Obtiene el último cierre disponible para cotizaciones locales.
 * Intentamos usar el WSDL awsultimocierre; si falla, caemos a buscar
 * hacia atrás hasta 31 días y devolvemos el último día con cotización.
 */
async function obtenerUltimoCierreUSD(monedaCodigo) {
  // 1) Intento directo por servicio de último cierre
  try {
    const client = await soap.createClientAsync(WSDL_ULTIMO_CIERRE);
    const args = { wsultimocierrein: { Grupo: GRUPO_COTIZACIONES_LOCALES } };
    const result = await invocarMetodo(client, [
      "awsultimocierre",
      "execute",
      "WSULTIMOCIERRE",
      "WSUltimoCierre",
    ], args);
    const fechaSrv =
      result?.wsultimocierreout?.UltimoCierre ||
      result?.UltimoCierre ||
      result?.return?.UltimoCierre;
    if (fechaSrv) {
      const fechaISO = dayjs(fechaSrv).format("YYYY-MM-DD");
      const cotiz = await obtenerCotizacionPorFecha(monedaCodigo, fechaISO);
      if (cotiz) return cotiz;
    }
  } catch (_) {
    // ignore and fallback
  }

  // 2) Fallback: buscar hacia atrás hasta 31 días
  const hoy = dayjs().format("YYYY-MM-DD");
  const desde = dayjs().subtract(31, "day").format("YYYY-MM-DD");
  const client = await soap.createClientAsync(WSDL_COTIZACIONES);
  const args = {
    Entrada: {
      Moneda: { item: [monedaCodigo] },
      FechaDesde: desde,
      FechaHasta: hoy,
      Grupo: GRUPO_COTIZACIONES_LOCALES,
    },
  };
  const result = await invocarMetodo(client, [
    "Execute",
    "awsbcucotizaciones",
    "execute",
    "WSBCUCOTIZACIONES",
    "WSCotizaciones",
  ], args);

  if (!result) {
    throw new Error("No se pudo invocar awsbcucotizaciones (fallback último cierre).");
  }
  const datos =
    result?.Salida?.datoscotizaciones?.['datoscotizaciones.dato'] ||
    result?.Salida?.datoscotizaciones ||
    result?.wsbcucotizacionesout?.datoscotizaciones ||
    result?.datoscotizaciones ||
    result?.return?.datoscotizaciones ||
    [];

  const lista = Array.isArray(datos) ? datos : Object.values(datos || {});
  // ordenar por fecha descendente y tomar el primero
  const ordenado = lista
    .filter((r) => Number(r?.Moneda) === Number(monedaCodigo))
    .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));

  if (ordenado.length === 0) return null;

  const r = ordenado[0];
  return {
    fecha: dayjs(r.Fecha).format("YYYY-MM-DD"),
    moneda: r?.Nombre,
    codigoISO: r?.CodigoISO,
    emisor: r?.Emisor,
    compra: Number(r?.TCC),
    venta: Number(r?.TCV),
    arbitraje: r?.ArbAct != null ? Number(r.ArbAct) : null,
    formaArbitrar: r?.FormaArbitrar ?? null,
  };
}

// Endpoint REST: GET /usd-billete?date=YYYY-MM-DD
app.get("/usd-billete", async (req, res) => {
  try {
    const dateParam = req.query.date;
    if (!dateParam) {
      return res
        .status(400)
        .json({ error: "Falta el parámetro 'date' en formato YYYY-MM-DD" });
    }
    const fecha = dayjs(dateParam, "YYYY-MM-DD", true);
    if (!fecha.isValid()) {
      return res
        .status(400)
        .json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD." });
    }

    const fechaISO = fecha.format("YYYY-MM-DD");
    const { codigo, nombre } = await obtenerCodigoMonedaUSD();
    const cotiz = await obtenerCotizacionPorFecha(codigo, fechaISO);

    if (!cotiz) {
      return res.status(404).json({
        error:
          "No hay cotización para la fecha indicada (puede ser feriado, fin de semana o fuera del rango).",
        moneda: nombre,
        fecha: fechaISO,
      });
    }

    return res.json({
      moneda: nombre,
      fecha: cotiz.fecha,
      codigoISO: cotiz.codigoISO,
      emisor: cotiz.emisor,
      compra: cotiz.compra,
      venta: cotiz.venta,
      fuente:
        "Banco Central del Uruguay - Web Services de Cotizaciones (awsbcumonedas / awsbcucotizaciones)",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error:
        "Ocurrió un error al consultar el servicio del BCU. Verifica conectividad y que los WSDL estén disponibles.",
      detalle: err?.message || String(err),
    });
  }
});

// Endpoint REST: GET /usd-billete/latest  -> último cierre disponible
app.get("/usd-billete/latest", async (req, res) => {
  try {
    const { codigo, nombre } = await obtenerCodigoMonedaUSD();
    const cotiz = await obtenerUltimoCierreUSD(codigo);
    if (!cotiz) {
      return res.status(404).json({
        error: "No se pudo determinar el último cierre.",
        moneda: nombre
      });
    }
    return res.json({
      moneda: nombre,
      fecha: cotiz.fecha,
      codigoISO: cotiz.codigoISO,
      emisor: cotiz.emisor,
      compra: cotiz.compra,
      venta: cotiz.venta,
      fuente:
        "Banco Central del Uruguay - Web Services de Cotizaciones (awsultimocierre / awsbcucotizaciones)",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Ocurrió un error al consultar el último cierre.",
      detalle: err?.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`BCU USD Billete API escuchando en http://localhost:${PORT}`);
});
