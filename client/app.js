import { state } from './js/state.js';
import { fetchAPI } from './js/api.js';
import { 
    formatoMoneda, 
    initDateInputs,
    esZonaMontacarguista,
    populateProductosSelect,
    populateClientesSelect,
    populateProveedoresSelect
} from './js/utils.js';

// Import views to run and register their window functions
import './js/views/montacarguista.js';
import './js/views/picking.js';
import './js/views/compras.js';
import './js/views/servicios.js';
import './js/views/ventas.js';
import './js/views/catalogo.js';
import './js/views/recibo.js';
import './js/views/despacho.js';
import './js/views/dashboard.js';
import './js/views/inventario.js';

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDateInputs();
    loadCatalogos();
    if (window.loadDashboardStats) {
        window.loadDashboardStats();
    }
    configFormObservers();
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = item.getAttribute('data-view');
            showView(viewName);

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

export function showView(viewName) {
    state.currentView = viewName;

    document.querySelectorAll('.view-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    const activePane = document.getElementById(`view-${viewName}`);
    if (activePane) {
        activePane.classList.add('active');
    }

    const viewTitles = {
        dashboard: 'Dashboard',
        montacarguista: 'Consolidado Diario - Montacarguista',
        picking: 'Alistamiento de Picking - Auxiliar',
        inventario: 'Inventario (Ubicaciones y Stock)',
        entradas: 'Recibo de Mercancía (IN)',
        salidas: 'Despacho de Mercancía (OUT)',
        compras: 'Órdenes de Compra (OC)',
        servicios: 'Órdenes de Servicio (OS)',
        ventas: 'Ventas y Remisiones',
        productos: 'Catálogo de Productos',
        clientes: 'Gestión de Clientes',
        proveedores: 'Gestión de Proveedores'
    };

    const titleEl = document.getElementById('viewTitle');
    if (titleEl) {
        titleEl.textContent = viewTitles[viewName] || 'HABITAD WMS';
    }

    if (viewName === 'dashboard' && window.loadDashboardStats) {
        window.loadDashboardStats();
    } else if (viewName === 'inventario' && window.switchInvTab) {
        window.switchInvTab('consulta');
    } else if (viewName === 'productos' && window.loadProductos) {
        window.loadProductos();
    } else if (viewName === 'clientes' && window.loadClientes) {
        window.loadClientes();
    } else if (viewName === 'proveedores' && window.loadProveedores) {
        window.loadProveedores();
    } else if (viewName === 'salidas') {
        if (window.loadMovimientosRecientes) window.loadMovimientosRecientes();
        populateProductosSelect('out-producto');
    } else if (viewName === 'entradas' && window.limpiarFormRecibo) {
        window.limpiarFormRecibo();
    } else if (viewName === 'compras') {
        if (window.limpiarFormOC) window.limpiarFormOC();
        populateProveedoresSelect('oc-proveedor');
    } else if (viewName === 'servicios') {
        if (window.limpiarFormOS) window.limpiarFormOS();
        populateProveedoresSelect('os-proveedor');
    } else if (viewName === 'ventas') {
        if (window.limpiarFormVenta) window.limpiarFormVenta();
        populateClientesSelect('venta-cliente');
    } else if (viewName === 'montacarguista') {
        const inputFecha = document.getElementById('monta-fecha');
        if (inputFecha && !inputFecha.value) {
            inputFecha.value = new Date().toISOString().split('T')[0];
        }
        if (window.loadMontacarguistaConsolidado) window.loadMontacarguistaConsolidado();
    }
}

function configFormObservers() {
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('inv-details-panel');
        if (e.target === modal && window.closeInvDetails) {
            window.closeInvDetails();
        }
    });
}

async function loadCatalogos() {
    try {
        state.clientes = await fetchAPI('/clientes') || [];
        state.proveedores = await fetchAPI('/proveedores') || [];
        state.productos = await fetchAPI('/productos') || [];
        state.stockPorUbicacion = await fetchAPI('/inventario/stock/ubicaciones') || [];
    } catch (err) {
        console.warn('No se pudieron cargar algunos catálogos iniciales.');
    }
}

