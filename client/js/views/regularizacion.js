// Estado local del proceso de regularización.
// rondaActual: 0 = no iniciado, 1-3 = ronda en curso
// itemsConteo: array de items de la ronda actual provenientes del API
// conteoIngresado: mapa "codigo|ubicacion" -> cantidad contada (entero) o null
// discrepancias: items detectados con diferencia tras confirmar una ronda
// historialRondas: registro de rondas completadas
import {
    getRegularizacionPicking,
    getRegularizacionMontacarguista,
    aplicarAjustesRegularizacion
} from '../api.js';
import { imprimirHojaRegularizacion } from '../print.js';

let regularizacionState = {
    zona: 'picking',          // 'picking' | 'montacarguista'
    rondaActual: 0,           // 0 = no iniciado, 1-3
    itemsConteo: [],          // Items de la ronda actual
    conteoIngresado: {},      // Map: key (codigo|ubicacion) => cantidad contada
    discrepancias: [],        // Items con diferencias tras confirmación
    historialRondas: [],      // Registro de rondas completadas
    finalizado: false         // true cuando el proceso ya cerró (Req 7.1, 7.5)
};

// Genera el HTML completo de la vista de Regularización.
// inventario.js inyecta este HTML dentro del contenedor de la pestaña
// "Regularización" y luego invoca switchRegTab para fijar la sub-pestaña activa.
export function renderRegularizacion() {
    return `
        <!-- Sub-pestañas de Regularización -->
        <div class="flex-row gap-2 mb-3">
            <button class="btn btn-primary" id="reg-tab-picking"
                onclick="switchRegTab('picking')">Picking</button>
            <button class="btn btn-secondary" id="reg-tab-montacarguista"
                onclick="switchRegTab('montacarguista')">Montacarguista</button>
        </div>

        <!-- SUB-PESTAÑA: PICKING -->
        <div id="reg-pane-picking" class="card">
            <div class="card-header">
                <h2>Regularización - Zona Picking</h2>
            </div>
            <div class="card-body" id="reg-body-picking">
                ${renderEmptyState('picking')}
            </div>
        </div>

        <!-- SUB-PESTAÑA: MONTACARGUISTA -->
        <div id="reg-pane-montacarguista" class="card" style="display:none;">
            <div class="card-header">
                <h2>Regularización - Zona Montacarguista</h2>
            </div>
            <div class="card-body" id="reg-body-montacarguista">
                ${renderEmptyState('montacarguista')}
            </div>
        </div>
    `;
}

// Genera el HTML del estado vacío para una zona, mostrando un mensaje que indica
// que no hay conteos en curso (Requisito 1.5) y un botón para iniciar el conteo.
export function renderEmptyState(zona) {
    const etiqueta = zona === 'montacarguista' ? 'Montacarguista' : 'Picking';
    return `
        <div class="text-center text-muted" style="padding: 48px 16px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">📋</div>
            <h3 style="margin-bottom: 8px; color: var(--text-secondary);">No hay conteos en curso</h3>
            <p style="font-size: 0.9rem; margin-bottom: 16px;">
                No existe un proceso de regularización iniciado para la zona de ${etiqueta}.
            </p>
            <button class="btn btn-primary" onclick="cargarListadoConteo('${zona}')">
                Iniciar conteo
            </button>
        </div>
    `;
}

// Monta la vista de regularización dentro de un contenedor e inicializa la
// sub-pestaña por defecto (Picking activa, Montacarguista oculta).
export function initRegularizacion(containerId = 'inv-pane-regularizacion') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = renderRegularizacion();
    switchRegTab('picking');
}

