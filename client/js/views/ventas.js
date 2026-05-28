import { state } from '../state.js';
import { fetchAPI } from '../api.js';
import { formatoMoneda } from '../utils.js';

let ventaItemCount = 0;

export function agregarFilaItemVenta(item = null) {
    ventaItemCount++;
    const tbody = document.getElementById('venta-items-table-body');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.id = `venta-row-${ventaItemCount}`;

    tr.innerHTML = `
        <td class="text-center venta-row-item-num">${tbody.children.length + 1}</td>
        <td>
            <select class="form-control venta-item-select" onchange="seleccionarProductoFilaVenta(${ventaItemCount})" style="padding:4px 8px;">
                <option value="">Seleccione...</option>
                ${state.productos.map(p => `<option value="${p.codigo}" ${item && item.codigo === p.codigo ? 'selected' : ''}>${p.codigo}</option>`).join('')}
            </select>
        </td>
        <td>
            <input type="text" class="form-control venta-item-desc" value="${item ? item.descripcion : ''}" style="padding:4px 8px;">
        </td>
        <td>
            <input type="number" class="form-control venta-item-qty text-center" value="${item ? item.cantidad : '1'}" oninput="calcularTotalesVenta()" style="padding:4px 8px;" min="1" step="any">
        </td>
        <td>
            <input type="number" class="form-control venta-item-unit text-right" value="${item ? item.v_unitario : '0'}" oninput="calcularTotalesVenta()" style="padding:4px 8px;" min="0" step="any">
        </td>
        <td class="text-right font-bold venta-item-total">$0.00</td>
        <td class="text-center">
            <button class="btn btn-danger btn-sm" onclick="eliminarFilaItemVenta(${ventaItemCount})" style="padding:4px 8px;">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
    calcularTotalesVenta();
}

export function eliminarFilaItemVenta(rowId) {
    const row = document.getElementById(`venta-row-${rowId}`);
    if (row) {
        row.remove();
        const rows = document.querySelectorAll('.venta-row-item-num');
        rows.forEach((td, index) => {
            td.textContent = index + 1;
        });
        calcularTotalesVenta();
    }
}

export function seleccionarProductoFilaVenta(rowId) {
    const row = document.getElementById(`venta-row-${rowId}`);
    if (!row) return;
    const code = row.querySelector('.venta-item-select').value;
    const prod = state.productos.find(p => p.codigo === code);

    if (prod) {
        row.querySelector('.venta-item-desc').value = prod.descripcion;
        row.querySelector('.venta-item-unit').value = prod.valor_venta || 0;
    } else {
        row.querySelector('.venta-item-desc').value = '';
        row.querySelector('.venta-item-unit').value = 0;
    }
    calcularTotalesVenta();
}

export function cargarDatosClienteVenta() {
    const nit = document.getElementById('venta-cliente').value;
    const c = state.clientes.find(x => x.nit === nit);
    const detailDiv = document.getElementById('venta-cliente-detalles');

    if (c) {
        detailDiv.innerHTML = `
            <div class="flex-1"><strong>Nombre:</strong> ${c.nombre}</div>
            <div class="flex-1"><strong>Teléfono:</strong> ${c.telefono || 'N/A'}</div>
            <div class="flex-1"><strong>Dirección:</strong> ${c.direccion || 'N/A'}</div>
            <div class="flex-1"><strong>Correo:</strong> ${c.correo || 'N/A'}</div>
        `;
    } else {
        detailDiv.innerHTML = '';
    }
}

export function calcularTotalesVenta() {
    const rows = document.querySelectorAll('#venta-items-table-body tr');
    let subtotal = 0;

    rows.forEach(row => {
        const qty = Number(row.querySelector('.venta-item-qty').value) || 0;
        const unit = Number(row.querySelector('.venta-item-unit').value) || 0;
        const total = qty * unit;
        subtotal += total;

        row.querySelector('.venta-item-total').textContent = formatoMoneda(total);
    });

    const ivaPct = Number(document.getElementById('venta-iva').value) || 0;
    const valorIVA = subtotal * (ivaPct / 100);
    const totalGeneral = subtotal + valorIVA;

    document.getElementById('venta-total-general').textContent = formatoMoneda(totalGeneral);
}

export function limpiarFormVenta() {
    document.getElementById('venta-remision').value = '';
    document.getElementById('venta-observaciones').value = '';
    document.getElementById('venta-iva').value = '19';
    document.getElementById('venta-total-general').textContent = '$0.00';
    document.getElementById('venta-items-table-body').innerHTML = '';
    document.getElementById('venta-cliente-detalles').innerHTML = '';
    if (window.initDateInputs) {
        window.initDateInputs();
    }

    agregarFilaItemVenta();
}

export async function guardarVenta() {
    const remision = document.getElementById('venta-remision').value.trim();
    const fecha = document.getElementById('venta-fecha').value;
    const cliente_nit = document.getElementById('venta-cliente').value;
    const observaciones = document.getElementById('venta-observaciones').value;
    const iva = Number(document.getElementById('venta-iva').value);

    if (!remision || !fecha || !cliente_nit) {
        alert('Por favor complete No. Remisión, Fecha y Cliente.');
        return;
    }

    const rows = document.querySelectorAll('#venta-items-table-body tr');
    const items = [];

    rows.forEach(row => {
        const num = row.querySelector('.venta-row-item-num').textContent;
        const codigo = row.querySelector('.venta-item-select').value;
        const descripcion = row.querySelector('.venta-item-desc').value;
        const cantidad = Number(row.querySelector('.venta-item-qty').value);
        const v_unitario = Number(row.querySelector('.venta-item-unit').value);

        if (codigo) {
            items.push({ item: num, codigo, descripcion, cantidad, v_unitario });
        }
    });

    if (items.length === 0) {
        alert('Debe agregar al menos un producto válido.');
        return;
    }

    try {
        await fetchAPI('/ventas', 'POST', {
            remision, fecha, cliente_nit, observaciones, iva, items, estado: 'Pendiente'
        });
        alert('Remisión / Factura de Venta guardada con éxito.');
        limpiarFormVenta();
    } catch (err) {
        console.error(err);
    }
}

// Bind to window for global availability
window.agregarFilaItemVenta = agregarFilaItemVenta;
window.eliminarFilaItemVenta = eliminarFilaItemVenta;
window.seleccionarProductoFilaVenta = seleccionarProductoFilaVenta;
window.cargarDatosClienteVenta = cargarDatosClienteVenta;
window.calcularTotalesVenta = calcularTotalesVenta;
window.limpiarFormVenta = limpiarFormVenta;
window.guardarVenta = guardarVenta;
window.consultarVentaForm = consultarVentaForm;

export async function consultarVentaForm() {
    const docId = document.getElementById('consultar-venta-id').value.trim();
    if (!docId) {
        alert('Ingrese el número de la remisión a buscar.');
        return;
    }

    try {
        const ventas = await fetchAPI('/ventas') || [];
        const v = ventas.find(x => x.remision === docId);

        if (!v) {
            alert(`No se encontró la Remisión #${docId}`);
            return;
        }

        document.getElementById('venta-remision').value = v.remision;
        document.getElementById('venta-fecha').value = v.fecha;
        document.getElementById('venta-cliente').value = v.cliente_nit;
        cargarDatosClienteVenta();

        document.getElementById('venta-observaciones').value = v.observaciones || '';
        document.getElementById('venta-iva').value = v.iva;

        const tbody = document.getElementById('venta-items-table-body');
        tbody.innerHTML = '';
        v.items.forEach(item => {
            agregarFilaItemVenta(item);
        });

        alert('Remisión / Factura de Venta cargada.');
    } catch (err) {
        console.error(err);
    }
}
