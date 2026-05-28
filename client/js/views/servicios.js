import { state } from '../state.js';
import { fetchAPI } from '../api.js';
import { formatoMoneda } from '../utils.js';

let osItemCount = 0;

export function agregarFilaItemOS(item = null) {
    osItemCount++;
    const tbody = document.getElementById('os-items-table-body');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.id = `os-row-${osItemCount}`;

    tr.innerHTML = `
        <td class="text-center os-row-item-num">${tbody.children.length + 1}</td>
        <td>
            <input type="text" class="form-control os-item-code" value="${item ? item.codigo : ''}" placeholder="Código" style="padding:4px 8px;">
        </td>
        <td>
            <input type="text" class="form-control os-item-desc" value="${item ? item.descripcion : ''}" placeholder="Detalle del servicio..." style="padding:4px 8px;">
        </td>
        <td>
            <input type="number" class="form-control os-item-qty text-center" value="${item ? item.cantidad : '1'}" oninput="calcularTotalesOS()" style="padding:4px 8px;" min="1" step="any">
        </td>
        <td>
            <input type="number" class="form-control os-item-unit text-right" value="${item ? item.v_unitario : '0'}" oninput="calcularTotalesOS()" style="padding:4px 8px;" min="0" step="any">
        </td>
        <td class="text-right font-bold os-item-total">$0.00</td>
        <td class="text-center">
            <button class="btn btn-danger btn-sm" onclick="eliminarFilaItemOS(${osItemCount})" style="padding:4px 8px;">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
    calcularTotalesOS();
}

export function eliminarFilaItemOS(rowId) {
    const row = document.getElementById(`os-row-${rowId}`);
    if (row) {
        row.remove();
        const rows = document.querySelectorAll('.os-row-item-num');
        rows.forEach((td, index) => {
            td.textContent = index + 1;
        });
        calcularTotalesOS();
    }
}

export function cargarDatosProveedorOS() {
    const nit = document.getElementById('os-proveedor').value;
    const p = state.proveedores.find(x => x.nit === nit);
    const detailDiv = document.getElementById('os-proveedor-detalles');

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

export function calcularTotalesOS() {
    const rows = document.querySelectorAll('#os-items-table-body tr');
    let subtotal = 0;

    rows.forEach(row => {
        const qty = Number(row.querySelector('.os-item-qty').value) || 0;
        const unit = Number(row.querySelector('.os-item-unit').value) || 0;
        const total = qty * unit;
        subtotal += total;

        row.querySelector('.os-item-total').textContent = formatoMoneda(total);
    });

    const descuento = Number(document.getElementById('os-descuento').value) || 0;
    const ivaPct = Number(document.getElementById('os-iva').value) || 0;
    const retPct = Number(document.getElementById('os-retencion').value) || 0;

    const baseIVA = Math.max(0, subtotal - descuento);
    const valorIVA = baseIVA * (ivaPct / 100);
    const valorRet = baseIVA * (retPct / 100);
    const totalGeneral = baseIVA + valorIVA - valorRet;

    document.getElementById('os-total-general').textContent = formatoMoneda(totalGeneral);
}

export function limpiarFormOS() {
    document.getElementById('os-consecutivo').value = '';
    document.getElementById('os-observaciones').value = '';
    document.getElementById('os-descuento').value = '0';
    document.getElementById('os-iva').value = '0';
    document.getElementById('os-retencion').value = '6';
    document.getElementById('os-total-general').textContent = '$0.00';
    document.getElementById('os-items-table-body').innerHTML = '';
    document.getElementById('os-proveedor-detalles').innerHTML = '';
    if (window.initDateInputs) {
        window.initDateInputs();
    }

    agregarFilaItemOS();
}

export async function guardarOS() {
    const consecutivo = document.getElementById('os-consecutivo').value.trim();
    const fecha = document.getElementById('os-fecha').value;
    const proveedor_nit = document.getElementById('os-proveedor').value;
    const observaciones = document.getElementById('os-observaciones').value;
    const descuento = Number(document.getElementById('os-descuento').value);
    const iva = Number(document.getElementById('os-iva').value);
    const retencion = Number(document.getElementById('os-retencion').value);
    const condiciones_envio = document.getElementById('os-condiciones').value;
    const forma_pago = document.getElementById('os-forma-pago').value;
    const fecha_envio = document.getElementById('os-fecha-envio').value;

    if (!consecutivo || !fecha || !proveedor_nit) {
        alert('Por favor complete Consecutivo, Fecha y Proveedor.');
        return;
    }

    const rows = document.querySelectorAll('#os-items-table-body tr');
    const items = [];

    rows.forEach(row => {
        const num = row.querySelector('.os-row-item-num').textContent;
        const codigo = row.querySelector('.os-item-code').value;
        const descripcion = row.querySelector('.os-item-desc').value;
        const cantidad = Number(row.querySelector('.os-item-qty').value);
        const v_unitario = Number(row.querySelector('.os-item-unit').value);

        if (descripcion) {
            items.push({ item: num, codigo: codigo || 'SER-GEN', descripcion, cantidad, v_unitario });
        }
    });

    if (items.length === 0) {
        alert('Debe agregar al menos un servicio válido.');
        return;
    }

    try {
        await fetchAPI('/servicios', 'POST', {
            consecutivo, fecha, proveedor_nit, observaciones, descuento, iva, retencion, condiciones_envio, forma_pago, fecha_envio, items
        });
        alert('Orden de Servicio guardada con éxito.');
        limpiarFormOS();
    } catch (err) {
        console.error(err);
    }
}

// Bind to window for global availability
window.agregarFilaItemOS = agregarFilaItemOS;
window.eliminarFilaItemOS = eliminarFilaItemOS;
window.cargarDatosProveedorOS = cargarDatosProveedorOS;
window.calcularTotalesOS = calcularTotalesOS;
window.limpiarFormOS = limpiarFormOS;
window.guardarOS = guardarOS;
window.consultarOSForm = consultarOSForm;

export async function consultarOSForm() {
    const docId = document.getElementById('consultar-os-id').value.trim();
    if (!docId) {
        alert('Ingrese el consecutivo de la OS a buscar.');
        return;
    }

    try {
        const oss = await fetchAPI('/servicios') || [];
        const os = oss.find(o => o.consecutivo === docId);

        if (!os) {
            alert(`No se encontró la OS #${docId}`);
            return;
        }

        document.getElementById('os-consecutivo').value = os.consecutivo;
        document.getElementById('os-fecha').value = os.fecha;
        document.getElementById('os-fecha-envio').value = os.fecha_envio;
        document.getElementById('os-proveedor').value = os.proveedor_nit;
        cargarDatosProveedorOS();

        document.getElementById('os-condiciones').value = os.condiciones_envio || '';
        document.getElementById('os-forma-pago').value = os.forma_pago || '';
        document.getElementById('os-observaciones').value = os.observaciones || '';
        document.getElementById('os-descuento').value = os.descuento;
        document.getElementById('os-iva').value = os.iva;
        document.getElementById('os-retencion').value = os.retencion;

        const tbody = document.getElementById('os-items-table-body');
        tbody.innerHTML = '';
        os.items.forEach(item => {
            agregarFilaItemOS(item);
        });

        alert('Orden de Servicio cargada.');
    } catch (err) {
        console.error(err);
    }
}
