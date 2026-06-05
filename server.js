const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db.js');

function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
    });
}

function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// Mapeo estructurado de rutas API (método + endpoint) a controladores asíncronos
const apiRoutes = {
    // CLIENTES
    'GET /api/clientes': async (req, res) => {
        const rows = await db.getClientes();
        return sendJSON(res, 200, rows);
    },
    'POST /api/clientes': async (req, res) => {
        const body = await getRequestBody(req);
        const result = await db.createCliente(body.nit, body.nombre, body.telefono, body.direccion, body.correo);
        return sendJSON(res, 200, result);
    },

    // PROVEEDORES
    'GET /api/proveedores': async (req, res) => {
        const rows = await db.getProveedores();
        return sendJSON(res, 200, rows);
    },
    'POST /api/proveedores': async (req, res) => {
        const body = await getRequestBody(req);
        const result = await db.createProveedor(body.nit, body.nombre, body.telefono, body.direccion, body.correo);
        return sendJSON(res, 200, result);
    },

    // PRODUCTOS
    'GET /api/productos': async (req, res) => {
        const rows = await db.getProductos();
        return sendJSON(res, 200, rows);
    },
    'POST /api/productos': async (req, res) => {
        const body = await getRequestBody(req);
        const result = await db.createProducto(
            body.codigo, body.descripcion, body.peso, body.valor_venta, 
            body.marca, body.alto, body.largo, body.ancho, body.unidad_compra, body.unidad_consumo
        );
        return sendJSON(res, 200, result);
    },

    // ÓRDENES DE COMPRA
    'GET /api/compras': async (req, res) => {
        const rows = await db.getCompras();
        return sendJSON(res, 200, rows);
    },
    'POST /api/compras': async (req, res) => {
        const body = await getRequestBody(req);
        const result = await db.createCompra(body);
        return sendJSON(res, 200, result);
    },

    // VENTAS (REMISIÓN / FACTURA)
    'GET /api/ventas': async (req, res) => {
        const rows = await db.getVentas();
        return sendJSON(res, 200, rows);
    },
    'POST /api/ventas': async (req, res) => {
        const body = await getRequestBody(req);
        const result = await db.createVenta(body);
        return sendJSON(res, 200, result);
    },

    // CONSOLIDADO DIARIO DE VENTAS
    'GET /api/ventas/consolidado': async (req, res, parsedUrl) => {
        const fecha = parsedUrl.searchParams.get('fecha');
        if (!fecha) {
            return sendJSON(res, 400, { error: 'Falta el parámetro de fecha' });
        }
        const result = await db.getConsolidado(fecha);
        return sendJSON(res, 200, result);
    },

    // PRE-ALISTAMIENTO DE PICKING POR FACTURA
    'GET /api/ventas/picking': async (req, res, parsedUrl) => {
        const remision = parsedUrl.searchParams.get('remision');
        if (!remision) {
            return sendJSON(res, 400, { error: 'Falta el parámetro de remision' });
        }
        const result = await db.getPicking(remision);
        return sendJSON(res, 200, result);
    },

    // CONFIRMAR ALISTAMIENTO / PICKING
    'POST /api/ventas/confirmar-picking': async (req, res) => {
        const body = await getRequestBody(req);
        const result = await db.confirmarPicking(body.remision, body.itemsDespachados, body.auxiliar);
        return sendJSON(res, 200, result);
    },

    // MOVIMIENTOS DE INVENTARIO POR REFERENCIA
    'GET /api/inventario/movimientos/referencia': async (req, res, parsedUrl) => {
        const referencia = parsedUrl.searchParams.get('referencia');
        if (!referencia) {
            return sendJSON(res, 400, { error: 'Falta el parámetro de referencia' });
        }
        const rows = await db.getMovimientosReferencia(referencia);
        return sendJSON(res, 200, rows);
    },

    // MOVIMIENTOS DE INVENTARIO (RECIBO - IN)
    'GET /api/inventario/movimientos': async (req, res) => {
        const rows = await db.getMovimientos();
        return sendJSON(res, 200, rows);
    },
    'POST /api/inventario/movimientos': async (req, res) => {
        const body = await getRequestBody(req);
        const result = await db.createMovimiento(body);
        return sendJSON(res, 200, result);
    },

    // STOCK GLOBAL CONSOLIDADO DE INVENTARIO
    'GET /api/inventario/stock': async (req, res) => {
        const rows = await db.getStockGlobal();
        return sendJSON(res, 200, rows);
    },

    // STOCK DE TODOS LOS PRODUCTOS POR UBICACIÓN
    'GET /api/inventario/stock/ubicaciones': async (req, res) => {
        const rows = await db.getStockUbicaciones();
        return sendJSON(res, 200, rows);
    },

    // STOCK DETALLADO POR UBICACIÓN DE UN PRODUCTO
    'GET /api/inventario/stock/detalle': async (req, res, parsedUrl) => {
        const codigo = parsedUrl.searchParams.get('codigo');
        if (!codigo) {
            return sendJSON(res, 400, { error: 'Falta el código del producto' });
        }
        const rows = await db.getStockDetalle(codigo);
        return sendJSON(res, 200, rows);
    },

    // STOCK EN POSICIONES AUXILIARES (10/14)
    'GET /api/inventario/stock/auxiliar': async (req, res, parsedUrl) => {
        const codigo = parsedUrl.searchParams.get('codigo');
        if (!codigo) {
            return sendJSON(res, 400, { error: 'Falta el código del producto' });
        }
        const stockAux = await db.getStockAuxiliar(codigo);
        return sendJSON(res, 200, { stock_auxiliar: stockAux });
    },

    // CARGA CIEGA DE INVENTARIO GENERAL
    'POST /api/inventario/inventario-general': async (req, res) => {
        const body = await getRequestBody(req);
        if (!body.items || !Array.isArray(body.items)) {
            return sendJSON(res, 400, { error: 'Formato de inventario inválido.' });
        }
        const result = await db.saveInventarioGeneral(body.items);
        return sendJSON(res, 200, result);
    },

    // DESCENSO MONTACARGAS
    'POST /api/inventario/descenso': async (req, res) => {
        const body = await getRequestBody(req);
        if (!body.codigo || isNaN(body.cantidad) || body.cantidad <= 0) {
            return sendJSON(res, 400, { error: 'Código de producto o cantidad inválidos para el descenso.' });
        }
        const result = await db.ejecutarDescenso(body.codigo, body.cantidad);
        return sendJSON(res, 200, result);
    },

    // REGULARIZACIÓN - LISTADO DE CONTEO ZONA PICKING (posición < 20)
    'GET /api/inventario/regularizacion/picking': async (req, res) => {
        const rows = await db.getRegularizacionPicking();
        return sendJSON(res, 200, rows);
    },

    // REGULARIZACIÓN - LISTADO DE CONTEO ZONA MONTACARGUISTA (posición >= 20)
    'GET /api/inventario/regularizacion/montacarguista': async (req, res) => {
        const rows = await db.getRegularizacionMontacarguista();
        return sendJSON(res, 200, rows);
    },

    // REGULARIZACIÓN - APLICAR AJUSTES DE RONDA FINAL (transaccional)
    'POST /api/inventario/regularizacion/aplicar': async (req, res) => {
        const body = await getRequestBody(req);
        if (!body.ajustes || !Array.isArray(body.ajustes)) {
            return sendJSON(res, 400, { error: 'Formato de ajustes inválido.' });
        }
        const result = await db.aplicarAjusteRegularizacion(body.ajustes, body.zona);
        return sendJSON(res, 200, result);
    }
};

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // --- MANEJO DE ENDPOINTS DE LA API ---
    if (pathname.startsWith('/api/')) {
        const routeKey = `${req.method} ${pathname}`;
        const handler = apiRoutes[routeKey];
        if (handler) {
            try {
                return await handler(req, res, parsedUrl);
            } catch (err) {
                console.error(`Error procesando API (${routeKey}):`, err);
                return sendJSON(res, 500, { error: err.message || 'Error interno en el servidor.' });
            }
        } else {
            return sendJSON(res, 404, { error: `Endpoint de API no encontrado: ${routeKey}` });
        }
    }

    // --- MANEJO DE ARCHIVOS ESTÁTICOS (FRONTEND) ---
    const reqPath = pathname;
    const publicDir = path.join(__dirname, 'client');
    let filePath = path.join(publicDir, reqPath === '/' ? 'index.html' : reqPath);

    // Evitar Traversal Directory
    if (!filePath.startsWith(publicDir)) {
        res.writeHead(403);
        res.end('Acceso denegado');
        return;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Archivo no encontrado');
            } else {
                res.writeHead(500);
                res.end('Error interno de servidor: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = process.env.PORT || 3000;

// Inicializar la Base de Datos antes de encender el servidor
db.initDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`==================================================`);
            console.log(`  HABITAD WMS SERVER CORRIENDO LOCALMENTE`);
            console.log(`  URL de la aplicación: http://localhost:${PORT}`);
            console.log(`==================================================`);
        });
    })
    .catch(err => {
        console.error("CRITICAL: Falló la inicialización de la base de datos:", err);
        process.exit(1);
    });