// Alterna entre las sub-pestañas Picking y Montacarguista, mostrando/ocultando
// el contenido correspondiente y actualizando el estado visual de los botones
// (Requisitos 1.2, 1.3, 1.4).
export function switchRegTab(tab) {
    const isMonta = tab === 'montacarguista';
    regularizacionState.zona = isMonta ? 'montacarguista' : 'picking';

    const panePicking = document.getElementById('reg-pane-picking');
    const paneMonta = document.getElementById('reg-pane-montacarguista');
    const btnPicking = document.getElementById('reg-tab-picking');
    const btnMonta = document.getElementById('reg-tab-montacarguista');

    if (panePicking) panePicking.style.display = isMonta ? 'none' : 'block';
    if (paneMonta) paneMonta.style.display = isMonta ? 'block' : 'none';
    if (btnPicking) btnPicking.className = isMonta ? 'btn btn-secondary' : 'btn btn-primary';
    if (btnMonta) btnMonta.className = isMonta ? 'btn btn-primary' : 'btn btn-secondary';
}

// Construye la clave única del mapa de conteo para un par producto/ubicación.
function buildConteoKey(codigo, ubicacion) {
    return `${codigo}|${ubicacion}`;
}

// Devuelve el id del contenedor del cuerpo (card-body) de la zona indicada.
function bodyIdForZona(zona) {
    return zona === 'montacarguista' ? 'reg-body-montacarguista' : 'reg-body-picking';
}

// Valida que el valor sea un entero >= 0 y <= 999,999 (Requisitos 5.2, 5.3).
// Acepta tanto strings como números. Rechaza decimales, negativos, no numéricos
// y valores fuera de rango. Devuelve true/false.
export function validarCantidad(valor) {
    if (valor === null || valor === undefined) return false;
    const str = String(valor).trim();
    if (str === '') return false;
    // Solo dígitos (entero no negativo, sin signos, sin decimales).
    if (!/^\d+$/.test(str)) return false;
    const num = Number(str);
    if (!Number.isFinite(num)) return false;
    if (!Number.isInteger(num)) return false;
    if (num < 0) return false;
    if (num > 999999) return false;
    return true;
}

// Almacena la cantidad contada en el mapa `conteoIngresado` bajo la clave dada.
// Si el valor es válido lo guarda como entero. Si está vacío, lo marca como null
// (ítem "no contado", Requisito 5.4). Si es inválido, conserva el último valor
// válido y devuelve false.
export function registrarConteo(key, valor) {
    if (!key) return false;
    const str = valor === null || valor === undefined ? '' : String(valor).trim();

    // Campo vacío -> ítem no contado (Requisito 5.4).
    if (str === '') {
        regularizacionState.conteoIngresado[key] = null;
        return true;
    }

    if (!validarCantidad(str)) {
        // Mantener el último valor válido registrado (Requisito 5.3).
        return false;
    }

    regularizacionState.conteoIngresado[key] = parseInt(str, 10);
    return true;
}

// Manejador del evento `input` sobre los campos de conteo. Aplica la validación,
// muestra confirmación visual (clase reg-input-valid / reg-input-invalid)
// y persiste el valor cuando es válido (Requisitos 5.2, 5.3, 5.4).
export function onConteoInput(input, codigo, ubicacion) {
    if (!input) return;
    const key = buildConteoKey(codigo, ubicacion);
    const raw = input.value;
    const trimmed = String(raw == null ? '' : raw).trim();

    // Limpiar estados visuales previos.
    input.classList.remove('reg-input-valid', 'reg-input-invalid');

    if (trimmed === '') {
        // Vacío: ítem no contado, sin marca de error ni de éxito.
        regularizacionState.conteoIngresado[key] = null;
        return;
    }

    if (validarCantidad(trimmed)) {
        regularizacionState.conteoIngresado[key] = parseInt(trimmed, 10);
        input.classList.add('reg-input-valid');
    } else {
        input.classList.add('reg-input-invalid');
        // No se actualiza el mapa: conserva el último valor válido (Req 5.3).
    }
}

