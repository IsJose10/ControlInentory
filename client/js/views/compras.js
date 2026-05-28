import { state } from '../state.js';
import { fetchAPI } from '../api.js';
import { formatoMoneda, readExcelOrCSV, parseNumberString, formatExcelDate } from '../utils.js';

let ocItemCount = 0;
let csvParsedOrders = [];

const ocAliasMap = {
    consecutivo: ['oc #', 'oc', 'consecutivo', 'orden', 'no. orden', 'nro orden', 'orden de compra', 'pedido'],
    fecha: ['fecha', 'fecha oc', 'fecha orden', 'date', 'fecha_emision', 'emision'],
    proveedor_nit: ['tercero', 'proveedor', 'nit proveedor', 'proveedor_nit', 'nit', 'nombre proveedor', 'nombre_proveedor'],
    codigo_producto: ['código', 'codigo', 'codigo producto', 'código producto', 'referencia', 'ref', 'item_code', 'codigo_articulo', 'articulo'],
    descripcion: ['descripción', 'descripcion', 'descripción producto', 'nombre producto', 'detalle', 'item_desc'],
    cantidad: ['cant. pedi.', 'cant pedi', 'cantidad', 'cant', 'cant. reci.', 'cant reci', 'cant_pedida', 'unidades', 'cant.'],
    unidad_compra: ['um. comp.', 'um comp', 'unidad compra', 'unidad_compra', 'uom compra', 'um compra'],
    unidad_consumo: ['um. cons.', 'um cons', 'unidad consumo', 'unidad_consumo', 'uom consumo', 'um consumo'],
    valor_unitario: ['valor_unitario', 'valor unitario', 'precio', 'costo', 'v_unitario', 'v. unitario', 'precio_unitario']
};

