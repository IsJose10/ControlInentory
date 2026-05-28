import { state } from '../state.js';
import { fetchAPI } from '../api.js';
import { esZonaMontacarguista } from '../utils.js';

export async function consultarPickingFactura() {
    const remision = document.getElementById('pick-remision-input').value.trim();
    if (!remision) {
        alert('Por favor ingrese el número de remisión.');
        return;
    }

    try {
        const picking = await fetchAPI(`/ventas/picking?remision=${remision}`);
        state.currentPickingData = picking;

        document.getElementById('pick-rem-id').textContent = picking.remision;
        document.getElementById('pick-rem-cliente').textContent = picking.cliente_nombre || 'No asignado';
        document.getElementById('pick-rem-fecha').textContent = picking.fecha;

        const inputAux = document.getElementById('pick-auxiliar-input');
        if (inputAux) {
            inputAux.value = picking.auxiliar || '';
            inputAux.disabled = (picking.estado === 'Completado');
        }

        const badge = document.getElementById('pick-rem-estado');
        badge.textContent = picking.estado;
        badge.className = 'badge ' + (picking.estado === 'Completado' ? 'badge-completed' : 'badge-pending');

        const tbody = document.getElementById('picking-items-body');
        tbody.innerHTML = '';

        const btnConfirmar = document.getElementById('btnConfirmarPicking');
        if (picking.estado === 'Completado') {
            btnConfirmar.style.display = 'none';
        } else {
            btnConfirmar.style.display = 'inline-flex';
        }

        // Clasificar ítems y evaluar si se requiere descenso del montacarguista
        const itemsMonta = [];
        const itemsAux = [];

        let pickingBloqueado = false;
        let itemsConFaltanteHTML = [];

        picking.items.forEach((item, originalIdx) => {
            const stockAux = item.stock_auxiliar || 0;
            const cantSoli = item.cantidad_solicitada;

            // Si hay escasez en las posiciones de picking (10/14)
            if (stockAux < cantSoli) {
                const deficit = cantSoli - stockAux;
                
                // Si existe stock en rack alto (>= 20) para suplir
                if (item.stock_alta > 0) {
                    pickingBloqueado = true;
                    // Buscar la ubicación alta con stock
                    const ubiAlta = item.ubicaciones.find(u => {
                        const pos = parseInt(u.ubicacion.substring(5, 7), 10);
                        return pos >= 20;
                    });
                    
                    itemsMonta.push({
                        item,
                        originalIdx,
                        bestUbi: ubiAlta ? ubiAlta.ubicacion : 'Sin ubicación',
                        bestStock: item.stock_alta,
                        deficit: deficit
                    });
                    
                    itemsConFaltanteHTML.push(`
                        <div style="margin-top: 4px; padding: 4px 8px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid var(--color-danger); border-radius: 4px; font-size: 0.85rem;">
                            ❌ <strong>${item.codigo}</strong>: Requiere alistar ${cantSoli} und. En Picking solo hay ${stockAux} und. <strong>Falta bajar: ${deficit} und</strong> de rack alto.
                        </div>
                    `);
                } else {
                    // Si no hay stock ni en picking ni en rack alto
                    itemsAux.push({ item, originalIdx });
                }
            } else {
                // Hay stock suficiente en zona auxiliar 10/14
                itemsAux.push({ item, originalIdx });
            }
        });

        // Almacenar clasificación para impresión
        state.currentPickingData._itemsMonta = itemsMonta;
        state.currentPickingData._itemsAux = itemsAux;

        // Panel Montacarguista
        const montaPanel = document.getElementById('picking-monta-panel');
        const montaBody = document.getElementById('picking-monta-items-body');
        const btnDocMonta = document.getElementById('btnDocMonta');
        const auxHeader = document.getElementById('picking-aux-header');

        montaBody.innerHTML = '';
        if (itemsMonta.length > 0) {
            montaPanel.style.display = 'block';
            if (btnDocMonta) btnDocMonta.style.display = 'inline-flex';
            if (auxHeader) auxHeader.style.display = 'block';

            // Cambiar el diseño del banner de montacargas para reflejar el bloqueo real
            montaPanel.className = 'picking-monta-alert picking-monta-alert-blocked';
            montaPanel.querySelector('.picking-monta-alert-text').innerHTML = `
                <strong style="color: var(--color-danger); font-size: 1.05rem; display: flex; align-items: center; gap: 6px;">
                    🔒 PICKING BLOQUEADO — SE REQUIERE DESCENSO DEL MONTACARGUISTA
                </strong>
                <span style="color: var(--text-secondary); margin-top: 4px; display: block; line-height: 1.4;">
                    El stock disponible en la zona de picking baja (posiciones 10/14) es insuficiente. El montacarguista debe bajar el material requerido desde estantería alta antes de continuar. Una vez bajado, haga clic en <strong>"Consultar de nuevo"</strong> para actualizar y desbloquear el alistamiento.
                </span>
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 4px;">
                    ${itemsConFaltanteHTML.join('')}
                </div>
            `;

            itemsMonta.forEach(({ item, bestUbi, bestStock, deficit }) => {
                const nivel = bestUbi ? bestUbi.substring(3, 5) : '-';
                montaBody.innerHTML += `
                    <tr class="picking-row-monta" style="background-color: rgba(245, 158, 11, 0.03);">
                        <td>
                            <strong>${item.codigo}</strong><br>
                            <span class="text-muted" style="font-size:0.85rem;">${item.descripcion}</span>
                        </td>
                        <td class="text-center font-bold" style="color: var(--color-warning);">${item.cantidad_solicitada}</td>
                        <td>
                            <span class="location-badge-item location-badge-alta">${bestUbi}</span>
                            ${item.ubicaciones.slice(1).filter(u => parseInt(u.ubicacion.substring(5, 7), 10) >= 20).map(u => `<span class="location-badge-item">${u.ubicacion} (${u.stock})</span>`).join('')}
                        </td>
                        <td class="text-center font-bold" style="color: var(--color-danger);">${deficit} Unidades</td>
                        <td class="text-center">
                            <span class="badge badge-monta">Nivel ${nivel}</span>
                        </td>
                    </tr>
                `;
            });

            // Deshabilitar botón de confirmación de picking si está bloqueado
            if (pickingBloqueado && picking.estado !== 'Completado') {
                btnConfirmar.disabled = true;
                btnConfirmar.title = "Alistamiento bloqueado: Se requiere descenso del montacarguista.";
                btnConfirmar.innerHTML = "🔒 Bloqueado por Montacarguista";
                btnConfirmar.style.opacity = '0.5';
                btnConfirmar.style.cursor = 'not-allowed';
            }
        } else {
            montaPanel.style.display = 'none';
            if (btnDocMonta) btnDocMonta.style.display = 'none';
            if (auxHeader) auxHeader.style.display = 'none';

            // Habilitar botón de confirmación
            if (picking.estado !== 'Completado') {
                btnConfirmar.disabled = false;
                btnConfirmar.title = "";
                btnConfirmar.innerHTML = "Confirmar Picking y Despacho";
                btnConfirmar.style.opacity = '1';
                btnConfirmar.style.cursor = 'pointer';
            }
        }

        // Tabla Auxiliar
        itemsAux.forEach(({ item, originalIdx }) => {
            let stockStatus = '';
            let rowClass = '';
            
            const stockAux = item.stock_auxiliar || 0;
            const cantSoli = item.cantidad_solicitada;

            if (stockAux >= cantSoli) {
                stockStatus = '<span class="badge badge-completed">Disponible en Picking</span>';
            } else if (stockAux > 0) {
                stockStatus = `<span class="badge badge-pending">Parcial en Picking (${stockAux}/${cantSoli})</span>`;
                rowClass = 'picking-row-warning';
            } else {
                stockStatus = '<span class="badge badge-danger">Sin Stock en Picking</span>';
                rowClass = 'picking-row-danger';
            }

            // Filtrar ubicaciones del item que terminen en 10 o 14
            const ubiAuxiliares = item.ubicaciones.filter(u => {
                const pos = u.ubicacion.substring(5, 7);
                return pos === '10' || pos === '14';
            });

            let ubicacionesHTML = '';
            if (ubiAuxiliares.length === 0) {
                ubicacionesHTML = '<span class="text-danger">Ninguna posición baja con stock</span>';
            } else {
                ubiAuxiliares.forEach(u => {
                    ubicacionesHTML += `<span class="location-badge-item" style="background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);">${u.ubicacion} (${u.stock})</span>`;
                });
            }

            let asignacionHTML = '';
            if (picking.estado === 'Completado') {
                asignacionHTML = '<span class="text-muted">Ya despachado</span>';
            } else if (ubiAuxiliares.length === 0) {
                asignacionHTML = '<span class="text-danger">Imposible alistar</span>';
            } else {
                const ubicacionSugerida = ubiAuxiliares[0].ubicacion;
                const cantSugerida = Math.min(cantSoli, ubiAuxiliares[0].stock);

                asignacionHTML = `
                    <div class="flex-row gap-1 align-items-center">
                        <select class="form-control form-control-sm w-auto pick-select-ubicacion"
                                data-index="${originalIdx}"
                                style="padding:4px 8px; font-size:0.85rem;">
                            ${ubiAuxiliares.map(u => `<option value="${u.ubicacion}" ${u.ubicacion === ubicacionSugerida ? 'selected' : ''}>${u.ubicacion} (disp: ${u.stock})</option>`).join('')}
                        </select>
                        <input type="number" class="form-control form-control-sm w-auto pick-input-cantidad"
                               data-index="${originalIdx}"
                               value="${cantSugerida}" max="${stockAux}" min="0"
                               style="padding:4px 8px; font-size:0.85rem; width:80px;">
                    </div>
                `;
            }

            tbody.innerHTML += `
                <tr class="${rowClass}">
                    <td>
                        <strong>${item.codigo}</strong><br>
                        <span class="text-muted" style="font-size:0.85rem;">${item.descripcion}</span>
                    </td>
                    <td class="text-center font-bold">${cantSoli}</td>
                    <td class="text-center">${stockAux}</td>
                    <td class="text-center">${stockStatus}</td>
                    <td>${ubicacionesHTML}</td>
                    <td>${asignacionHTML}</td>
                </tr>
            `;
        });

        if (itemsAux.length === 0 && itemsMonta.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:16px;">No hay productos para esta remisión.</td></tr>';
        }

        document.getElementById('picking-detail-panel').style.display = 'block';
    } catch (err) {
        console.error(err);
    }
}