// Renderiza la tabla de conteo dentro del card-body de la zona activa.
// Cada fila incluye un input numérico para registrar la cantidad contada.
function renderTablaConteo(zona, items, ronda) {
    const bodyEl = document.getElementById(bodyIdForZona(zona));
    if (!bodyEl) return;

    if (!items || items.length === 0) {
        const etiqueta = zona === 'montacarguista' ? 'altura' : 'picking';
        bodyEl.innerHTML = `
            <div class="text-center text-muted" style="padding: 32px 16px;">
                <p>No hay ítems para contar en la zona de ${etiqueta}.</p>
                <button class="btn btn-secondary mt-2" onclick="cargarListadoConteo('${zona}')">
                    Recargar
                </button>
            </div>
        `;
        return;
    }

    const filas = items.map(it => {
        const key = buildConteoKey(it.codigo, it.ubicacion);
        const previo = regularizacionState.conteoIngresado[key];
        const valorPrevio = (previo === null || previo === undefined) ? '' : String(previo);
        return `
            <tr>
                <td><strong>${it.codigo}</strong></td>
                <td>${it.descripcion || ''}</td>
                <td><span class="location-badge-item">${it.ubicacion}</span></td>
                <td class="text-center font-bold">${it.cantidad_sistema}</td>
                <td class="text-center">
                    <input type="number"
                        class="form-control reg-conteo-input"
                        min="0"
                        max="999999"
                        step="1"
                        inputmode="numeric"
                        style="width: 110px; text-align: right;"
                        value="${valorPrevio}"
                        oninput="onConteoInput(this, '${it.codigo}', '${it.ubicacion}')"
                        data-codigo="${it.codigo}"
                        data-ubicacion="${it.ubicacion}" />
                </td>
            </tr>
        `;
    }).join('');

    bodyEl.innerHTML = `
        <div class="flex-row gap-2 mb-3" style="justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div>
                <strong>Ronda ${ronda}</strong>
                <span class="text-muted"> · ${items.length} ítem(s) para contar</span>
            </div>
            <div class="flex-row gap-2">
                <button class="btn btn-secondary btn-sm" onclick="cargarListadoConteo('${zona}')">
                    Recargar listado
                </button>
                <button class="btn btn-secondary btn-sm" onclick="imprimirHojaConteo()">
                    Imprimir hoja
                </button>
                <button class="btn btn-success btn-sm" onclick="confirmarRonda()">
                    Confirmar ronda
                </button>
            </div>
        </div>
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Ubicación</th>
                        <th class="text-center">Cant. Sistema</th>
                        <th class="text-center">Cant. Contada</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>
        </div>
    `;
}

// Genera el listado de reconteo: filtra los ítems cuya cantidad contada
// difiere de la cantidad del sistema (Requisitos 6.2, 7.2). Excluye los ítems
// sin conteo (null) y los que coinciden con el sistema.
export function generarListadoReconteo() {
    const items = Array.isArray(regularizacionState.itemsConteo)
        ? regularizacionState.itemsConteo
        : [];
    const conteo = regularizacionState.conteoIngresado || {};

    return items.filter(it => {
        const key = buildConteoKey(it.codigo, it.ubicacion);
        const contada = conteo[key];
        if (contada === null || contada === undefined) return false;
        return Number(contada) !== Number(it.cantidad_sistema);
    });
}