// --- IMPRESIÓN Y EXPORTACIÓN PDF ---
export function imprimirDocumento(tipoDoc) {
    const printContainer = document.getElementById('printContainer');
    if (!printContainer) return;
    printContainer.innerHTML = ''; // Limpiar previo

    let htmlContent = '';

    if (tipoDoc === 'OC') {
        const consecutivo = document.getElementById('oc-consecutivo').value.trim();
        const fecha = document.getElementById('oc-fecha').value;
        const provNit = document.getElementById('oc-proveedor').value;
        const provObj = state.proveedores.find(p => p.nit === provNit);
        const cond = document.getElementById('oc-condiciones').value;
        const pago = document.getElementById('oc-forma-pago').value;
        const envio = document.getElementById('oc-fecha-envio').value;
        const obs = document.getElementById('oc-observaciones').value;

        const rows = document.querySelectorAll('#oc-items-table-body tr');
        let subtotal = 0;
        let tableRowsHTML = '';

        rows.forEach(row => {
            const num = row.querySelector('.oc-row-item-num').textContent;
            const code = row.querySelector('.oc-item-select').value;
            const desc = row.querySelector('.oc-item-desc').value;
            const qty = Number(row.querySelector('.oc-item-qty').value) || 0;
            const unit = Number(row.querySelector('.oc-item-unit').value) || 0;
            const total = qty * unit;
            subtotal += total;

            if (code) {
                const ucomp = row.querySelector('.oc-item-ucomp').value || 'Und';
                tableRowsHTML += `
                    <tr>
                        <td style="text-align:center;">${num}</td>
                        <td>${code}</td>
                        <td>${desc}</td>
                        <td style="text-align:center;">${qty} ${ucomp}</td>
                        <td style="text-align:right;">${formatoMoneda(unit)}</td>
                        <td style="text-align:right;">${formatoMoneda(total)}</td>
                    </tr>
                `;
            }
        });

        const descVal = Number(document.getElementById('oc-descuento').value) || 0;
        const ivaPct = Number(document.getElementById('oc-iva').value) || 0;
        const retPct = Number(document.getElementById('oc-retencion').value) || 0;
        const baseIVA = Math.max(0, subtotal - descVal);
        const ivaVal = baseIVA * (ivaPct / 100);
        const retVal = baseIVA * (retPct / 100);
        const totalGen = baseIVA + ivaVal - retVal;

        htmlContent = `
            <div class="print-invoice">
                <div class="print-header">
                    <div class="print-logo-section">
                        <h1>HABITAD WMS</h1>
                        <p style="font-size: 8pt; margin: 2px 0;">Nit: 123.456.789-0</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Dirección: Zona Industrial Bodega 10</p>
                    </div>
                    <div class="print-doc-info">
                        <h2>ORDEN DE COMPRA</h2>
                        <p style="font-size: 11pt; font-weight: bold; margin: 5px 0;">Nº Consecutivo: ${consecutivo || 'TEMP-OC'}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Emisión: ${fecha}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Envío: ${envio || '-'}</p>
                    </div>
                </div>
                
                <div class="print-details-grid">
                    <div class="print-details-block">
                        <h3>Detalle Proveedor</h3>
                        <p><strong>Razón Social:</strong> ${provObj ? provObj.nombre : 'No especificado'}</p>
                        <p><strong>NIT:</strong> ${provNit}</p>
                        <p><strong>Teléfono:</strong> ${provObj ? (provObj.telefono || '-') : '-'}</p>
                        <p><strong>Dirección:</strong> ${provObj ? (provObj.direccion || '-') : '-'}</p>
                    </div>
                    <div class="print-details-block">
                        <h3>Condiciones Comerciales</h3>
                        <p><strong>Condiciones de Envío:</strong> ${cond || 'N/A'}</p>
                        <p><strong>Forma de Pago:</strong> ${pago || 'N/A'}</p>
                    </div>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width:5%; text-align:center;">Item</th>
                            <th style="width:20%;">Código</th>
                            <th style="width:40%;">Descripción</th>
                            <th style="width:10%; text-align:center;">Cantidad</th>
                            <th style="width:12%; text-align:right;">V. Unitario</th>
                            <th style="width:13%; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML || '<tr><td colspan="6" style="text-align:center;">No hay ítems registrados</td></tr>'}
                    </tbody>
                </table>
                
                <div class="print-summary-section">
                    <div class="print-observaciones">
                        <strong>Observaciones:</strong><br>
                        <p>${obs || 'Sin observaciones adicionales.'}</p>
                    </div>
                    <div class="print-totales">
                        <table>
                            <tr>
                                <td>Subtotal:</td>
                                <td>${formatoMoneda(subtotal)}</td>
                            </tr>
                            <tr>
                                <td>Descuento:</td>
                                <td>-${formatoMoneda(descVal)}</td>
                            </tr>
                            <tr>
                                <td>IVA (${ivaPct}%):</td>
                                <td>${formatoMoneda(ivaVal)}</td>
                            </tr>
                            <tr>
                                <td>Retención (${retPct}%):</td>
                                <td>-${formatoMoneda(retVal)}</td>
                            </tr>
                            <tr class="grand-total">
                                <td>Total General:</td>
                                <td>${formatoMoneda(totalGen)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="print-signatures">
                    <div class="print-signature-line">Elaborado por</div>
                    <div class="print-signature-line">Aprobado Proveedor</div>
                </div>
            </div>
        `;
    }
    else if (tipoDoc === 'OS') {
        const consecutivo = document.getElementById('os-consecutivo').value.trim();
        const fecha = document.getElementById('os-fecha').value;
        const provNit = document.getElementById('os-proveedor').value;
        const provObj = state.proveedores.find(p => p.nit === provNit);
        const cond = document.getElementById('os-condiciones').value;
        const pago = document.getElementById('os-forma-pago').value;
        const envio = document.getElementById('os-fecha-envio').value;
        const obs = document.getElementById('os-observaciones').value;

        const rows = document.querySelectorAll('#os-items-table-body tr');
        let subtotal = 0;
        let tableRowsHTML = '';

        rows.forEach(row => {
            const num = row.querySelector('.os-row-item-num').textContent;
            const code = row.querySelector('.os-item-code').value;
            const desc = row.querySelector('.os-item-desc').value;
            const qty = Number(row.querySelector('.os-item-qty').value) || 0;
            const unit = Number(row.querySelector('.os-item-unit').value) || 0;
            const total = qty * unit;
            subtotal += total;

            if (desc) {
                tableRowsHTML += `
                    <tr>
                        <td style="text-align:center;">${num}</td>
                        <td>${code || 'SER-GEN'}</td>
                        <td>${desc}</td>
                        <td style="text-align:center;">${qty}</td>
                        <td style="text-align:right;">${formatoMoneda(unit)}</td>
                        <td style="text-align:right;">${formatoMoneda(total)}</td>
                    </tr>
                `;
            }
        });

        const descVal = Number(document.getElementById('os-descuento').value) || 0;
        const ivaPct = Number(document.getElementById('os-iva').value) || 0;
        const retPct = Number(document.getElementById('os-retencion').value) || 0;
        const baseIVA = Math.max(0, subtotal - descVal);
        const ivaVal = baseIVA * (ivaPct / 100);
        const retVal = baseIVA * (retPct / 100);
        const totalGen = baseIVA + ivaVal - retVal;

        htmlContent = `
            <div class="print-invoice">
                <div class="print-header">
                    <div class="print-logo-section">
                        <h1>HABITAD WMS</h1>
                        <p style="font-size: 8pt; margin: 2px 0;">Nit: 123.456.789-0</p>
                    </div>
                    <div class="print-doc-info">
                        <h2>ORDEN DE SERVICIO</h2>
                        <p style="font-size: 11pt; font-weight: bold; margin: 5px 0;">Nº Consecutivo: ${consecutivo || 'TEMP-OS'}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Emisión: ${fecha}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Envío: ${envio || '-'}</p>
                    </div>
                </div>
                
                <div class="print-details-grid">
                    <div class="print-details-block">
                        <h3>Detalle Prestador</h3>
                        <p><strong>Razón Social:</strong> ${provObj ? provObj.nombre : 'No especificado'}</p>
                        <p><strong>NIT:</strong> ${provNit}</p>
                        <p><strong>Teléfono:</strong> ${provObj ? (provObj.telefono || '-') : '-'}</p>
                        <p><strong>Dirección:</strong> ${provObj ? (provObj.direccion || '-') : '-'}</p>
                    </div>
                    <div class="print-details-block">
                        <h3>Condiciones Servicio</h3>
                        <p><strong>Condiciones del Servicio:</strong> ${cond || 'N/A'}</p>
                        <p><strong>Forma de Pago:</strong> ${pago || 'N/A'}</p>
                    </div>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width:5%; text-align:center;">Item</th>
                            <th style="width:20%;">Código</th>
                            <th style="width:40%;">Descripción Servicio</th>
                            <th style="width:10%; text-align:center;">Cantidad</th>
                            <th style="width:12%; text-align:right;">V. Unitario</th>
                            <th style="width:13%; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML || '<tr><td colspan="6" style="text-align:center;">No hay ítems registrados</td></tr>'}
                    </tbody>
                </table>
                
                <div class="print-summary-section">
                    <div class="print-observaciones">
                        <strong>Observaciones:</strong><br>
                        <p>${obs || 'Sin observaciones adicionales.'}</p>
                    </div>
                    <div class="print-totales">
                        <table>
                            <tr>
                                <td>Subtotal:</td>
                                <td>${formatoMoneda(subtotal)}</td>
                            </tr>
                            <tr>
                                <td>Descuento:</td>
                                <td>-${formatoMoneda(descVal)}</td>
                            </tr>
                            <tr>
                                <td>IVA (${ivaPct}%):</td>
                                <td>${formatoMoneda(ivaVal)}</td>
                            </tr>
                            <tr>
                                <td>Retención (${retPct}%):</td>
                                <td>-${formatoMoneda(retVal)}</td>
                            </tr>
                            <tr class="grand-total">
                                <td>Total General:</td>
                                <td>${formatoMoneda(totalGen)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="print-signatures">
                    <div class="print-signature-line">Supervisor Encargado</div>
                    <div class="print-signature-line">Firma de Conformidad Prestador</div>
                </div>
            </div>
        `;
    }
    else if (tipoDoc === 'VENTA') {
        const remision = document.getElementById('venta-remision').value.trim();
        const fecha = document.getElementById('venta-fecha').value;
        const cliNit = document.getElementById('venta-cliente').value;
        const cliObj = state.clientes.find(c => c.nit === cliNit);
        const obs = document.getElementById('venta-observaciones').value;

        const rows = document.querySelectorAll('#venta-items-table-body tr');
        let subtotal = 0;
        let tableRowsHTML = '';

        rows.forEach(row => {
            const num = row.querySelector('.venta-row-item-num').textContent;
            const code = row.querySelector('.venta-item-select').value;
            const desc = row.querySelector('.venta-item-desc').value;
            const qty = Number(row.querySelector('.venta-item-qty').value) || 0;
            const unit = Number(row.querySelector('.venta-item-unit').value) || 0;
            const total = qty * unit;
            subtotal += total;

            if (code) {
                tableRowsHTML += `
                    <tr>
                        <td style="text-align:center;">${num}</td>
                        <td>${code}</td>
                        <td>${desc}</td>
                        <td style="text-align:center;">${qty}</td>
                        <td style="text-align:right;">${formatoMoneda(unit)}</td>
                        <td style="text-align:right;">${formatoMoneda(total)}</td>
                    </tr>
                `;
            }
        });

        const ivaPct = Number(document.getElementById('venta-iva').value) || 0;
        const ivaVal = subtotal * (ivaPct / 100);
        const totalGen = subtotal + ivaVal;

        htmlContent = `
            <div class="print-invoice">
                <div class="print-header">
                    <div class="print-logo-section">
                        <h1>HABITAD WMS</h1>
                        <p style="font-size: 8pt; margin: 2px 0;">Nit: 123.456.789-0</p>
                    </div>
                    <div class="print-doc-info">
                        <h2>REMISIÓN DE VENTA</h2>
                        <p style="font-size: 11pt; font-weight: bold; margin: 5px 0;">Nº Remisión: ${remision || 'TEMP-REM'}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha: ${fecha}</p>
                    </div>
                </div>
                
                <div class="print-details-grid">
                    <div class="print-details-block" style="grid-column: span 2;">
                        <h3>Detalle Cliente</h3>
                        <p><strong>Nombre / Razón Social:</strong> ${cliObj ? cliObj.nombre : 'No especificado'}</p>
                        <p><strong>Cédula / NIT:</strong> ${cliNit}</p>
                        <p><strong>Teléfono:</strong> ${cliObj ? (cliObj.telefono || '-') : '-'}</p>
                        <p><strong>Dirección:</strong> ${cliObj ? (cliObj.direccion || '-') : '-'}</p>
                        <p><strong>Correo Electrónico:</strong> ${cliObj ? (cliObj.correo || '-') : '-'}</p>
                    </div>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width:5%; text-align:center;">Item</th>
                            <th style="width:20%;">Código</th>
                            <th style="width:40%;">Descripción Producto</th>
                            <th style="width:10%; text-align:center;">Cantidad</th>
                            <th style="width:12%; text-align:right;">V. Unitario</th>
                            <th style="width:13%; text-align:right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML || '<tr><td colspan="6" style="text-align:center;">No hay ítems registrados</td></tr>'}
                    </tbody>
                </table>
                
                <div class="print-summary-section">
                    <div class="print-observaciones">
                        <strong>Condiciones / Observaciones:</strong><br>
                        <p>${obs || 'Esta remisión sirve como constancia de despacho físico de mercancía en bodega.'}</p>
                    </div>
                    <div class="print-totales">
                        <table>
                            <tr>
                                <td>Subtotal:</td>
                                <td>${formatoMoneda(subtotal)}</td>
                            </tr>
                            <tr>
                                <td>IVA (${ivaPct}%):</td>
                                <td>${formatoMoneda(ivaVal)}</td>
                            </tr>
                            <tr class="grand-total">
                                <td>Total General:</td>
                                <td>${formatoMoneda(totalGen)}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="print-signatures">
                    <div class="print-signature-line">Despachado por (Bodega)</div>
                    <div class="print-signature-line">Recibido Conforme (Cliente)</div>
                </div>
            </div>
        `;
    }
    else if (tipoDoc === 'PICKING') {
        if (!state.currentPickingData) {
            alert('No hay datos de alistamiento para imprimir.');
            return;
        }

        const auxInputVal = document.getElementById('pick-auxiliar-input') ? document.getElementById('pick-auxiliar-input').value.trim() : '';
        const auxName = auxInputVal || state.currentPickingData.auxiliar || 'No asignado';

        const auxItems = state.currentPickingData._itemsAux ||
            state.currentPickingData.items
                .map((item, idx) => ({ item, originalIdx: idx }))
                .filter(({ item }) => {
                    const bestUbi = item.ubicaciones[0];
                    return !bestUbi || !esZonaMontacarguista(bestUbi.ubicacion);
                });

        let tableRowsHTML = '';
        auxItems.forEach(({ item, originalIdx }, displayIdx) => {
            const selectUbi = document.querySelector(`.pick-select-ubicacion[data-index="${originalIdx}"]`);
            const inputQty = document.querySelector(`.pick-input-cantidad[data-index="${originalIdx}"]`);

            const ubiAsignada = selectUbi ? selectUbi.value
                : (item.ubicaciones[0] ? item.ubicaciones[0].ubicacion : 'SIN STOCK');
            const cantAsignada = inputQty ? inputQty.value
                : Math.min(item.cantidad_solicitada, item.total_disponible);

            tableRowsHTML += `
                <tr>
                    <td style="text-align:center;">${displayIdx + 1}</td>
                    <td><strong>${item.codigo}</strong></td>
                    <td>${item.descripcion}</td>
                    <td style="text-align:center; font-weight:bold;">${item.cantidad_solicitada}</td>
                    <td style="text-align:center; font-weight:bold; font-size:1.1rem; background-color:#f0f4ff;">${ubiAsignada}</td>
                    <td style="text-align:center;">${cantAsignada}</td>
                    <td style="text-align:center; width:40px;">[ ]</td>
                </tr>
            `;
        });

        if (!tableRowsHTML) {
            tableRowsHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No hay ítems en zona auxiliar para esta remisión.</td></tr>';
        }

        htmlContent = `
            <div class="print-invoice">
                <div class="print-header">
                    <div class="print-logo-section">
                        <h1>HABITAD WMS</h1>
                        <p style="font-size: 8pt; margin: 2px 0;">Nit: 123.456.789-0</p>
                    </div>
                    <div class="print-doc-info">
                        <h2>HOJA DE PICKING — ZONA AUXILIAR</h2>
                        <p style="font-size: 11pt; font-weight: bold; margin: 5px 0;">Remisión Nº: ${state.currentPickingData.remision}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Impresión: ${new Date().toISOString().split('T')[0]}</p>
                    </div>
                </div>

                <div class="print-details-grid" style="grid-template-columns: 1fr;">
                    <div class="print-details-block">
                        <h3>Detalle de Despacho</h3>
                        <p><strong>Cliente:</strong> ${state.currentPickingData.cliente_nombre || 'No asignado'}</p>
                        <p><strong>Fecha Venta:</strong> ${state.currentPickingData.fecha}</p>
                        <p><strong>Estado:</strong> ${state.currentPickingData.estado}</p>
                        <p><strong>Auxiliar Asignado:</strong> ${auxName}</p>
                        <p style="color:#1e40af; font-weight:600;">&#128338; Solo incluye productos en posición 10–19 (rack bajo, accesible sin montacargas).</p>
                    </div>
                </div>

                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width:5%; text-align:center;">Item</th>
                            <th style="width:18%;">Código</th>
                            <th style="width:32%;">Descripción</th>
                            <th style="width:10%; text-align:center;">Cant. Solicitada</th>
                            <th style="width:20%; text-align:center;">Ubicación (pos 10–19)</th>
                            <th style="width:10%; text-align:center;">Cant. Alistada</th>
                            <th style="width:5%; text-align:center;">✓</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>

                <div class="print-summary-section">
                    <div class="print-observaciones" style="width:100%;">
                        <strong>Instrucciones para el Auxiliar:</strong>
                        <p>Diríjase a la ubicación indicada, retire la cantidad solicitada y marque la casilla (✓) al completar cada ítem. Firme al pie una vez complete todo el recorrido.</p>
                    </div>
                </div>

                <div class="print-signatures">
                    <div class="print-signature-line">Auxiliar de Bodega: ${auxName} (Firma)</div>
                    <div class="print-signature-line">Supervisor de Picking (Verifica)</div>
                </div>
            </div>
        `;
    }
    else if (tipoDoc === 'PICKING_MONTA') {
        if (!state.currentPickingData) {
            alert('No hay datos de alistamiento. Cargue una remisión primero.');
            return;
        }

        const montaItems = state.currentPickingData._itemsMonta ||
            state.currentPickingData.items
                .map((item, idx) => ({
                    item,
                    originalIdx: idx,
                    bestUbi: item.ubicaciones[0] ? item.ubicaciones[0].ubicacion : 'SIN UBI',
                    bestStock: item.ubicaciones[0] ? item.ubicaciones[0].stock : 0
                }))
                .filter(({ item }) => {
                    const bestUbi = item.ubicaciones[0];
                    return bestUbi && esZonaMontacarguista(bestUbi.ubicacion);
                });

        if (montaItems.length === 0) {
            alert('No hay productos en rack alto (posición ≥ 20) para esta remisión.');
            return;
        }

        const auxInputVal = document.getElementById('pick-auxiliar-input') ? document.getElementById('pick-auxiliar-input').value.trim() : '';
        const auxName = auxInputVal || state.currentPickingData.auxiliar || 'No asignado';

        let tableRowsHTML = '';
        montaItems.forEach(({ item, bestUbi, bestStock }, displayIdx) => {
            const nivel = bestUbi && bestUbi.length >= 5 ? bestUbi.substring(3, 5) : '-';
            const vano = bestUbi && bestUbi.length >= 3 ? bestUbi.substring(1, 3) : '-';
            const pos = bestUbi && bestUbi.length >= 7 ? bestUbi.substring(5, 7) : '-';

            tableRowsHTML += `
                <tr>
                    <td style="text-align:center;">${displayIdx + 1}</td>
                    <td><strong>${item.codigo}</strong></td>
                    <td>${item.descripcion}</td>
                    <td style="text-align:center; font-weight:bold;">${item.cantidad_solicitada}</td>
                    <td style="text-align:center; font-weight:bold; font-size:1.1rem; background-color:#fff7ed;">${bestUbi}</td>
                    <td style="text-align:center;">V${vano} / Nivel ${nivel} / Pos ${pos}</td>
                    <td style="text-align:center;">${bestStock}</td>
                    <td style="text-align:center; width:40px;">[ ]</td>
                </tr>
            `;
        });

        htmlContent = `
            <div class="print-invoice" style="border: 2px solid #f59e0b;">
                <div class="print-header" style="border-bottom: 2px solid #f59e0b; background: #fffbeb;">
                    <div class="print-logo-section">
                        <h1 style="color:#92400e;">HABITAD WMS</h1>
                        <p style="font-size: 8pt; margin: 2px 0;">Nit: 123.456.789-0</p>
                    </div>
                    <div class="print-doc-info">
                        <h2 style="color:#92400e;">&#127959;&#65039; DESCENSO A PICKING — MONTACARGUISTA</h2>
                        <p style="font-size: 11pt; font-weight: bold; margin: 5px 0;">Remisión Nº: ${state.currentPickingData.remision}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Impresión: ${new Date().toISOString().split('T')[0]}</p>
                    </div>
                </div>

                <div class="print-details-grid" style="grid-template-columns: 1fr;">
                    <div class="print-details-block" style="border-color:#f59e0b;">
                        <h3 style="color:#92400e; border-bottom-color:#f59e0b;">Instrucción de Trabajo</h3>
                        <p><strong>Cliente:</strong> ${state.currentPickingData.cliente_nombre || 'No asignado'}</p>
                        <p><strong>Auxiliar de Picking:</strong> ${auxName}</p>
                        <p><strong>Fecha:</strong> ${state.currentPickingData.fecha}</p>
                        <p style="color:#92400e; font-weight:600;">&#9888;&#65039; Los productos listados están en rack ALTO (posición ≥ 20). Descender al área de picking <u>antes</u> de entregar la hoja al auxiliar.</p>
                    </div>
                </div>

                <table class="print-table" style="border: 1px solid #f59e0b;">
                    <thead style="background:#fef3c7;">
                        <tr>
                            <th style="width:5%; text-align:center;">Item</th>
                            <th style="width:15%;">Código</th>
                            <th style="width:28%;">Descripción</th>
                            <th style="width:8%; text-align:center;">Cant. a Bajar</th>
                            <th style="width:15%; text-align:center;">Ubicación Alta</th>
                            <th style="width:18%; text-align:center;">Vano / Nivel / Pos</th>
                            <th style="width:7%; text-align:center;">Stock Disp.</th>
                            <th style="width:4%; text-align:center;">✓</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>

                <div class="print-summary-section">
                    <div class="print-observaciones" style="width:100%; border-color:#f59e0b;">
                        <strong>Instrucciones para el Montacarguista:</strong>
                        <p>1. Diríjase a cada ubicación indicada.<br>
                           2. Baje la cantidad señalada al área de staging / zona de picking.<br>
                           3. Marque (✓) cada ítem una vez depositado en la zona.<br>
                           4. Notifique al supervisor cuando todos los productos estén listos.<br>
                           5. Entregue esta hoja firmada al coordinador de bodega.</p>
                    </div>
                </div>

                <div class="print-signatures">
                    <div class="print-signature-line">Montacarguista (Firma y Cédula)</div>
                    <div class="print-signature-line">Supervisor / Coordinador de Bodega (Recibe)</div>
                </div>
            </div>
        `;
    }
    else if (tipoDoc === 'MONTA') {
        const date = document.getElementById('monta-fecha').value;
        const rows = document.querySelectorAll('#monta-consolidado-body tr');
        let tableRowsHTML = '';

        let idx = 1;
        rows.forEach(row => {
            if (row.querySelector('td[colspan]')) {
                tableRowsHTML = `<tr><td colspan="7" style="text-align:center;">No hay remisiones para esta fecha.</td></tr>`;
                return;
            }
            const rem = row.children[0].textContent;
            const cli = row.children[1].textContent;
            const items = row.children[2].textContent;
            const units = row.children[3].textContent;
            const status = row.children[4].textContent;

            tableRowsHTML += `
                <tr>
                    <td style="text-align:center;">${idx++}</td>
                    <td><strong>${rem}</strong></td>
                    <td>${cli}</td>
                    <td style="text-align:center;">${items}</td>
                    <td style="text-align:center;">${units}</td>
                    <td style="text-align:center;">${status}</td>
                    <td style="width:15%; text-align:center;">[  ]</td>
                </tr>
            `;
        });

        htmlContent = `
            <div class="print-invoice">
                <div class="print-header">
                    <div class="print-logo-section">
                        <h1>HABITAD WMS</h1>
                        <p style="font-size: 8pt; margin: 2px 0;">Nit: 123.456.789-0</p>
                    </div>
                    <div class="print-doc-info">
                        <h2>CONSOLIDADO DIARIO - MONTACARGUISTA</h2>
                        <p style="font-size: 11pt; font-weight: bold; margin: 5px 0;">Fecha: ${date}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Impresión: ${new Date().toISOString().split('T')[0]}</p>
                    </div>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width:5%; text-align:center;">Item</th>
                            <th style="width:15%;">No. Remisión / Factura</th>
                            <th style="width:35%;">Cliente</th>
                            <th style="width:10%; text-align:center;">Total Items</th>
                            <th style="width:10%; text-align:center;">Total Unidades</th>
                            <th style="width:15%; text-align:center;">Estado Alistamiento</th>
                            <th style="width:10%; text-align:center;">Cargado (M.C.)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML || '<tr><td colspan="7" style="text-align:center;">No hay remisiones registradas para esta fecha</td></tr>'}
                    </tbody>
                </table>
                
                <div class="print-summary-section">
                    <div class="print-observaciones" style="width:100%;">
                        <strong>Instrucciones para el Montacarguista:</strong>
                        <p>Verifique el estado de las remisiones del día. Organice la carga y el despacho de acuerdo a la secuencia. Firme al pie una vez complete la entrega en zona de despacho.</p>
                    </div>
                </div>
                
                <div class="print-signatures">
                    <div class="print-signature-line">Montacarguista (Firma)</div>
                    <div class="print-signature-line">Despachador / Coordinador (Firma)</div>
                </div>
            </div>
        `;
    }
    else if (tipoDoc === 'RECIBO_REPORTE') {
        if (!state.activeDiscrepancyReport) {
            alert('No hay reporte de novedades activo para imprimir.');
            return;
        }
        let tableRowsHTML = '';
        state.activeDiscrepancyReport.items.forEach((item, index) => {
            let diffText = item.diferencia;
            let estadoText = 'Listo';
            if (item.diferencia < 0) {
                diffText = `${item.diferencia} (Faltante)`;
                estadoText = 'FALTANTE';
            } else if (item.diferencia > 0) {
                diffText = `+${item.diferencia} (Sobrante)`;
                estadoText = 'SOBRANTE';
            }

            tableRowsHTML += `
                <tr>
                    <td style="text-align:center;">${index + 1}</td>
                    <td><strong>${item.codigo}</strong></td>
                    <td>${item.descripcion}</td>
                    <td style="text-align:center;">${item.solicitado}</td>
                    <td style="text-align:center; font-weight:bold;">${item.recibido}</td>
                    <td style="text-align:center; font-weight:bold; color:${item.diferencia < 0 ? 'orange' : (item.diferencia > 0 ? 'red' : 'black')}">${diffText}</td>
                    <td style="text-align:center; font-weight:bold;">${estadoText}</td>
                </tr>
            `;
        });

        htmlContent = `
            <div class="print-invoice" style="border: 2px dashed red;">
                <div class="print-header" style="border-bottom: 2px solid red;">
                    <div class="print-logo-section">
                        <h1 style="color:red;">HABITAD WMS - NOVEDADES</h1>
                        <p style="font-size: 8pt; margin: 2px 0;">Nit: 123.456.789-0</p>
                    </div>
                    <div class="print-doc-info">
                        <h2>REPORTE DE PRODUCTOS FALTANTES / SOBRANTES</h2>
                        <p style="font-size: 11pt; font-weight: bold; margin: 5px 0;">OC Ref: ${state.activeDiscrepancyReport.oc}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Fecha Recibo: ${state.activeDiscrepancyReport.fecha}</p>
                        <p style="font-size: 8pt; margin: 2px 0;">Factura Proveedor: ${state.activeDiscrepancyReport.factura}</p>
                    </div>
                </div>
                
                <div class="print-details-grid" style="grid-template-columns: 1fr;">
                    <div class="print-details-block" style="border-color:red;">
                        <h3 style="color:red; border-bottom-color:red;">Aviso de Novedad de Inventario</h3>
                        <p>Este documento es constancia física de las discrepancias encontradas en la recepción de mercancía contra la Orden de Compra.</p>
                    </div>
                </div>
                
                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width:5%; text-align:center; background-color:#ffebee!important; color:black!important;">Item</th>
                            <th style="width:20%; background-color:#ffebee!important; color:black!important;">Código</th>
                            <th style="width:35%; background-color:#ffebee!important; color:black!important;">Descripción</th>
                            <th style="width:10%; text-align:center; background-color:#ffebee!important; color:black!important;">Cant. Solicitada</th>
                            <th style="width:10%; text-align:center; background-color:#ffebee!important; color:black!important;">Cant. Recibida</th>
                            <th style="width:10%; text-align:center; background-color:#ffebee!important; color:black!important;">Diferencia</th>
                            <th style="width:10%; text-align:center; background-color:#ffebee!important; color:black!important;">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>
                
                <div class="print-summary-section">
                    <div class="print-observaciones" style="width:100%; border-color:red;">
                        <strong>Novedades encontradas / Observaciones del Operario:</strong>
                        <p style="height: 50px; border-bottom: 1px solid #ccc;"></p>
                    </div>
                </div>
                
                <div class="print-signatures" style="margin-top:40px;">
                    <div class="print-signature-line">Firma Operario de Recibo</div>
                    <div class="print-signature-line">Firma Conforme Transportista / Proveedor</div>
                </div>
            </div>
        `;
    }

    printContainer.innerHTML = htmlContent;

    // Disparar la impresión nativa del navegador
    setTimeout(() => {
        window.print();
    }, 150);
}

// Bind main orchestrator methods to window for HTML accessibility
window.showView = showView;
window.imprimirDocumento = imprimirDocumento;
window.fetchAPI = fetchAPI;
window.loadCatalogos = loadCatalogos;