export function cancelarPicking() {
    document.getElementById('picking-detail-panel').style.display = 'none';
    state.currentPickingData = null;
}

export async function confirmarAlistamientoVenta() {
    if (!state.currentPickingData) return;

    const confirmacion = confirm(`¿Confirmar despacho y registrar egreso (OUT) de inventario para la Remisión #${state.currentPickingData.remision}?`);
    if (!confirmacion) return;

    const itemsDespachados = [];
    const selectUbicaciones = document.querySelectorAll('.pick-select-ubicacion');
    const inputCantidades = document.querySelectorAll('.pick-input-cantidad');

    let valid = true;

    selectUbicaciones.forEach(select => {
        const index = select.getAttribute('data-index');
        const ubicacion = select.value;
        const inputCant = document.querySelector(`.pick-input-cantidad[data-index="${index}"]`);
        const cantidad = Number(inputCant.value);
        const itemInfo = state.currentPickingData.items[index];

        if (cantidad > 0) {
            const ubicacionObj = itemInfo.ubicaciones.find(u => u.ubicacion === ubicacion);
            if (!ubicacionObj || cantidad > ubicacionObj.stock) {
                alert(`Error: La cantidad de picking (${cantidad}) ingresada para el producto ${itemInfo.codigo} supera el stock de la ubicación ${ubicacion} (${ubicacionObj ? ubicacionObj.stock : 0}).`);
                valid = false;
                return;
            }

            itemsDespachados.push({
                codigo: itemInfo.codigo,
                cantidad: cantidad,
                ubicacion: ubicacion
            });
        }
    });

    if (!valid) return;

    if (itemsDespachados.length === 0) {
        alert('No se ha asignado ninguna cantidad de picking válida.');
        return;
    }

    const auxiliar = document.getElementById('pick-auxiliar-input') ? document.getElementById('pick-auxiliar-input').value.trim() : '';

    try {
        await fetchAPI('/ventas/confirmar-picking', 'POST', {
            remision: state.currentPickingData.remision,
            itemsDespachados,
            auxiliar
        });
        alert('Picking completado con éxito. Se registraron los egresos correspondientes en inventario.');

        cancelarPicking();
        if (window.showView) {
            window.showView('montacarguista');
        }
    } catch (err) {
        console.error(err);
    }
}

// Print helpers
export function imprimirPickingAuxiliar() {
    if (window.imprimirDocumento) {
        window.imprimirDocumento('PICKING');
    }
}

export function imprimirBajadaMontacarguista() {
    if (window.imprimirDocumento) {
        window.imprimirDocumento('PICKING_MONTA');
    }
}

// Bind to window for global availability
window.consultarPickingFactura = consultarPickingFactura;
window.cancelarPicking = cancelarPicking;
window.confirmarAlistamientoVenta = confirmarAlistamientoVenta;
window.imprimirPickingAuxiliar = imprimirPickingAuxiliar;
window.imprimirBajadaMontacarguista = imprimirBajadaMontacarguista;
