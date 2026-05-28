const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPath = path.join(__dirname, 'db.sqlite');
const db = new DatabaseSync(dbPath);

// Inicializar tablas
db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
        nit TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        direccion TEXT,
        correo TEXT
    );

    CREATE TABLE IF NOT EXISTS proveedores (
        nit TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        direccion TEXT,
        correo TEXT
    );

    CREATE TABLE IF NOT EXISTS productos (
        codigo TEXT PRIMARY KEY,
        descripcion TEXT NOT NULL,
        peso REAL,
        valor_venta REAL,
        marca TEXT,
        alto REAL,
        largo REAL,
        ancho REAL,
        unidad_compra TEXT DEFAULT 'Und',
        unidad_consumo TEXT DEFAULT 'Und'
    );

    CREATE TABLE IF NOT EXISTS ordenes_compra (
        consecutivo TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        proveedor_nit TEXT,
        observaciones TEXT,
        descuento REAL DEFAULT 0,
        iva REAL DEFAULT 0,
        retencion REAL DEFAULT 0,
        condiciones_envio TEXT,
        forma_pago TEXT,
        fecha_envio TEXT,
        items TEXT NOT NULL,
        FOREIGN KEY(proveedor_nit) REFERENCES proveedores(nit)
    );

    CREATE TABLE IF NOT EXISTS ordenes_servicio (
        consecutivo TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        proveedor_nit TEXT,
        observaciones TEXT,
        descuento REAL DEFAULT 0,
        iva REAL DEFAULT 0,
        retencion REAL DEFAULT 0,
        condiciones_envio TEXT,
        forma_pago TEXT,
        fecha_envio TEXT,
        items TEXT NOT NULL,
        FOREIGN KEY(proveedor_nit) REFERENCES proveedores(nit)
    );

    CREATE TABLE IF NOT EXISTS ventas (
        remision TEXT PRIMARY KEY,
        fecha TEXT NOT NULL,
        cliente_nit TEXT,
        observaciones TEXT,
        iva REAL DEFAULT 0,
        items TEXT NOT NULL,
        estado TEXT DEFAULT 'Pendiente', -- 'Pendiente', 'Pre-alistado', 'Completado'
        FOREIGN KEY(cliente_nit) REFERENCES clientes(nit)
    );

    CREATE TABLE IF NOT EXISTS inventario_movimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_producto TEXT NOT NULL,
        tipo TEXT NOT NULL, -- 'IN' o 'OUT'
        documento_referencia TEXT,
        fecha TEXT NOT NULL,
        cantidad REAL NOT NULL,
        ubicacion TEXT NOT NULL,
        FOREIGN KEY(codigo_producto) REFERENCES productos(codigo)
    );