// Renderiza la tabla de discrepancias con las 3 columnas destacadas
// (Cant. Sistema, Cant. Contada, Diferencia). Cada fila lleva la clase
// reg-row-discrepancia para resaltado visual (Requisito 6.3).
function renderTablaDiscrepancias(zona, ronda, discrepancias, opts) {
    const bodyEl = document.getElementById(bodyIdForZona(zona));
    if (!bodyEl) return;

    const opciones = opts || {};
    const esRondaFinal = !!opciones.esRondaFinal;
    const proximaRonda = opciones.proximaRonda;

    const filas = discrepancias.map(d => {
        const dif = Number(d.diferencia);
        const signo = dif > 0 ? '+' : '';
        return `
            <tr class="reg-row-discrepancia">
                <td><strong>${d.codigo}</strong></td>
                <td>${d.descripcion || ''}</td>
                <td><span class="location-badge-item">${d.ubicacion}</span></td>
                <td class="text-center font-bold">${d.cantidad_sistema}</td>
                <td class="text-center font-bold">${d.cantidad_contada}</td>
                <td class="text-center font-bold reg-diferencia">${signo}${dif}</td>
            </tr>
        `;
    }).join('');

    let acciones = '';
    if (esRondaFinal) {
        acciones = `
            <button class="btn btn-success btn-sm" onclick="(window.aplicarAjustes && window.aplicarAjustes())">
                Aplicar ajustes
            </button>
        `;
    } else if (proximaRonda) {
        acciones = `
            <button class="btn btn-primary btn-sm" onclick="iniciarReconteo()">
                Iniciar ronda ${proximaRonda}
            </button>
        `;
    }

    const titulo = esRondaFinal
        ? `Ronda 3 finalizada · ${discrepancias.length} ajuste(s) pendiente(s)`
        : `Ronda ${ronda} · ${discrepancias.length} discrepancia(s) detectada(s)`;

    const subtitulo = esRondaFinal
        ? '<p class="text-muted" style="margin-top:4px; font-size:0.85rem;">Listo para aplicar ajustes al inventario.</p>'
        : `<p class="text-muted" style="margin-top:4px; font-size:0.85rem;">Se generará un listado de reconteo con los ítems discrepantes.</p>`;

    bodyEl.innerHTML = `
        <div class="flex-row gap-2 mb-3" style="justify-content: space-between; align-items: center; flex-wrap: wrap;">
            <div>
                <strong>${titulo}</strong>
                ${subtitulo}
            </div>
            <div class="flex-row gap-2">
                ${acciones}
            </div>
        </div>
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Ubicación</th>
                        <th class="text-center">Cant. Sistema</th>
                        <th class="text-center">Cant. Contada</th>
                        <th class="text-center">Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>
        </div>
    `;
}

// Inicia la siguiente ronda de reconteo usando los ítems discrepantes ya
// almacenados en `regularizacionState.discrepancias`. Reutiliza el render de
// tabla de conteo para que el operador ingrese las nuevas cantidades.
export function iniciarReconteo() {
    const zona = regularizacionState.zona || 'picking';
    const ronda = regularizacionState.rondaActual;
    const discrepancias = regularizacionState.discrepancias || [];

    // Si el proceso ya finalizó, bloquear cualquier intento de seguir
    // (Req 7.1: máximo 3 rondas).
    if (regularizacionState.finalizado || ronda > 3) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert('El proceso de regularización ya ha sido finalizado (máximo 3 rondas).');
        }
        return;
    }

    if (!discrepancias.length) return;

    // Convertir discrepancias a items de conteo para la nueva ronda.
    const itemsReconteo = discrepancias.map(d => ({
        codigo: d.codigo,
        descripcion: d.descripcion,
        ubicacion: d.ubicacion,
        cantidad_sistema: d.cantidad_sistema
    }));

    regularizacionState.itemsConteo = itemsReconteo;
    regularizacionState.conteoIngresado = {};
    itemsReconteo.forEach(it => {
        const key = buildConteoKey(it.codigo, it.ubicacion);
        regularizacionState.conteoIngresado[key] = null;
    });

    renderTablaConteo(zona, itemsReconteo, ronda);
}