export function agregarFilaItemOC(item = null) {
    ocItemCount++;
    const tbody = document.getElementById('oc-items-table-body');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.id = `oc-row-${ocItemCount}`;

    let unitComp = 'Und';
    let unitCons = 'Und';
    if (item) {
        unitComp = item.unidad_compra || 'Und';
        unitCons = item.unidad_consumo || 'Und';
    }

    tr.innerHTML = `
        <td class="text-center oc-row-item-num">${tbody.children.length + 1}</td>
        <td>
            <select class="form-control oc-item-select" onchange="seleccionarProductoFilaOC(${ocItemCount})" style="padding:4px 8px;">
                <option value="">Seleccione...</option>
                ${state.productos.map(p => `<option value="${p.codigo}" ${item && item.codigo === p.codigo ? 'selected' : ''}>${p.codigo}</option>`).join('')}
            </select>
        </td>
        <td>
            <input type="text" class="form-control oc-item-desc" value="${item ? item.descripcion : ''}" style="padding:4px 8px;">
        </td>
        <td>
            <input type="text" class="form-control oc-item-ucomp text-center" value="${unitComp}" readonly style="padding:4px 8px; background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.05); color: var(--text-muted);">
        </td>
        <td>
            <input type="text" class="form-control oc-item-ucons text-center" value="${unitCons}" readonly style="padding:4px 8px; background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.05); color: var(--text-muted);">
        </td>
        <td>
            <input type="number" class="form-control oc-item-qty text-center" value="${item ? item.cantidad : '1'}" oninput="calcularTotalesOC()" style="padding:4px 8px;" min="1" step="any">
        </td>
        <td>
            <input type="number" class="form-control oc-item-unit text-right" value="${item ? item.v_unitario : '0'}" oninput="calcularTotalesOC()" style="padding:4px 8px;" min="0" step="any">
        </td>
        <td class="text-right font-bold oc-item-total">$0.00</td>
        <td class="text-center">
            <button class="btn btn-danger btn-sm" onclick="eliminarFilaItemOC(${ocItemCount})" style="padding:4px 8px;">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
    calcularTotalesOC();
}

export function eliminarFilaItemOC(rowId) {
    const row = document.getElementById(`oc-row-${rowId}`);
    if (row) {
        row.remove();
        const rows = document.querySelectorAll('.oc-row-item-num');
        rows.forEach((td, index) => {
            td.textContent = index + 1;
        });
        calcularTotalesOC();
    }
}

export function seleccionarProductoFilaOC(rowId) {
    const row = document.getElementById(`oc-row-${rowId}`);
    if (!row) return;
    const code = row.querySelector('.oc-item-select').value;
    const prod = state.productos.find(p => p.codigo === code);

    if (prod) {
        row.querySelector('.oc-item-desc').value = prod.descripcion;
        row.querySelector('.oc-item-unit').value = prod.valor_venta || 0;
        row.querySelector('.oc-item-ucomp').value = prod.unidad_compra || 'Und';
        row.querySelector('.oc-item-ucons').value = prod.unidad_consumo || 'Und';
    } else {
        row.querySelector('.oc-item-desc').value = '';
        row.querySelector('.oc-item-unit').value = 0;
        row.querySelector('.oc-item-ucomp').value = 'Und';
        row.querySelector('.oc-item-ucons').value = 'Und';
    }
    calcularTotalesOC();
}

export function cargarDatosProveedorOC() {
    const nit = document.getElementById('oc-proveedor').value;
    const p = state.proveedores.find(x => x.nit === nit);
    const detailDiv = document.getElementById('oc-proveedor-detalles');

    if (p) {
        detailDiv.innerHTML = `
            <div class="flex-1"><strong>Nombre:</strong> ${p.nombre}</div>
            <div class="flex-1"><strong>Teléfono:</strong> ${p.telefono || 'N/A'}</div>
            <div class="flex-1"><strong>Dirección:</strong> ${p.direccion || 'N/A'}</div>
            <div class="flex-1"><strong>Correo:</strong> ${p.correo || 'N/A'}</div>
        `;
    } else {
        detailDiv.innerHTML = '';
    }
}

export function calcularTotalesOC() {
    const rows = document.querySelectorAll('#oc-items-table-body tr');
    let subtotal = 0;

    rows.forEach(row => {
        const qty = Number(row.querySelector('.oc-item-qty').value) || 0;
        const unit = Number(row.querySelector('.oc-item-unit').value) || 0;
        const total = qty * unit;
        subtotal += total;

        row.querySelector('.oc-item-total').textContent = formatoMoneda(total);
    });

    const descuento = Number(document.getElementById('oc-descuento').value) || 0;
    const ivaPct = Number(document.getElementById('oc-iva').value) || 0;
    const retPct = Number(document.getElementById('oc-retencion').value) || 0;

    const baseIVA = Math.max(0, subtotal - descuento);
    const valorIVA = baseIVA * (ivaPct / 100);
    const valorRet = baseIVA * (retPct / 100);
    const totalGeneral = baseIVA + valorIVA - valorRet;

    document.getElementById('oc-total-general').textContent = formatoMoneda(totalGeneral);
}

export function limpiarFormOC() {
    document.getElementById('oc-consecutivo').value = '';
    document.getElementById('oc-observaciones').value = '';
    document.getElementById('oc-descuento').value = '0';
    document.getElementById('oc-iva').value = '19';
    document.getElementById('oc-retencion').value = '0';
    document.getElementById('oc-total-general').textContent = '$0.00';
    document.getElementById('oc-items-table-body').innerHTML = '';
    document.getElementById('oc-proveedor-detalles').innerHTML = '';
    if (window.initDateInputs) {
        window.initDateInputs();
    }

    agregarFilaItemOC();
}

export async function guardarOC() {
    const consecutivo = document.getElementById('oc-consecutivo').value.trim();
    const fecha = document.getElementById('oc-fecha').value;
    const proveedor_nit = document.getElementById('oc-proveedor').value;
    const observaciones = document.getElementById('oc-observaciones').value;
    const descuento = Number(document.getElementById('oc-descuento').value);
    const iva = Number(document.getElementById('oc-iva').value);
    const retencion = Number(document.getElementById('oc-retencion').value);
    const condiciones_envio = document.getElementById('oc-condiciones').value;
    const forma_pago = document.getElementById('oc-forma-pago').value;
    const fecha_envio = document.getElementById('oc-fecha-envio').value;

    if (!consecutivo || !fecha || !proveedor_nit) {
        alert('Por favor complete Consecutivo, Fecha y Proveedor.');
        return;
    }

    const rows = document.querySelectorAll('#oc-items-table-body tr');
    const items = [];

    rows.forEach(row => {
        const num = row.querySelector('.oc-row-item-num').textContent;
        const codigo = row.querySelector('.oc-item-select').value;
        const descripcion = row.querySelector('.oc-item-desc').value;
        const cantidad = Number(row.querySelector('.oc-item-qty').value);
        const v_unitario = Number(row.querySelector('.oc-item-unit').value);
        const unidad_compra = row.querySelector('.oc-item-ucomp').value;
        const unidad_consumo = row.querySelector('.oc-item-ucons').value;

        if (codigo) {
            items.push({ item: num, codigo, descripcion, cantidad, v_unitario, unidad_compra, unidad_consumo });
        }
    });

    if (items.length === 0) {
        alert('Debe agregar al menos un ítem válido.');
        return;
    }

    try {
        await fetchAPI('/compras', 'POST', {
            consecutivo, fecha, proveedor_nit, observaciones, descuento, iva, retencion, condiciones_envio, forma_pago, fecha_envio, items
        });
        alert('Orden de Compra guardada con éxito.');
        limpiarFormOC();
    } catch (err) {
        console.error(err);
    }
}

export async function consultarOCForm() {
    const docId = document.getElementById('consultar-oc-id').value.trim();
    if (!docId) {
        alert('Ingrese el consecutivo de la OC a buscar.');
        return;
    }

    try {
        const ocs = await fetchAPI('/compras') || [];
        const oc = ocs.find(o => o.consecutivo === docId);

        if (!oc) {
            alert(`No se encontró la OC #${docId}`);
            return;
        }

        document.getElementById('oc-consecutivo').value = oc.consecutivo;
        document.getElementById('oc-fecha').value = oc.fecha;
        document.getElementById('oc-fecha-envio').value = oc.fecha_envio;
        document.getElementById('oc-proveedor').value = oc.proveedor_nit;
        cargarDatosProveedorOC();

        document.getElementById('oc-condiciones').value = oc.condiciones_envio || '';
        document.getElementById('oc-forma-pago').value = oc.forma_pago || '';
        document.getElementById('oc-observaciones').value = oc.observaciones || '';
        document.getElementById('oc-descuento').value = oc.descuento;
        document.getElementById('oc-iva').value = oc.iva;
        document.getElementById('oc-retencion').value = oc.retencion;

        const tbody = document.getElementById('oc-items-table-body');
        tbody.innerHTML = '';
        oc.items.forEach(item => {
            agregarFilaItemOC(item);
        });

        alert('Orden de Compra cargada.');
    } catch (err) {
        console.error(err);
    }
}