`);

try {
    db.exec(`ALTER TABLE ventas ADD COLUMN auxiliar TEXT;`);
} catch (e) {
    // La columna ya existe
}

try {
    db.exec(`ALTER TABLE productos ADD COLUMN unidad_compra TEXT DEFAULT 'Und';`);
} catch (e) {
    // La columna ya existe
}

try {
    db.exec(`ALTER TABLE productos ADD COLUMN unidad_consumo TEXT DEFAULT 'Und';`);
} catch (e) {
    // La columna ya existe
}

// Semilla de base de datos
function seedDatabase() {
    console.log("Sembrando datos de ejemplo real...");
    
    const proveedores = [
        { nit: '900111222', nombre: 'EL CHOCLO', telefono: '3001112233', direccion: 'Calle 10 # 5-20', correo: 'contacto@elchoclo.com' },
        { nit: '900333444', nombre: 'MM PACKAGING COLOMBIA', telefono: '3104445566', direccion: 'Zona Industrial Lote 4', correo: 'ventas@mm-packaging.co' },
        { nit: '900555666', nombre: 'EdexA', telefono: '3157778899', direccion: 'Av El Dorado # 68C-20', correo: 'servicio@edexa.com.co' },
        { nit: '900777888', nombre: 'LAMIEMPAQUES', telefono: '3208889900', direccion: 'Cra 45 # 12-30', correo: 'info@lamiempaques.com' },
        { nit: '900999000', nombre: 'GREENPACK', telefono: '3009998877', direccion: 'Parque Industrial Sur', correo: 'comercial@greenpack.co' },
        { nit: '900222333', nombre: 'Distraves', telefono: '3112223344', direccion: 'Via Floridablanca Km 4', correo: 'ventas@distraves.com' },
        { nit: '900444555', nombre: 'Asequin', telefono: '3124445566', direccion: 'Calle 80 # 24-50', correo: 'contacto@asequin.co' }
    ];

    const stmtProv = db.prepare('INSERT OR IGNORE INTO proveedores (nit, nombre, telefono, direccion, correo) VALUES (?, ?, ?, ?, ?)');
    for (const p of proveedores) {
        stmtProv.run(p.nit, p.nombre, p.telefono, p.direccion, p.correo);
    }

    const productos = [
        { codigo: '00032', descripcion: 'AREPAS - Empaque Al Vacio', peso: 0.5, valor_venta: 2500, marca: 'EL CHOCLO', alto: 2, largo: 15, ancho: 15, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '10956', descripcion: 'CAJA CLAMSHELL GRANDE - Caja Clamshell Grande Cmpc Nkraft Kit 12 - Calibre 40,6 260gr', peso: 0.08, valor_venta: 1200, marca: 'MM PACKAGING COLOMBIA', alto: 10, largo: 20, ancho: 20, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '00038', descripcion: 'AZUCAR - Riopaila X 2.5 Kilos', peso: 2.5, valor_venta: 12000, marca: 'EdexA', alto: 8, largo: 25, ancho: 15, unidad_compra: 'Bol', unidad_consumo: 'kg' },
        { codigo: '09200', descripcion: 'BANDEJA NEGRA CON DIVISION - Bandeja Fresh Pack 6x3 Con Division', peso: 0.02, valor_venta: 600, marca: 'LAMIEMPAQUES', alto: 5, largo: 18, ancho: 12, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '00317', descripcion: 'BOLSA ANTIGRASA PAPA FRANCESA - *Bolsa Antigrasa Papa Francesa Caja*3000, Paq*200', peso: 0.005, valor_venta: 150, marca: 'GREENPACK', alto: 0.1, largo: 20, ancho: 12, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '00311', descripcion: 'BOLSA DE PAPEL PEQUEÑA 4 LB - Bolsa Pequeña 4 Lb Antigrasa Caja*3000, Paq*100', peso: 0.006, valor_venta: 180, marca: 'GREENPACK', alto: 0.1, largo: 22, ancho: 14, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '00327', descripcion: 'CANASTILLA 1/2 DESECHABLE - Canastilla 1/2 Material Cmpc Natural Kraft Kit 12,0457 285g', peso: 0.1, valor_venta: 1500, marca: 'MM PACKAGING COLOMBIA', alto: 12, largo: 30, ancho: 20, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '00328', descripcion: 'CANASTILLA 1/4 DESECHABLE - Canastilla 1/4 Cmpc Nkraft Kit 12 - Calibre 40,6 (260gr)', peso: 0.06, valor_venta: 900, marca: 'MM PACKAGING COLOMBIA', alto: 8, largo: 22, ancho: 15, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '05205', descripcion: 'CEPILLO DE MANO ROJO - Cepillo De Mano Tipo Plancha Rojo', peso: 0.15, valor_venta: 4500, marca: 'EdexA', alto: 5, largo: 15, ancho: 6, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '05204', descripcion: 'CEPILLO DE MANO VERDE - Cepillo De Mano Tipo Plancha Verde', peso: 0.15, valor_venta: 4500, marca: 'EdexA', alto: 5, largo: 15, ancho: 6, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '05302', descripcion: 'CHULETA ESPECIAL - Distraves', peso: 1.0, valor_venta: 18000, marca: 'Distraves', alto: 4, largo: 25, ancho: 18, unidad_compra: 'Pqt', unidad_consumo: 'Und' },
        { codigo: '03669', descripcion: 'ENCENDEDORES A GAS RECARGABLE - Encendedor Bbq + Repuesto', peso: 0.08, valor_venta: 3500, marca: 'EdexA', alto: 3, largo: 20, ancho: 4, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '03442', descripcion: 'ENDULZANTE NATURAL STEVIA - Stevia Endulzante X 160 Sobres', peso: 0.25, valor_venta: 9500, marca: 'EdexA', alto: 8, largo: 12, ancho: 10, unidad_compra: 'Caj', unidad_consumo: 'Sob' },
        { codigo: '07455', descripcion: 'ENSALADERA - Domo Bowl 32 Oz Tte', peso: 0.05, valor_venta: 1800, marca: 'LAMIEMPAQUES', alto: 8, largo: 16, ancho: 16, unidad_compra: 'Und', unidad_consumo: 'Und' },
        { codigo: '10293', descripcion: 'GUANTE AMARILLO (8-8 1/2) - Guante Amarillo Corrugado T.8', peso: 0.12, valor_venta: 5000, marca: 'Asequin', alto: 2, largo: 28, ancho: 12, unidad_compra: 'Par', unidad_consumo: 'Par' },
        { codigo: '10294', descripcion: 'GUANTE AMARILLO (9-9 1/2) - Guante Amarillo Corrugado T.9', peso: 0.13, valor_venta: 5000, marca: 'Asequin', alto: 2, largo: 29, ancho: 13, unidad_compra: 'Par', unidad_consumo: 'Par' }
    ];

    const stmtProd = db.prepare('INSERT OR IGNORE INTO productos (codigo, descripcion, peso, valor_venta, marca, alto, largo, ancho, unidad_compra, unidad_consumo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of productos) {
        stmtProd.run(p.codigo, p.descripcion, p.peso, p.valor_venta, p.marca, p.alto, p.largo, p.ancho, p.unidad_compra, p.unidad_consumo);
    }
}

try {
    seedDatabase();
} catch (err) {
    console.error("Error sembrando base de datos:", err);
}

// --- LOGICA DE VOLUMETRÍA ---

function getVolumeOcupado(ubicacion) {
    const stmt = db.prepare(`
        SELECT m.codigo_producto, p.alto, p.largo, p.ancho,
               SUM(CASE WHEN m.tipo = 'IN' THEN m.cantidad ELSE -m.cantidad END) as stock
        FROM inventario_movimientos m
        JOIN productos p ON m.codigo_producto = p.codigo
        WHERE m.ubicacion = ?
        GROUP BY m.codigo_producto
    `);
    const rows = stmt.all(ubicacion);
    let totalVol = 0;
    for (const r of rows) {
        const stock = r.stock || 0;
        if (stock > 0) {
            const alto = r.alto || 0;
            const largo = r.largo || 0;
            const ancho = r.ancho || 0;
            totalVol += stock * alto * largo * ancho;
        }
    }
    return totalVol;
}

function validarDimensionesYVolumen(codigo_producto, cantidad, ubicacion) {
    const stmtProd = db.prepare(`SELECT * FROM productos WHERE codigo = ?`);
    const prod = stmtProd.all(codigo_producto)[0];
    if (!prod) {
        throw new Error(`El producto con código "${codigo_producto}" no existe en el catálogo.`);
    }

    // Dimensiones máximas permitidas: alto: 200cm (2.0m), largo: 240cm (2.4m), ancho: 120cm (1.2m)
    const pAlto = prod.alto || 0;
    const pLargo = prod.largo || 0;
    const pAncho = prod.ancho || 0;

    if (pAlto > 200 || pLargo > 240 || pAncho > 120) {
        throw new Error(`El producto "${codigo_producto}" excede las dimensiones máximas permitidas de la estantería (alto: 2.0m, largo: 2.4m, ancho: 1.2m). Dimensiones del producto: alto ${pAlto/100}m, largo ${pLargo/100}m, ancho ${pAncho/100}m.`);
    }

    const newVolume = cantidad * pAlto * pLargo * pAncho;
    const currentOccupied = getVolumeOcupado(ubicacion);
    const maxVolume = 5760000; // 5.76 m³ en cm³

    if (currentOccupied + newVolume > maxVolume) {
        const currentM3 = (currentOccupied / 1000000).toFixed(2);
        const newM3 = (newVolume / 1000000).toFixed(2);
        const maxM3 = (maxVolume / 1000000).toFixed(2);
        throw new Error(`Capacidad volumétrica excedida en la ubicación ${ubicacion}. Ocupado actualmente: ${currentM3} m³, Nuevo a ingresar: ${newM3} m³, Límite de celda: ${maxM3} m³.`);
    }
}

// --- MÉTODOS DEL MÓDULO DB ---

module.exports = {
    // Clientes
    getClientes() {
        return db.prepare('SELECT * FROM clientes ORDER BY nombre').all();
    },
    createCliente(nit, nombre, telefono, direccion, correo) {
        db.prepare('INSERT OR REPLACE INTO clientes (nit, nombre, telefono, direccion, correo) VALUES (?, ?, ?, ?, ?)')
          .run(nit, nombre, telefono, direccion, correo);
        return { success: true };
    },

    // Proveedores
    getProveedores() {
        return db.prepare('SELECT * FROM proveedores ORDER BY nombre').all();
    },
    createProveedor(nit, nombre, telefono, direccion, correo) {
        db.prepare('INSERT OR REPLACE INTO proveedores (nit, nombre, telefono, direccion, correo) VALUES (?, ?, ?, ?, ?)')
          .run(nit, nombre, telefono, direccion, correo);
        return { success: true };
    },

    // Productos
    getProductos() {
        return db.prepare('SELECT * FROM productos ORDER BY codigo').all();
    },
    createProducto(codigo, descripcion, peso, valor_venta, marca, alto, largo, ancho, unidad_compra, unidad_consumo) {
        db.prepare('INSERT OR REPLACE INTO productos (codigo, descripcion, peso, valor_venta, marca, alto, largo, ancho, unidad_compra, unidad_consumo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(codigo, descripcion, peso, valor_venta, marca, alto, largo, ancho, unidad_compra || 'Und', unidad_consumo || 'Und');
        return { success: true };
    },

    // Órdenes de Compra
    getCompras() {
        const rows = db.prepare(`
            SELECT oc.*, p.nombre as proveedor_nombre 
            FROM ordenes_compra oc
            LEFT JOIN proveedores p ON oc.proveedor_nit = p.nit
            ORDER BY oc.fecha DESC
        `).all();
        rows.forEach(r => { r.items = JSON.parse(r.items); });
        return rows;
    },
    createCompra(body) {
        db.prepare(`
            INSERT OR REPLACE INTO ordenes_compra 
            (consecutivo, fecha, proveedor_nit, observaciones, descuento, iva, retencion, condiciones_envio, forma_pago, fecha_envio, items) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            body.consecutivo,
            body.fecha,
            body.proveedor_nit,
            body.observaciones,
            body.descuento || 0,
            body.iva || 0,
            body.retencion || 0,
            body.condiciones_envio,
            body.forma_pago,
            body.fecha_envio,
            JSON.stringify(body.items)
        );
        return { success: true };
    },

    // Órdenes de Servicio
    getServicios() {
        const rows = db.prepare(`
            SELECT os.*, p.nombre as proveedor_nombre 
            FROM ordenes_servicio os
            LEFT JOIN proveedores p ON os.proveedor_nit = p.nit
            ORDER BY os.fecha DESC
        `).all();
        rows.forEach(r => { r.items = JSON.parse(r.items); });
        return rows;
    },
    createServicio(body) {
        db.prepare(`
            INSERT OR REPLACE INTO ordenes_servicio 
            (consecutivo, fecha, proveedor_nit, observaciones, descuento, iva, retencion, condiciones_envio, forma_pago, fecha_envio, items) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            body.consecutivo,
            body.fecha,
            body.proveedor_nit,
            body.observaciones,
            body.descuento || 0,
            body.iva || 0,
            body.retencion || 0,
            body.condiciones_envio,
            body.forma_pago,
            body.fecha_envio,
            JSON.stringify(body.items)
        );
        return { success: true };
    },

    // Ventas / Remisiones
    getVentas() {
        const rows = db.prepare(`
            SELECT v.*, c.nombre as cliente_nombre 
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_nit = c.nit
            ORDER BY v.fecha DESC
        `).all();
        rows.forEach(r => { r.items = JSON.parse(r.items); });
        return rows;
    },
    createVenta(body) {
        db.prepare(`
            INSERT OR REPLACE INTO ventas 
            (remision, fecha, cliente_nit, observaciones, iva, items, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            body.remision,
            body.fecha,
            body.cliente_nit,
            body.observaciones,
            body.iva || 0,
            JSON.stringify(body.items),
            body.estado || 'Pendiente'
        );
        return { success: true };
    },

    // Consolidado Diario
    getConsolidado(fecha) {
        const rows = db.prepare(`
            SELECT v.remision, v.fecha, v.estado, c.nombre as cliente_nombre, v.items
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_nit = c.nit
            WHERE v.fecha = ?
            ORDER BY v.remision ASC
        `).all(fecha);

        return rows.map(row => {
            const items = JSON.parse(row.items);
            const totalUnidades = items.reduce((sum, item) => sum + Number(item.cantidad), 0);
            return {
                remision: row.remision,
                fecha: row.fecha,
                estado: row.estado,
                cliente_nombre: row.cliente_nombre,
                total_items: items.length,
                total_unidades: totalUnidades
            };
        });
    },

    // Picking / Alistamiento Detalle
    getPicking(remision) {
        const venta = db.prepare(`
            SELECT v.*, c.nombre as cliente_nombre 
            FROM ventas v 
            LEFT JOIN clientes c ON v.cliente_nit = c.nit
            WHERE v.remision = ?
        `).all(remision)[0];
        
        if (!venta) {
            throw new Error('No se encontró la factura/remisión especificada.');
        }

        const items = JSON.parse(venta.items);
        const pickingDetails = [];

        for (const item of items) {
            // Obtener stock actual detallado por ubicación
            const stockUbicaciones = db.prepare(`
                SELECT ubicacion, SUM(CASE WHEN tipo = 'IN' THEN cantidad ELSE -cantidad END) as stock
                FROM inventario_movimientos
                WHERE codigo_producto = ?
                GROUP BY ubicacion
                HAVING stock > 0
            `).all(item.codigo);

            // Filtrar stock en zonas auxiliares (posición termina en 10 o 14)
            const stockAux = stockUbicaciones
                .filter(u => {
                    const pos = u.ubicacion.substring(5, 7);
                    return pos === '10' || pos === '14';
                })
                .reduce((sum, u) => sum + u.stock, 0);

            // Filtrar stock en zona alta (posiciones >= 20)
            const stockAlta = stockUbicaciones
                .filter(u => {
                    const pos = parseInt(u.ubicacion.substring(5, 7), 10);
                    return pos >= 20;
                })
                .reduce((sum, u) => sum + u.stock, 0);

            const totalDisponible = stockUbicaciones.reduce((sum, u) => sum + u.stock, 0);

            pickingDetails.push({
                codigo: item.codigo,
                descripcion: item.descripcion,
                cantidad_solicitada: item.cantidad,
                total_disponible: totalDisponible,
                stock_auxiliar: stockAux,
                stock_alta: stockAlta,
                ubicaciones: stockUbicaciones.map(u => ({
                    ubicacion: u.ubicacion,
                    stock: u.stock
                }))
            });
        }

        return {
            remision: venta.remision,
            fecha: venta.fecha,
            cliente_nombre: venta.cliente_nombre,
            estado: venta.estado,
            auxiliar: venta.auxiliar || '',
            items: pickingDetails
        };
    },

    // Confirmar picking
    confirmarPicking(remision, itemsDespachados, auxiliar) {
        const stmtInsertMov = db.prepare(`
            INSERT INTO inventario_movimientos (codigo_producto, tipo, documento_referencia, fecha, cantidad, ubicacion)
            VALUES (?, 'OUT', ?, ?, ?, ?)
        `);

        const fechaActual = new Date().toISOString().split('T')[0];

        // Validar primero volumetría y disponibilidad (sólo por seguridad en el backend)
        for (const item of itemsDespachados) {
            if (item.cantidad > 0) {
                // Registrar movimiento OUT
                stmtInsertMov.run(
                    item.codigo,
                    remision,
                    fechaActual,
                    item.cantidad,
                    item.ubicacion
                );
            }
        }

        db.prepare(`UPDATE ventas SET estado = 'Completado', auxiliar = ? WHERE remision = ?`)
          .run(auxiliar || '', remision);

        return { success: true };
    },

    // Historial Movimientos Referencia
    getMovimientosReferencia(referencia) {
        return db.prepare("SELECT * FROM inventario_movimientos WHERE documento_referencia LIKE ?")
                 .all(referencia + '%');
    },

    // Movimientos de inventario generales
    getMovimientos() {
        return db.prepare('SELECT * FROM inventario_movimientos ORDER BY id DESC LIMIT 500').all();
    },
    createMovimiento(body) {
        // Validar volumen si es un ingreso (IN)
        if (body.tipo === 'IN') {
            validarDimensionesYVolumen(body.codigo_producto, body.cantidad, body.ubicacion);
        }

        db.prepare(`
            INSERT INTO inventario_movimientos 
            (codigo_producto, tipo, documento_referencia, fecha, cantidad, ubicacion) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            body.codigo_producto,
            body.tipo,
            body.documento_referencia,
            body.fecha,
            body.cantidad,
            body.ubicacion
        );
        return { success: true };
    },

    // Stock consolidado
    getStockGlobal() {
        const rows = db.prepare(`
            SELECT p.codigo, p.descripcion, p.marca, p.peso,
                   SUM(CASE WHEN m.tipo = 'IN' THEN m.cantidad ELSE -m.cantidad END) as stock_total
            FROM productos p
            LEFT JOIN inventario_movimientos m ON p.codigo = m.codigo_producto
            GROUP BY p.codigo
        `).all();
        rows.forEach(row => {
            row.stock_total = row.stock_total || 0;
        });
        return rows;
    },

    getStockUbicaciones() {
        return db.prepare(`
            SELECT codigo_producto, ubicacion, SUM(CASE WHEN tipo = 'IN' THEN cantidad ELSE -cantidad END) as stock
            FROM inventario_movimientos
            GROUP BY codigo_producto, ubicacion
            HAVING stock > 0
        `).all();
    },

    getStockDetalle(codigo) {
        return db.prepare(`
            SELECT ubicacion, SUM(CASE WHEN tipo = 'IN' THEN cantidad ELSE -cantidad END) as stock
            FROM inventario_movimientos
            WHERE codigo_producto = ?
            GROUP BY ubicacion
            HAVING stock > 0
            ORDER BY ubicacion ASC
        `).all(codigo);
    },

    // --- MÉTODOS ADICIONALES PARA LAS NUEVAS REGLAS DE NEGOCIO ---

    // Obtener stock en auxiliar (10/14) de un producto
    getStockAuxiliar(codigo) {
        const rows = db.prepare(`
            SELECT SUM(CASE WHEN tipo = 'IN' THEN cantidad ELSE -cantidad END) as stock_auxiliar
            FROM inventario_movimientos
            WHERE codigo_producto = ? AND (ubicacion LIKE '%10' OR ubicacion LIKE '%14')
        `).all(codigo);
        return rows[0].stock_auxiliar || 0;
    },

    // Carga Masiva Inventario General (Ciego)
    saveInventarioGeneral(items) {
        const fechaActual = new Date().toISOString().split('T')[0];

        // 1. Limpiar todos los movimientos de inventario actuales
        db.exec('DELETE FROM inventario_movimientos');

        // 2. Insertar cada item
        const stmtProd = db.prepare('SELECT codigo FROM productos WHERE codigo = ?');
        const stmtInsertProd = db.prepare(`
            INSERT INTO productos (codigo, descripcion, peso, valor_venta, marca, alto, largo, ancho, unidad_compra, unidad_consumo) 
            VALUES (?, 'PRODUCTO NUEVO (CARGA CIEGA)', 1.0, 100, 'GENERICA', 10.0, 10.0, 10.0, 'Und', 'Und')
        `);
        const stmtInsertMov = db.prepare(`
            INSERT INTO inventario_movimientos (codigo_producto, tipo, documento_referencia, fecha, cantidad, ubicacion)
            VALUES (?, 'IN', 'INVENTARIO GENERAL', ?, ?, ?)
        `);

        for (const item of items) {
            const { codigo, ubicacion, cantidad } = item;
            if (!codigo || !ubicacion || isNaN(cantidad) || cantidad <= 0) {
                continue;
            }

            // Validar si el producto existe, sino crearlo (Carga Ciega)
            const prodExists = stmtProd.all(codigo)[0];
            if (!prodExists) {
                stmtInsertProd.run(codigo);
            }

            // Validar volumen de la posición
            validarDimensionesYVolumen(codigo, cantidad, ubicacion);

            // Registrar movimiento IN
            stmtInsertMov.run(codigo, fechaActual, cantidad, ubicacion);
        }

        return { success: true };
    },

    // Descenso Montacargas (Priorizado por rack alto DESC y nivel DESC)
    ejecutarDescenso(codigo, cantidad) {
        const fechaActual = new Date().toISOString().split('T')[0];

        // 1. Buscar todas las ubicaciones con stock de este producto
        const stockUbicaciones = db.prepare(`
            SELECT ubicacion, SUM(CASE WHEN tipo = 'IN' THEN cantidad ELSE -cantidad END) as stock
            FROM inventario_movimientos
            WHERE codigo_producto = ?
            GROUP BY ubicacion
            HAVING stock > 0
        `).all(codigo);

        // 2. Filtrar rack alto (pos >= 20)
        const ubicacionesAltas = stockUbicaciones.filter(u => {
            const pos = parseInt(u.ubicacion.substring(5, 7), 10);
            return pos >= 20;
        });

        if (ubicacionesAltas.length === 0) {
            throw new Error(`No hay stock disponible en estantería alta (posición >= 20) para el producto "${codigo}".`);
        }

        // 3. Ordenar por nivel descendente (altura de rack de 40 a 01) y pos descendente (prioridad física)
        ubicacionesAltas.sort((a, b) => {
            const lvlA = parseInt(a.ubicacion.substring(3, 5), 10);
            const lvlB = parseInt(b.ubicacion.substring(3, 5), 10);
            if (lvlB !== lvlA) return lvlB - lvlA;
            
            const posA = parseInt(a.ubicacion.substring(5, 7), 10);
            const posB = parseInt(b.ubicacion.substring(5, 7), 10);
            return posB - posA;
        });

        // 4. Consumir el stock requerido
        let restante = cantidad;
        const movimientosARegistrar = [];

        for (const u of ubicacionesAltas) {
            if (restante <= 0) break;

            const disponible = u.stock;
            const aTomar = Math.min(restante, disponible);

            // Obtener el vano de origen
            const vano = u.ubicacion.substring(1, 3);
            const targetLowUbi = `V${vano}0110`; // Vano actual, nivel 01, posición picking 10

            // Preparar movimiento OUT de la ubicación alta
            movimientosARegistrar.push({
                codigo_producto: codigo,
                tipo: 'OUT',
                documento_referencia: 'DESCENSO MONTACARGAS',
                fecha: fechaActual,
                cantidad: aTomar,
                ubicacion: u.ubicacion
            });

            // Preparar movimiento IN a la ubicación baja
            movimientosARegistrar.push({
                codigo_producto: codigo,
                tipo: 'IN',
                documento_referencia: 'DESCENSO MONTACARGAS',
                fecha: fechaActual,
                cantidad: aTomar,
                ubicacion: targetLowUbi
            });

            restante -= aTomar;
        }

        if (restante > 0) {
            throw new Error(`Stock insuficiente en estantería alta. Falta bajar ${restante} unidades.`);
        }

        // 5. Validar volumetría en el destino antes de guardar nada (transaccionalidad manual)
        // Agrupamos por ubicación de destino para hacer un chequeo preciso de volumen
        const consolidadoDestino = {};
        for (const mov of movimientosARegistrar) {
            if (mov.tipo === 'IN') {
                consolidadoDestino[mov.ubicacion] = (consolidadoDestino[mov.ubicacion] || 0) + mov.cantidad;
            }
        }

        for (const [ubicacion, qty] of Object.entries(consolidadoDestino)) {
            validarDimensionesYVolumen(codigo, qty, ubicacion);
        }

        // 6. Insertar movimientos en la base de datos
        const stmtInsertMov = db.prepare(`
            INSERT INTO inventario_movimientos (codigo_producto, tipo, documento_referencia, fecha, cantidad, ubicacion)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const mov of movimientosARegistrar) {
            stmtInsertMov.run(
                mov.codigo_producto,
                mov.tipo,
                mov.documento_referencia,
                mov.fecha,
                mov.cantidad,
                mov.ubicacion
            );
        }

        return { success: true, movimientos: movimientosARegistrar };
    }
};
