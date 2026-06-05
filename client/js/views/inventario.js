import { state, UBICACION } from '../state.js';
import { fetchAPI } from '../api.js';
import { initRegularizacion } from './regularizacion.js';
import { 
    formatoMoneda, 
    validarUbicacion, 
    readExcelOrCSV, 
    parseNumberString,
    calcularVolumenOcupadoCliente 
} from '../utils.js';

let stockGlobalData = [];
let csvParsedInventario = [];

const invAliasMap = {
    codigo: ['codigo', 'código', 'codigo_producto', 'producto', 'código producto', 'codigo producto', 'ref', 'referencia'],
    ubicacion: ['ubicacion', 'ubicación', 'posicion', 'posición', 'celda', 'ubicación física', 'ubicacion fisica'],
    cantidad: ['cantidad', 'cant', 'conteo', 'stock', 'cantidad física', 'cantidad fisica', 'cantidad fisico', 'cantidad físico']
};

export async function loadStockGlobal() {
    try {
        stockGlobalData = await fetchAPI('/inventario/stock') || [];
        renderStockTable(stockGlobalData);
    } catch (err) {
        console.error(err);
    }
}

export function renderStockTable(data) {
    const tbody = document.getElementById('inv-stock-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay productos en inventario</td></tr>';
        return;
    }

    data.forEach(p => {
        const badgeClass = p.stock_total > 0 ? 'badge-completed' : 'badge-danger';
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.codigo}</strong></td>
                <td>${p.descripcion}</td>
                <td>${p.marca || '-'}</td>
                <td>${p.peso ? p.peso + ' Kg' : '-'}</td>
                <td class="text-center"><span class="badge ${badgeClass}">${p.stock_total}</span></td>
                <td class="text-center">
                    <button class="btn btn-secondary btn-sm" onclick="showStockLocations('${p.codigo}', '${p.descripcion.replace(/'/g, "\\'")}')">Ver Ubicaciones</button>
                </td>
            </tr>
        `;
    });
}

export function filterStockGlobal() {
    const searchEl = document.getElementById('inv-search-input');
    const search = searchEl ? searchEl.value.toLowerCase().trim() : '';
    if (!search) {
        renderStockTable(stockGlobalData);
        return;
    }

    const filtered = stockGlobalData.filter(p =>
        p.codigo.toLowerCase().includes(search) ||
        p.descripcion.toLowerCase().includes(search) ||
        (p.marca && p.marca.toLowerCase().includes(search))
    );
    renderStockTable(filtered);
}

export async function showStockLocations(codigo, descripcion) {
    try {
        const data = await fetchAPI(`/inventario/stock/detalle?codigo=${encodeURIComponent(codigo)}`);
        document.getElementById('inv-det-prod-code').textContent = codigo;
        document.getElementById('inv-det-prod-desc').textContent = descripcion;

        const tbody = document.getElementById('inv-det-ubicaciones-body');
        if (tbody) {
            tbody.innerHTML = '';

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No se encuentra en ninguna ubicación física</td></tr>';
            } else {
                data.forEach(row => {
                    tbody.innerHTML += `
                        <tr>
                            <td><strong>${row.ubicacion}</strong></td>
                            <td class="text-center font-bold">${row.stock}</td>
                        </tr>
                    `;
                });
            }
        }

        const detailsPanel = document.getElementById('inv-details-panel');
        if (detailsPanel) detailsPanel.style.display = 'flex';
    } catch (err) {
        console.error(err);
    }
}

export function closeInvDetails() {
    const detailsPanel = document.getElementById('inv-details-panel');
    if (detailsPanel) detailsPanel.style.display = 'none';
}

export function switchInvTab(tab) {
    const paneConsulta = document.getElementById('inv-pane-consulta');
    const paneMasivo = document.getElementById('inv-pane-masivo');
    const paneRegularizacion = document.getElementById('inv-pane-regularizacion');
    const btnConsulta = document.getElementById('inv-tab-consulta');
    const btnMasivo = document.getElementById('inv-tab-masivo');
    const btnRegularizacion = document.getElementById('inv-tab-regularizacion');

    if (paneConsulta) paneConsulta.style.display = tab === 'consulta' ? 'block' : 'none';
    if (paneMasivo) paneMasivo.style.display = tab === 'masivo' ? 'block' : 'none';
    if (paneRegularizacion) paneRegularizacion.style.display = tab === 'regularizacion' ? 'block' : 'none';

    // Reset all tab buttons to inactive, then highlight the active one below.
    if (btnConsulta) btnConsulta.className = 'btn btn-secondary';
    if (btnMasivo) btnMasivo.className = 'btn btn-secondary';
    if (btnRegularizacion) btnRegularizacion.className = 'btn btn-secondary';

    if (tab === 'consulta') {
        if (btnConsulta) btnConsulta.className = 'btn btn-primary';
        loadStockGlobal();
    } else if (tab === 'masivo') {
        if (btnMasivo) btnMasivo.className = 'btn btn-primary';
    } else if (tab === 'regularizacion') {
        if (btnRegularizacion) btnRegularizacion.className = 'btn btn-primary';
        // Montar la vista de regularización con "Picking" activa por defecto.
        initRegularizacion('inv-pane-regularizacion');
    }
}

export function descargarPlantillaInventarioGeneral() {
    if (window.XLSX) {
        const data = [
            ["Código", "Ubicación", "Cantidad"],
            ["00032", "V010110", "150"],
            ["10956", "V020320", "80"],
            ["00038", "V030114", "200"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario General");
        XLSX.writeFile(wb, "plantilla_inventario_general.xlsx");
    } else {
        const headers = 'Código,Ubicación,Cantidad\n';
        const rowEjemplo = '00032,V010110,150\n';
        const blob = new Blob([headers + rowEjemplo], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'plantilla_inventario_general.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function procesarArchivoInventarioGeneral() {
    const fileInput = document.getElementById('inv-file-input');
    if (!fileInput) return;
    const file = fileInput.files[0];
    if (!file) return;

    readExcelOrCSV(file, invAliasMap, function (err, rows, colMapping) {
        if (err) {
            alert(`Error al procesar archivo de inventario: ${err.message}`);
            return;
        }
        try {
            csvParsedInventario = parseExcelOrCSVToInventario(rows, colMapping);
            renderInventarioCSVPreview();
        } catch (parseErr) {
            alert(`Error al parsear datos de inventario: ${parseErr.message}`);
        }
    });
}

export function parseExcelOrCSVToInventario(rows, colMapping) {
    const list = [];
    const startIndex = colMapping._headerIndex + 1;
    const hasLocationColumn = colMapping.ubicacion !== -1;

    for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row) || row.length === 0) continue;

        let codigo = colMapping.codigo !== -1 ? String(row[colMapping.codigo] || '').trim() : '';
        let ubicacion = hasLocationColumn ? String(row[colMapping.ubicacion] || '').trim() : '';
        let cantidad = colMapping.cantidad !== -1 ? String(row[colMapping.cantidad] || '').trim() : '';

        if (!codigo) continue;

        // Formatear ubicación si está presente
        if (ubicacion) {
            ubicacion = ubicacion.toUpperCase().trim();
            if (!ubicacion.startsWith('V') && ubicacion.length === 6) {
                ubicacion = 'V' + ubicacion;
            }
        }

        list.push({
            codigo,
            ubicacion: ubicacion || null,
            cantidad: parseNumberString(cantidad)
        });
    }

    if (!hasLocationColumn) {
        alert("ℹ️ El archivo no contiene columna de ubicaciones. El sistema distribuirá automáticamente el stock físico en las posiciones disponibles del almacén siguiendo reglas volumétricas (Slotting).");
        return autoSlotInventario(list);
    }

    return list;
}

export function autoSlotInventario(list) {
    const vanos = ['01', '02', '03'];
    const niveles = Array.from({ length: 40 }, (_, i) => String(i + 1).padStart(2, '0'));
    const pickingPositions = ['10', '14'];
    const highPositions = ['20', '24', '30', '34', '40', '44', '50', '54', '60', '64'];
    const MAX_VOLUME = 5760000; // cm3
    
    // Generar todas las ubicaciones en altura en orden
    const highLocsPool = [];
    for (const v of vanos) {
        for (const n of niveles) {
            for (const p of highPositions) {
                highLocsPool.push(`V${v}${n}${p}`);
            }
        }
    }
    
    let highLocIdx = 0;
    const slottedList = [];
    
    list.forEach((item, idx) => {
        let qty = item.cantidad;
        if (qty <= 0) return;
        
        // Buscar dimensiones del producto en el catálogo (state.productos)
        const prod = state.productos.find(p => p.codigo === item.codigo);
        const alto = prod ? (prod.alto || 10.0) : 10.0;
        const largo = prod ? (prod.largo || 10.0) : 10.0;
        const ancho = prod ? (prod.ancho || 10.0) : 10.0;
        const vol = alto * largo * ancho;
        
        let maxQtyPerCell = Math.floor(MAX_VOLUME / (vol || 1000.0));
        if (maxQtyPerCell <= 0) maxQtyPerCell = 1;
        
        // 1. Asignar picking en Nivel 01
        const pVano = vanos[idx % vanos.length];
        const pPos = pickingPositions[Math.floor(idx / vanos.length) % pickingPositions.length];
        const pickingLoc = `V${pVano}01${pPos}`;
        
        const pickingQty = Math.min(qty, maxQtyPerCell, 1000);
        slottedList.push({
            codigo: item.codigo,
            ubicacion: pickingLoc,
            cantidad: pickingQty
        });
        qty -= pickingQty;
        
        // 2. Asignar el resto en ubicaciones de altura
        while (qty > 0) {
            if (highLocIdx >= highLocsPool.length) {
                console.warn("Capacidad de almacén agotada durante la distribución automática.");
                break;
            }
            const targetLoc = highLocsPool[highLocIdx];
            const qtyToPlace = Math.min(qty, maxQtyPerCell);
            slottedList.push({
                codigo: item.codigo,
                ubicacion: targetLoc,
                cantidad: qtyToPlace
            });
            qty -= qtyToPlace;
            highLocIdx++;
        }
    });
    
    return slottedList;
}

export function renderInventarioCSVPreview() {
    const previewPanel = document.getElementById('inv-preview-panel');
    const tbody = document.getElementById('inv-preview-body');
    const btnConfirmar = document.getElementById('btnConfirmarInventarioGeneral');

    if (!tbody || !previewPanel || !btnConfirmar) return;
    tbody.innerHTML = '';

    if (csvParsedInventario.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No se encontraron productos o ubicaciones válidas en el archivo.</td></tr>';
        btnConfirmar.disabled = true;
        previewPanel.style.display = 'block';
        return;
    }

    csvParsedInventario.forEach(item => {
        const product = state.productos.find(x => x.codigo === item.codigo);
        const yaExisteProd = !!product;
        
        let statusHTML = '';
        let measuresHTML = '';
        let validRow = true;

        if (yaExisteProd) {
            statusHTML = '<span class="badge badge-completed">Producto En Catálogo</span>';
            const alto = product.alto || 0;
            const largo = product.largo || 0;
            const ancho = product.ancho || 0;
            measuresHTML = `${alto/100}m x ${largo/100}m x ${ancho/100}m`;
            
            // Validar si excede medidas del rack (2.0m, 2.4m, 1.2m) -> (200cm, 240cm, 120cm)
            if (alto > 200 || largo > 240 || ancho > 120) {
                statusHTML = '<span class="badge badge-danger">Excede dimensiones de rack</span>';
                validRow = false;
            }
        } else {
            statusHTML = '<span class="badge badge-pending">Nuevo (Se creará en Carga Ciega)</span>';
            measuresHTML = '0.10m x 0.10m x 0.10m';
        }

        // Validar formato ubicación
        if (!validarUbicacion(item.ubicacion)) {
            statusHTML = `<span class="badge badge-danger">Ubicación física inválida (${item.ubicacion})</span>`;
            validRow = false;
        }

        tbody.innerHTML += `
            <tr style="${!validRow ? 'background-color: rgba(239, 68, 68, 0.05);' : ''}">
                <td><strong>${item.codigo}</strong></td>
                <td><span class="location-badge-item">${item.ubicacion}</span></td>
                <td class="text-center font-bold">${item.cantidad}</td>
                <td>${measuresHTML}</td>
                <td>${statusHTML}</td>
            </tr>
        `;
    });

    btnConfirmar.disabled = false;
    previewPanel.style.display = 'block';
}

export function cancelarImportacionInventarioGeneral() {
    const previewPanel = document.getElementById('inv-preview-panel');
    if (previewPanel) previewPanel.style.display = 'none';
    const fileInput = document.getElementById('inv-file-input');
    if (fileInput) fileInput.value = '';
    csvParsedInventario = [];
}

export async function confirmarImportacionInventarioGeneral() {
    if (csvParsedInventario.length === 0) return;

    // Advertencia de seguridad antes de borrar todo
    const confirm1 = confirm("⚠️ ADVERTENCIA: Esta operación ELIMINARÁ por completo el stock actual e iniciará la carga de inventario físico. ¿Desea proceder?");
    if (!confirm1) return;

    const confirm2 = confirm("⚠️ ¿Está ABSOLUTAMENTE seguro de que desea realizar el reseteo de inventario general ciego?");
    if (!confirm2) return;

    try {
        const res = await fetchAPI('/inventario/inventario-general', 'POST', { items: csvParsedInventario });
        alert(`¡Carga de inventario general ciego completada con éxito!\nSe cargaron ${csvParsedInventario.length} registros de stock físico.`);
        
        cancelarImportacionInventarioGeneral();
        switchInvTab('consulta');
        state.stockPorUbicacion = await fetchAPI('/inventario/stock/ubicaciones') || [];
        state.productos = await fetchAPI('/productos') || [];
    } catch (err) {
        console.error(err);
        alert(`Error al importar el inventario general: ${err.message}`);
    }
}

// Bind to window for global availability
window.loadStockGlobal = loadStockGlobal;
window.renderStockTable = renderStockTable;
window.filterStockGlobal = filterStockGlobal;
window.showStockLocations = showStockLocations;
window.closeInvDetails = closeInvDetails;
window.switchInvTab = switchInvTab;
window.descargarPlantillaInventarioGeneral = descargarPlantillaInventarioGeneral;
window.procesarArchivoInventarioGeneral = procesarArchivoInventarioGeneral;
window.cancelarImportacionInventarioGeneral = cancelarImportacionInventarioGeneral;
window.confirmarImportacionInventarioGeneral = confirmarImportacionInventarioGeneral;