// Confirma la ronda actual: valida que todos los ítems tengan conteo,
// detecta discrepancias y avanza el flujo según el resultado
// (Requisitos 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 8.1, 8.2).
export function confirmarRonda() {
    const zona = regularizacionState.zona || 'picking';
    const ronda = regularizacionState.rondaActual || 0;
    const items = Array.isArray(regularizacionState.itemsConteo)
        ? regularizacionState.itemsConteo
        : [];

    if (ronda === 0 || items.length === 0) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert('No hay una ronda de conteo activa.');
        }
        return null;
    }

    // Verificar ítems sin contar (Requisito 6.6).
    const conteo = regularizacionState.conteoIngresado || {};
    const pendientes = items.filter(it => {
        const key = buildConteoKey(it.codigo, it.ubicacion);
        const v = conteo[key];
        return v === null || v === undefined;
    });

    if (pendientes.length > 0) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert(`No se puede confirmar la ronda: ${pendientes.length} ítem(s) sin contar.`);
        }
        return null;
    }

    // Calcular discrepancias (Requisito 6.1).
    const discrepancias = items.reduce((acc, it) => {
        const key = buildConteoKey(it.codigo, it.ubicacion);
        const contada = Number(conteo[key]);
        const sistema = Number(it.cantidad_sistema);
        const diferencia = contada - sistema;
        if (diferencia !== 0) {
            acc.push({
                codigo: it.codigo,
                descripcion: it.descripcion,
                ubicacion: it.ubicacion,
                cantidad_sistema: sistema,
                cantidad_contada: contada,
                diferencia: diferencia
            });
        }
        return acc;
    }, []);

    // Registrar la ronda en el historial.
    regularizacionState.discrepancias = discrepancias;
    regularizacionState.historialRondas.push({
        numero: ronda,
        fecha: new Date().toISOString(),
        totalItems: items.length,
        totalDiscrepancias: discrepancias.length
    });

    // Sin discrepancias: terminación anticipada (Requisitos 6.4, 8.1, 8.2).
    if (discrepancias.length === 0) {
        regularizacionState.finalizado = true;
        const bodyEl = document.getElementById(bodyIdForZona(zona));
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="text-center" style="padding: 32px 16px;">
                    <div style="font-size: 2.5rem; margin-bottom: 12px;">✅</div>
                    <h3 style="margin-bottom: 8px; color: var(--color-success);">Inventario conforme</h3>
                    <p style="font-size: 0.95rem;">
                        El inventario físico coincide con el sistema en la ronda ${ronda}.
                        No se requieren ajustes.
                    </p>
                    <button class="btn btn-secondary mt-3" onclick="cargarListadoConteo('${zona}')">
                        Iniciar nuevo conteo
                    </button>
                </div>
            `;
        }
        return { ronda, discrepancias, finalizado: true };
    }

    // Hay discrepancias en ronda 3: se deja listo para aplicar ajustes
    // (la lógica de ajuste se implementa en la tarea 6.1).
    if (ronda >= 3) {
        renderTablaDiscrepancias(zona, ronda, discrepancias, { esRondaFinal: true });
        return { ronda, discrepancias, esRondaFinal: true };
    }

    // Hay discrepancias en ronda 1 o 2: avanzar a la siguiente ronda
    // con sólo los ítems discrepantes (Requisitos 6.2, 7.2).
    const proximaRonda = ronda + 1;
    regularizacionState.rondaActual = proximaRonda;
    renderTablaDiscrepancias(zona, ronda, discrepancias, { proximaRonda });
    return { ronda, discrepancias, proximaRonda };
}

// Obtiene el listado de regularización del API para la zona dada y renderiza
// la tabla con los campos de input numérico (Requisitos 2.1, 3.1, 5.1).
export async function cargarListadoConteo(zona) {
    const zonaActiva = zona || regularizacionState.zona || 'picking';
    const bodyEl = document.getElementById(bodyIdForZona(zonaActiva));

    if (bodyEl) {
        bodyEl.innerHTML = `
            <div class="text-center text-muted" style="padding: 32px 16px;">
                <p>Cargando listado de conteo...</p>
            </div>
        `;
    }

    try {
        const items = zonaActiva === 'montacarguista'
            ? await getRegularizacionMontacarguista()
            : await getRegularizacionPicking();

        const lista = Array.isArray(items) ? items : [];

        // Reiniciar estado para la nueva ronda inicial.
        regularizacionState.zona = zonaActiva;
        regularizacionState.rondaActual = 1;
        regularizacionState.itemsConteo = lista;
        regularizacionState.conteoIngresado = {};
        regularizacionState.discrepancias = [];
        regularizacionState.historialRondas = [];
        regularizacionState.finalizado = false;

        // Inicializar todas las claves como "no contadas" (null).
        lista.forEach(it => {
            const key = buildConteoKey(it.codigo, it.ubicacion);
            regularizacionState.conteoIngresado[key] = null;
        });

        renderTablaConteo(zonaActiva, lista, regularizacionState.rondaActual);
        return lista;
    } catch (err) {
        console.error('Error al cargar listado de conteo:', err);
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="text-center text-muted" style="padding: 32px 16px;">
                    <p style="color: var(--color-danger);">Error al cargar el listado de conteo. Intente nuevamente.</p>
                    <button class="btn btn-secondary mt-2" onclick="cargarListadoConteo('${zonaActiva}')">
                        Reintentar
                    </button>
                </div>
            `;
        }
        return [];
    }
}

