import { state } from '../state.js';
import { fetchAPI } from '../api.js';

export async function loadMovimientosRecientes() {
    try {
        const data = await fetchAPI('/inventario/movimientos') || [];
        const tbody = document.getElementById('movimientos-history-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay movimientos recientes registrados</td></tr>';
            return;
        }

        data.forEach(m => {
            const badgeClass = m.tipo === 'IN' ? 'badge-completed' : 'badge-danger';
            tbody.innerHTML += `
                <tr>
                    <td>${m.id}</td>
                    <td>${m.fecha}</td>
                    <td><strong>${m.codigo_producto}</strong></td>
                    <td><span class="badge ${badgeClass}">${m.tipo}</span></td>
                    <td>${m.ubicacion}</td>
                    <td class="text-right font-bold">${m.cantidad}</td>
                    <td>${m.documento_referencia || '-'}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

export async function actualizarUbicacionesSalidaManual() {
    const prodCodigoEl = document.getElementById('out-producto');
    const selectUbicacion = document.getElementById('out-ubicacion');

    if (!selectUbicacion) return;
    const prodCodigo = prodCodigoEl ? prodCodigoEl.value : '';

    selectUbicacion.innerHTML = '<option value="">Cargando stock...</option>';

    if (!prodCodigo) {
        selectUbicacion.innerHTML = '<option value="">Seleccione un producto</option>';
        return;
    }

    try {
        const ubicaciones = await fetchAPI(`/inventario/stock/detalle?codigo=${encodeURIComponent(prodCodigo)}`);
        selectUbicacion.innerHTML = '';

        if (ubicaciones.length === 0) {
            selectUbicacion.innerHTML = '<option value="">Sin stock en bodega</option>';
            return;
        }

        ubicaciones.forEach(u => {
            selectUbicacion.innerHTML += `<option value="${u.ubicacion}">${u.ubicacion} (Stock: ${u.stock})</option>`;
        });
    } catch (err) {
        console.error(err);
    }
}

export async function guardarSalidaManualOUT() {
    const fechaEl = document.getElementById('out-fecha');
    const refEl = document.getElementById('out-referencia');
    const prodEl = document.getElementById('out-producto');
    const ubiEl = document.getElementById('out-ubicacion');
    const qtyEl = document.getElementById('out-cantidad');

    const fecha = fechaEl ? fechaEl.value : '';
    const ref = refEl ? refEl.value.trim() : '';
    const codigo_producto = prodEl ? prodEl.value : '';
    const ubicacion = ubiEl ? ubiEl.value : '';
    const cantidad = qtyEl ? Number(qtyEl.value) : 0;

    if (!fecha || !codigo_producto || !ubicacion || isNaN(cantidad) || cantidad <= 0) {
        alert('Por favor rellene todos los campos con valores válidos.');
        return;
    }

    try {
        const stockUbi = await fetchAPI(`/inventario/stock/detalle?codigo=${encodeURIComponent(codigo_producto)}`);
        const itemUbi = stockUbi.find(u => u.ubicacion === ubicacion);

        if (!itemUbi || cantidad > itemUbi.stock) {
            alert(`Stock insuficiente en la ubicación ${ubicacion}. Máximo disponible: ${itemUbi ? itemUbi.stock : 0}`);
            return;
        }

        const confirmacion = confirm(`¿Confirmar salida manual de ${cantidad} unidad(es) de ${codigo_producto} desde la ubicación ${ubicacion}?`);
        if (!confirmacion) return;

        await fetchAPI('/inventario/movimientos', 'POST', {
            codigo_producto,
            tipo: 'OUT',
            documento_referencia: ref || 'Salida Manual',
            fecha,
            cantidad,
            ubicacion
        });

        alert('Salida registrada correctamente.');
        if (qtyEl) qtyEl.value = '';
        loadMovimientosRecientes();
        actualizarUbicacionesSalidaManual();
    } catch (err) {
        console.error(err);
    }
}

// Bind to window to allow inline event listeners
window.loadMovimientosRecientes = loadMovimientosRecientes;
window.actualizarUbicacionesSalidaManual = actualizarUbicacionesSalidaManual;
window.guardarSalidaManualOUT = guardarSalidaManualOUT;