// --- TAB SWITCHER & HISTORY & MASS IMPORT ---

export function switchOCTab(tab) {
    document.getElementById('oc-pane-crear').style.display = tab === 'crear' ? 'block' : 'none';
    document.getElementById('oc-pane-historial').style.display = tab === 'historial' ? 'block' : 'none';
    document.getElementById('oc-pane-masiva').style.display = tab === 'masiva' ? 'block' : 'none';

    const btnCrear = document.getElementById('oc-tab-crear');
    const btnHist = document.getElementById('oc-tab-historial');
    const btnMasiv = document.getElementById('oc-tab-masiva');

    if (btnCrear) btnCrear.className = 'btn ' + (tab === 'crear' ? 'btn-primary' : 'btn-secondary');
    if (btnHist) btnHist.className = 'btn ' + (tab === 'historial' ? 'btn-primary' : 'btn-secondary');
    if (btnMasiv) btnMasiv.className = 'btn ' + (tab === 'masiva' ? 'btn-primary' : 'btn-secondary');

    if (tab === 'historial') {
        loadOCHistorial();
    }
}

export async function loadOCHistorial() {
    try {
        const ocs = await fetchAPI('/compras') || [];
        const tbody = document.getElementById('oc-historial-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Calculando estados de recibo...</td></tr>';

        // Traer todos los movimientos de ingreso
        const movs = await fetchAPI('/inventario/movimientos') || [];

        tbody.innerHTML = '';
        if (ocs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay órdenes de compra registradas.</td></tr>';
            return;
        }

        ocs.forEach(oc => {
            let totalOrdered = oc.items.reduce((sum, item) => sum + Number(item.cantidad), 0);
            let totalReceived = 0;

            // Filtrar movimientos de ingreso (IN) que hagan referencia a esta OC
            const matchingMovs = movs.filter(m => m.tipo === 'IN' && m.documento_referencia && m.documento_referencia.startsWith(oc.consecutivo));

            matchingMovs.forEach(m => {
                totalReceived += m.cantidad;
            });

            let estadoRecibo = 'Pendiente';
            let badgeClass = 'badge-pending';

            if (totalReceived >= totalOrdered) {
                estadoRecibo = 'Recibido';
                badgeClass = 'badge-completed';
            } else if (totalReceived > 0) {
                estadoRecibo = `Parcial (${totalReceived}/${totalOrdered})`;
                badgeClass = 'badge-pre-alistado';
            } else {
                estadoRecibo = `Pendiente (0/${totalOrdered})`;
                badgeClass = 'badge-pending';
            }

            // Calcular valor total
            let subtotal = oc.items.reduce((sum, item) => sum + (Number(item.cantidad) * Number(item.v_unitario)), 0);
            const base = Math.max(0, subtotal - Number(oc.descuento || 0));
            const ivaVal = base * (Number(oc.iva || 0) / 100);
            const retVal = base * (Number(oc.retencion || 0) / 100);
            const totalGeneral = base + ivaVal - retVal;

            tbody.innerHTML += `
                <tr>
                    <td><strong>${oc.consecutivo}</strong></td>
                    <td>${oc.fecha}</td>
                    <td>${oc.proveedor_nombre || oc.proveedor_nit}</td>
                    <td class="text-center">${oc.items.length}</td>
                    <td class="text-center">${totalOrdered}</td>
                    <td class="text-right font-bold">${formatoMoneda(totalGeneral)}</td>
                    <td class="text-center"><span class="badge ${badgeClass}">${estadoRecibo}</span></td>
                    <td class="text-center">
                        <button class="btn btn-secondary btn-sm" onclick="cargarOCDesdeHistorial('${oc.consecutivo}')" title="Ver / Editar">Editar</button>
                        <button class="btn btn-primary btn-sm" onclick="imprimirOCDesdeHistorial('${oc.consecutivo}')" title="Imprimir PDF">Imprimir</button>
                        ${totalReceived < totalOrdered ? `<button class="btn btn-success btn-sm" onclick="recibirOCDesdeHistorial('${oc.consecutivo}')" title="Recibir Mercancía">Recibir</button>` : ''}
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        const tbody = document.getElementById('oc-historial-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar historial.</td></tr>';
    }
}

export function cargarOCDesdeHistorial(consecutivo) {
    const input = document.getElementById('consultar-oc-id');
    if (input) input.value = consecutivo;
    switchOCTab('crear');
    consultarOCForm();
}

export async function imprimirOCDesdeHistorial(consecutivo) {
    const input = document.getElementById('consultar-oc-id');
    if (input) input.value = consecutivo;
    await consultarOCForm();
    if (window.imprimirDocumento) {
        window.imprimirDocumento('OC');
    }
}

export function recibirOCDesdeHistorial(consecutivo) {
    if (window.showView) {
        window.showView('entradas');
    }
    const input = document.getElementById('in-oc-input');
    if (input) input.value = consecutivo;
    if (window.cargarOCParaRecibo) {
        window.cargarOCParaRecibo();
    }
}

// --- CSV IMPORT HELPERS ---

function findProveedorNit(terceroText) {
    if (!terceroText) return '';
    const norm = terceroText.trim().toLowerCase();

    let match = state.proveedores.find(p => p.nombre.trim().toLowerCase() === norm);
    if (match) return match.nit;

    match = state.proveedores.find(p => p.nit === terceroText.trim());
    if (match) return match.nit;

    match = state.proveedores.find(p => p.nombre.toLowerCase().includes(norm) || norm.includes(p.nombre.toLowerCase()));
    if (match) return match.nit;

    return terceroText.trim();
}

function findProductByCode(codeText) {
    if (!codeText) return null;
    const cleanCode = String(codeText).trim();

    let prod = state.productos.find(p => p.codigo === cleanCode);
    if (prod) return prod;

    if (/^\d+$/.test(cleanCode)) {
        const padded5 = cleanCode.padStart(5, '0');
        prod = state.productos.find(p => p.codigo === padded5);
        if (prod) return prod;
    }

    return null;
}

export function descargarPlantillaCSV() {
    if (window.XLSX) {
        const data = [
            ["Bodega", "Fecha", "Código", "Descripción", "Tercero", "Cant. Pedi.", "Um. Comp.", "Um. Cons.", "OC #", "Estado"],
            ["055", "2026-05-23", "00032", "AREPAS - Empaque Al Vacio", "EL CHOCLO", 20, "Und", "Und", "4813", "REC"],
            ["055", "2026-05-23", "10956", "CAJA CLAMSHELL GRANDE - Caja Clamshell Grande Cmpc Nkraft Kit 12", "MM PACKAGING COLOMBIA", 2475, "Und", "Und", "4031", "REC"],
            ["055", "2026-05-24", "00038", "AZUCAR - Riopaila X 2.5 Kilos", "EdexA", 20, "Bol", "kg", "3744", "REC"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "OrdenCompraReal");
        XLSX.writeFile(wb, "orden_compra_real.xlsx");
    } else {
        const headers = 'consecutivo,fecha,proveedor_nit,observaciones,condiciones_envio,forma_pago,fecha_envio,item,codigo_producto,cantidad,valor_unitario\n';
        const sample = 'OC-MASIVA-01,2026-05-25,800987654,Orden de prueba importada,Entregar en bodega,Credito 30 dias,2026-05-25,1,HOMOLOGO 6000860,100,120000\nOC-MASIVA-01,2026-05-25,800987654,Orden de prueba importada,Entregar en bodega,Credito 30 dias,2026-05-25,2,TEST-01,50,45000\n';

        const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "plantilla_ordenes_compra.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function procesarArchivoCSVOC() {
    const fileInput = document.getElementById('csv-file-input');
    if (!fileInput) return;
    const file = fileInput.files[0];
    if (!file) return;

    readExcelOrCSV(file, ocAliasMap, function (err, rows, colMapping) {
        if (err) {
            alert(`Error al procesar archivo: ${err.message}`);
            return;
        }
        try {
            csvParsedOrders = parseExcelOrCSVToOrders(rows, colMapping);
            renderCSVPreview();
        } catch (parseErr) {
            alert(`Error al parsear datos: ${parseErr.message}`);
        }
    });
}

function parseExcelOrCSVToOrders(rows, colMapping) {
    const ordersMap = new Map();

    let lastConsecutivo = '';
    let lastFecha = '';
    let lastProveedorNit = '';

    const startIndex = colMapping._headerIndex + 1;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        let consecutivoRaw = colMapping.consecutivo !== -1 ? String(row[colMapping.consecutivo] || '').trim() : '';
        let fechaRaw = colMapping.fecha !== -1 ? String(row[colMapping.fecha] || '').trim() : '';
        let proveedorRaw = colMapping.proveedor_nit !== -1 ? String(row[colMapping.proveedor_nit] || '').trim() : '';
        let codigoRaw = colMapping.codigo_producto !== -1 ? String(row[colMapping.codigo_producto] || '').trim() : '';
        let descripcionRaw = colMapping.descripcion !== -1 ? String(row[colMapping.descripcion] || '').trim() : '';
        let cantidadRaw = colMapping.cantidad !== -1 ? String(row[colMapping.cantidad] || '').trim() : '';
        let uCompraRaw = colMapping.unidad_compra !== -1 ? String(row[colMapping.unidad_compra] || '').trim() : '';
        let uConsumoRaw = colMapping.unidad_consumo !== -1 ? String(row[colMapping.unidad_consumo] || '').trim() : '';
        let valUnitRaw = colMapping.valor_unitario !== -1 ? String(row[colMapping.valor_unitario] || '').trim() : '';

        if (!consecutivoRaw && !codigoRaw && !proveedorRaw) continue;

        if (consecutivoRaw) lastConsecutivo = consecutivoRaw;
        else consecutivoRaw = lastConsecutivo;

        if (fechaRaw) lastFecha = fechaRaw;
        else fechaRaw = lastFecha;

        if (proveedorRaw) lastProveedorNit = proveedorRaw;
        else proveedorRaw = lastProveedorNit;

        if (!consecutivoRaw) continue;
        if (!codigoRaw) continue;

        const resolvedNit = findProveedorNit(proveedorRaw);
        let parsedFecha = formatExcelDate(fechaRaw);
        if (!parsedFecha) parsedFecha = new Date().toISOString().split('T')[0];

        if (!ordersMap.has(consecutivoRaw)) {
            ordersMap.set(consecutivoRaw, {
                consecutivo: consecutivoRaw,
                fecha: parsedFecha,
                proveedor_nit: resolvedNit,
                observaciones: 'Importado de Excel/CSV',
                descuento: 0,
                iva: 19,
                retencion: 0,
                condiciones_envio: 'Entregar en Bodega',
                forma_pago: 'Crédito 30 días',
                fecha_envio: parsedFecha,
                items: []
            });
        }

        const order = ordersMap.get(consecutivoRaw);
        const prod = findProductByCode(codigoRaw);

        const quantity = parseNumberString(cantidadRaw);
        let price = parseNumberString(valUnitRaw);
        if (price === 0 && prod) {
            price = prod.valor_venta || 0;
        }

        order.items.push({
            item: String(order.items.length + 1),
            codigo: prod ? prod.codigo : codigoRaw,
            descripcion: descripcionRaw || (prod ? prod.descripcion : ''),
            cantidad: quantity,
            v_unitario: price,
            unidad_compra: uCompraRaw || (prod ? prod.unidad_compra || 'Und' : 'Und'),
            unidad_consumo: uConsumoRaw || (prod ? prod.unidad_consumo || 'Und' : 'Und')
        });
    }

    return Array.from(ordersMap.values());
}

export function renderCSVPreview() {
    const previewPanel = document.getElementById('csv-preview-panel');
    const tbody = document.getElementById('csv-preview-body');
    const btnConfirmar = document.getElementById('btnConfirmarImportacionCSV');

    if (!tbody || !previewPanel || !btnConfirmar) return;
    tbody.innerHTML = '';

    if (csvParsedOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No se encontraron órdenes válidas para importar.</td></tr>';
        btnConfirmar.disabled = true;
        previewPanel.style.display = 'block';
        return;
    }

    let allValid = true;

    csvParsedOrders.forEach(order => {
        const provExists = state.proveedores.some(p => p.nit === order.proveedor_nit);
        let provNombre = order.proveedor_nit;
        let errors = [];

        if (!provExists) {
            errors.push(`Proveedor NIT/Nombre ${order.proveedor_nit} no registrado`);
        } else {
            const p = state.proveedores.find(x => x.nit === order.proveedor_nit);
            provNombre = p.nombre;
        }

        order.items.forEach(item => {
            const prod = findProductByCode(item.codigo);
            if (!prod) {
                errors.push(`Producto ${item.codigo} no existe`);
            } else {
                item.descripcion = prod.descripcion;
                item.unidad_compra = item.unidad_compra || prod.unidad_compra || 'Und';
                item.unidad_consumo = item.unidad_consumo || prod.unidad_consumo || 'Und';
            }
        });

        let statusHTML = '';
        if (errors.length === 0) {
            statusHTML = '<span class="badge badge-completed">Válida</span>';
        } else {
            statusHTML = `<span class="badge badge-danger" title="${errors.join(', ')}">Error (${errors.length} novedades)</span>`;
            allValid = false;
        }

        let total = order.items.reduce((sum, item) => sum + (item.cantidad * item.v_unitario), 0);

        tbody.innerHTML += `
            <tr>
                <td><strong>${order.consecutivo}</strong></td>
                <td>${provNombre}</td>
                <td>${order.fecha}</td>
                <td class="text-center">${order.items.length}</td>
                <td class="text-right font-bold">${formatoMoneda(total)}</td>
                <td>${statusHTML}</td>
            </tr>
        `;
    });

    btnConfirmar.disabled = !allValid;
    previewPanel.style.display = 'block';
}

export function cancelarImportacionCSV() {
    const previewPanel = document.getElementById('csv-preview-panel');
    if (previewPanel) previewPanel.style.display = 'none';
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) fileInput.value = '';
    csvParsedOrders = [];
}

export async function confirmarImportacionCSV() {
    if (csvParsedOrders.length === 0) return;

    const confirmacion = confirm(`¿Confirmar importación masiva de ${csvParsedOrders.length} orden(es)?`);
    if (!confirmacion) return;

    try {
        for (const order of csvParsedOrders) {
            await fetchAPI('/compras', 'POST', order);
        }
        alert('Órdenes importadas correctamente.');
        cancelarImportacionCSV();
        switchOCTab('historial');
        loadOCHistorial();
    } catch (err) {
        console.error(err);
        alert(`Error al importar órdenes: ${err.message}`);
    }
}

// Bind to window for global availability
window.agregarFilaItemOC = agregarFilaItemOC;
window.eliminarFilaItemOC = eliminarFilaItemOC;
window.seleccionarProductoFilaOC = seleccionarProductoFilaOC;
window.cargarDatosProveedorOC = cargarDatosProveedorOC;
window.calcularTotalesOC = calcularTotalesOC;
window.limpiarFormOC = limpiarFormOC;
window.guardarOC = guardarOC;
window.consultarOCForm = consultarOCForm;
window.switchOCTab = switchOCTab;
window.loadOCHistorial = loadOCHistorial;
window.cargarOCDesdeHistorial = cargarOCDesdeHistorial;
window.imprimirOCDesdeHistorial = imprimirOCDesdeHistorial;
window.recibirOCDesdeHistorial = recibirOCDesdeHistorial;
window.descargarPlantillaCSV = descargarPlantillaCSV;
window.procesarArchivoCSVOC = procesarArchivoCSVOC;
window.cancelarImportacionCSV = cancelarImportacionCSV;
window.confirmarImportacionCSV = confirmarImportacionCSV;