// Expone el estado para inspección/uso de tareas posteriores (4.4, 6.1).
export function getRegularizacionState() {
    return regularizacionState;
}

// Genera la hoja de conteo imprimible para la zona y ronda activas
// (Requisitos 4.4, 4.5). Pasa SOLO los ítems de la zona activa, garantizando
// el aislamiento de zonas (zone isolation, Req 4.4). Si no hay ítems
// disponibles, alerta y aborta sin generar el documento (Req 4.5).
export function imprimirHojaConteo() {
    const zona = regularizacionState.zona || 'picking';
    const ronda = regularizacionState.rondaActual || 1;
    const items = Array.isArray(regularizacionState.itemsConteo)
        ? regularizacionState.itemsConteo
        : [];

    // Validar que existan ítems antes de generar el documento (Req 4.5).
    if (items.length === 0) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert('No hay ítems disponibles para generar la hoja de conteo.');
        }
        return;
    }

    imprimirHojaRegularizacion(zona, ronda, items);
}

// Aplica los ajustes del conteo final (ronda 3) al inventario del sistema
// enviando el payload al backend (Requisitos 6.5, 7.1, 7.3, 7.4, 7.5, 7.6).
// Caso éxito: muestra resumen en tabla y marca el proceso como finalizado.
// Caso error: mantiene la ronda 3 activa para reintento, sin limpiar datos.
// Caso sin discrepancias en ronda 3: muestra mensaje "no se encontraron
// diferencias" como fallback (Req 7.5).
export async function aplicarAjustes() {
    const zona = regularizacionState.zona || 'picking';
    const ronda = regularizacionState.rondaActual || 0;
    const discrepancias = Array.isArray(regularizacionState.discrepancias)
        ? regularizacionState.discrepancias
        : [];
    const bodyEl = document.getElementById(bodyIdForZona(zona));

    // Bloqueo: el proceso ya fue cerrado (Req 7.1).
    if (regularizacionState.finalizado) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert('El proceso de regularización ya ha sido finalizado (máximo 3 rondas).');
        }
        return null;
    }

    // Solo se aplican ajustes desde la ronda 3.
    if (ronda < 3) {
        if (typeof window !== 'undefined' && window.alert) {
            window.alert('Solo se pueden aplicar ajustes al confirmar la ronda 3.');
        }
        return null;
    }

    // Fallback: ronda 3 sin discrepancias (Req 7.5 final).
    if (discrepancias.length === 0) {
        regularizacionState.finalizado = true;
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="text-center" style="padding: 32px 16px;">
                    <div style="font-size: 2.5rem; margin-bottom: 12px;">✅</div>
                    <h3 style="margin-bottom: 8px; color: var(--color-success);">Sin diferencias</h3>
                    <p style="font-size: 0.95rem;">
                        No se encontraron diferencias y el inventario no requirió modificaciones.
                    </p>
                    <button class="btn btn-secondary mt-3" onclick="cargarListadoConteo('${zona}')">
                        Iniciar nuevo conteo
                    </button>
                </div>
            `;
        }
        return { ok: true, ajustes: [], finalizado: true };
    }

    // Construir payload (Req 7.3, 7.4).
    const payload = {
        zona,
        ajustes: discrepancias.map(d => ({
            codigo_producto: d.codigo,
            ubicacion: d.ubicacion,
            cantidad_sistema: Number(d.cantidad_sistema),
            cantidad_contada: Number(d.cantidad_contada),
            diferencia: Number(d.diferencia)
        }))
    };

    try {
        const resp = await aplicarAjustesRegularizacion(payload);

        // Éxito: marcar como finalizado y mostrar resumen (Req 7.5).
        regularizacionState.finalizado = true;

        const filas = discrepancias.map(d => {
            const dif = Number(d.diferencia);
            const signo = dif > 0 ? '+' : '';
            return `
                <tr>
                    <td><strong>${d.codigo}</strong></td>
                    <td><span class="location-badge-item">${d.ubicacion}</span></td>
                    <td class="text-center">${d.cantidad_sistema}</td>
                    <td class="text-center font-bold">${d.cantidad_contada}</td>
                    <td class="text-center font-bold reg-diferencia">${signo}${dif}</td>
                </tr>
            `;
        }).join('');

        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="flex-row gap-2 mb-3" style="justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <div>
                        <strong style="color: var(--color-success);">✅ Proceso finalizado</strong>
                        <p class="text-muted" style="margin-top:4px; font-size:0.85rem;">
                            Se aplicaron ${discrepancias.length} ajuste(s) al inventario.
                        </p>
                    </div>
                    <div class="flex-row gap-2">
                        <button class="btn btn-secondary btn-sm" onclick="cargarListadoConteo('${zona}')">
                            Iniciar nuevo conteo
                        </button>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Ubicación</th>
                                <th class="text-center">Cant. Anterior</th>
                                <th class="text-center">Cant. Nueva</th>
                                <th class="text-center">Diferencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas}
                        </tbody>
                    </table>
                </div>
            `;
        }

        return { ok: true, ajustes: payload.ajustes, finalizado: true, response: resp };
    } catch (err) {
        // Error: mantener ronda 3 activa, NO limpiar datos (Req 7.6).
        console.error('Error al aplicar ajustes de regularización:', err);
        if (typeof window !== 'undefined' && window.alert) {
            window.alert('Error al aplicar los ajustes. La ronda 3 sigue activa para reintentar.');
        }
        // Re-render de la tabla de discrepancias en estado final por si el DOM cambió.
        renderTablaDiscrepancias(zona, ronda, discrepancias, { esRondaFinal: true });
        return { ok: false, error: err && err.message ? err.message : String(err) };
    }
}

// Bind to window for global availability
window.renderRegularizacion = renderRegularizacion;
window.renderEmptyState = renderEmptyState;
window.initRegularizacion = initRegularizacion;
window.switchRegTab = switchRegTab;
window.cargarListadoConteo = cargarListadoConteo;
window.registrarConteo = registrarConteo;
window.validarCantidad = validarCantidad;
window.onConteoInput = onConteoInput;
window.getRegularizacionState = getRegularizacionState;
window.confirmarRonda = confirmarRonda;
window.generarListadoReconteo = generarListadoReconteo;
window.iniciarReconteo = iniciarReconteo;
window.imprimirHojaConteo = imprimirHojaConteo;
window.aplicarAjustes = aplicarAjustes;
