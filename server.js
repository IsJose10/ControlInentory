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

    try {
        // --- API REST ENDPOINTS ---

        // CLIENTES
        if (pathname === '/api/clientes') {
            if (req.method === 'GET') {
                const rows = db.getClientes();
                return sendJSON(res, 200, rows);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.createCliente(body.nit, body.nombre, body.telefono, body.direccion, body.correo);
                return sendJSON(res, 200, result);
            }
        }

        // PROVEEDORES
        if (pathname === '/api/proveedores') {
            if (req.method === 'GET') {
                const rows = db.getProveedores();
                return sendJSON(res, 200, rows);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.createProveedor(body.nit, body.nombre, body.telefono, body.direccion, body.correo);
                return sendJSON(res, 200, result);
            }
        }

        // PRODUCTOS
        if (pathname === '/api/productos') {
            if (req.method === 'GET') {
                const rows = db.getProductos();
                return sendJSON(res, 200, rows);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.createProducto(
                    body.codigo, body.descripcion, body.peso, body.valor_venta, 
                    body.marca, body.alto, body.largo, body.ancho, body.unidad_compra, body.unidad_consumo
                );
                return sendJSON(res, 200, result);
            }
        }

        // ÓRDENES DE COMPRA
        if (pathname === '/api/compras') {
            if (req.method === 'GET') {
                const rows = db.getCompras();
                return sendJSON(res, 200, rows);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.createCompra(body);
                return sendJSON(res, 200, result);
            }
        }

        // ÓRDENES DE SERVICIO
        if (pathname === '/api/servicios') {
            if (req.method === 'GET') {
                const rows = db.getServicios();
                return sendJSON(res, 200, rows);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.createServicio(body);
                return sendJSON(res, 200, result);
            }
        }

        // VENTAS (REMISIÓN / FACTURA)
        if (pathname === '/api/ventas') {
            if (req.method === 'GET') {
                const rows = db.getVentas();
                return sendJSON(res, 200, rows);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.createVenta(body);
                return sendJSON(res, 200, result);
            }
        }

        // CONSOLIDADO DIARIO DE VENTAS
        if (pathname === '/api/ventas/consolidado') {
            if (req.method === 'GET') {
                const fecha = parsedUrl.searchParams.get('fecha');
                if (!fecha) {
                    return sendJSON(res, 400, { error: 'Falta el parámetro de fecha' });
                }
                const result = db.getConsolidado(fecha);
                return sendJSON(res, 200, result);
            }
        }

        // PRE-ALISTAMIENTO DE PICKING POR FACTURA
        if (pathname === '/api/ventas/picking') {
            if (req.method === 'GET') {
                const remision = parsedUrl.searchParams.get('remision');
                if (!remision) {
                    return sendJSON(res, 400, { error: 'Falta el parámetro de remision' });
                }
                const result = db.getPicking(remision);
                return sendJSON(res, 200, result);
            }
        }

        // CONFIRMAR ALISTAMIENTO / PICKING
        if (pathname === '/api/ventas/confirmar-picking') {
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.confirmarPicking(body.remision, body.itemsDespachados, body.auxiliar);
                return sendJSON(res, 200, result);
            }
        }

        // MOVIMIENTOS DE INVENTARIO POR REFERENCIA
        if (pathname === '/api/inventario/movimientos/referencia') {
            if (req.method === 'GET') {
                const referencia = parsedUrl.searchParams.get('referencia');
                if (!referencia) {
                    return sendJSON(res, 400, { error: 'Falta el parámetro de referencia' });
                }
                const rows = db.getMovimientosReferencia(referencia);
                return sendJSON(res, 200, rows);
            }
        }

        // MOVIMIENTOS DE INVENTARIO (RECIBO - IN)
        if (pathname === '/api/inventario/movimientos') {
            if (req.method === 'GET') {
                const rows = db.getMovimientos();
                return sendJSON(res, 200, rows);
            }
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                const result = db.createMovimiento(body);
                return sendJSON(res, 200, result);
            }
        }

        // STOCK GLOBAL CONSOLIDADO DE INVENTARIO
        if (pathname === '/api/inventario/stock') {
            if (req.method === 'GET') {
                const rows = db.getStockGlobal();
                return sendJSON(res, 200, rows);
            }
        }

        // STOCK DE TODOS LOS PRODUCTOS POR UBICACIÓN
        if (pathname === '/api/inventario/stock/ubicaciones') {
            if (req.method === 'GET') {
                const rows = db.getStockUbicaciones();
                return sendJSON(res, 200, rows);
            }
        }

        // STOCK DETALLADO POR UBICACIÓN DE UN PRODUCTO
        if (pathname === '/api/inventario/stock/detalle') {
            if (req.method === 'GET') {
                const codigo = parsedUrl.searchParams.get('codigo');
                if (!codigo) {
                    return sendJSON(res, 400, { error: 'Falta el código del producto' });
                }
                const rows = db.getStockDetalle(codigo);
                return sendJSON(res, 200, rows);
            }
        }

        // --- NUEVOS ENDPOINTS ADICIONALES ---

        // STOCK EN POSICIONES AUXILIARES (10/14)
        if (pathname === '/api/inventario/stock/auxiliar') {
            if (req.method === 'GET') {
                const codigo = parsedUrl.searchParams.get('codigo');
                if (!codigo) {
                    return sendJSON(res, 400, { error: 'Falta el código del producto' });
                }
                const stockAux = db.getStockAuxiliar(codigo);
                return sendJSON(res, 200, { stock_auxiliar: stockAux });
            }
        }

        // CARGA CIEGA DE INVENTARIO GENERAL
        if (pathname === '/api/inventario/inventario-general') {
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                if (!body.items || !Array.isArray(body.items)) {
                    return sendJSON(res, 400, { error: 'Formato de inventario inválido.' });
                }
                const result = db.saveInventarioGeneral(body.items);
                return sendJSON(res, 200, result);
            }
        }

        // DESCENSO MONTACARGAS
        if (pathname === '/api/inventario/descenso') {
            if (req.method === 'POST') {
                const body = await getRequestBody(req);
                if (!body.codigo || isNaN(body.cantidad) || body.cantidad <= 0) {
                    return sendJSON(res, 400, { error: 'Código de producto o cantidad inválidos para el descenso.' });
                }
                const result = db.ejecutarDescenso(body.codigo, body.cantidad);
                return sendJSON(res, 200, result);
            }
        }

    } catch (err) {
        console.error('Error procesando API:', err);
        return sendJSON(res, 500, { error: err.message });
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

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  HABITAD WMS SERVER CORRIENDO LOCALMENTE`);
    console.log(`  URL de la aplicación: http://localhost:${PORT}`);
    console.log(`==================================================`);
});
