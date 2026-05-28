import { fetchAPI } from '../api.js';

export async function loadDashboardStats() {
    try {
        const productos = await fetchAPI('/productos') || [];
        const stock = await fetchAPI('/inventario/stock') || [];
        const movimientos = await fetchAPI('/inventario/movimientos') || [];
        const ventas = await fetchAPI('/ventas') || [];

        const todayStr = new Date().toISOString().split('T')[0];
        const ventasHoy = ventas.filter(v => v.fecha === todayStr);
        const pickingPendientes = ventas.filter(v => v.estado === 'Pendiente' || v.estado === 'Pre-alistado');

        const totalProdEl = document.getElementById('dash-total-productos');
        if (totalProdEl) totalProdEl.textContent = productos.length;
        
        const ventasHoyEl = document.getElementById('dash-ventas-hoy');
        if (ventasHoyEl) ventasHoyEl.textContent = ventasHoy.length;

        const pickPendEl = document.getElementById('dash-picking-pendiente');
        if (pickPendEl) pickPendEl.textContent = pickingPendientes.length;

        const totalMovEl = document.getElementById('dash-total-movimientos');
        if (totalMovEl) totalMovEl.textContent = movimientos.length;

        const recentBody = document.getElementById('dash-ventas-recent');
        if (recentBody) {
            recentBody.innerHTML = '';
            if (ventas.length === 0) {
                recentBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay remisiones registradas</td></tr>';
            } else {
                ventas.slice(0, 5).forEach(v => {
                    const badgeClass = v.estado === 'Completado' ? 'badge-completed' : 'badge-pending';
                    recentBody.innerHTML += `
                        <tr>
                            <td><strong>${v.remision}</strong></td>
                            <td>${v.fecha}</td>
                            <td>${v.cliente_nombre || v.cliente_nit}</td>
                            <td><span class="badge ${badgeClass}">${v.estado}</span></td>
                        </tr>
                    `;
                });
            }
        }

        const stockBody = document.getElementById('dash-stock-summary');
        if (stockBody) {
            stockBody.innerHTML = '';
            if (stock.length === 0) {
                stockBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay stock registrado</td></tr>';
            } else {
                stock.slice(0, 5).forEach(s => {
                    stockBody.innerHTML += `
                        <tr>
                            <td><strong>${s.codigo}</strong></td>
                            <td>${s.descripcion}</td>
                            <td class="text-center"><span class="badge ${s.stock_total > 0 ? 'badge-completed' : 'badge-danger'}">${s.stock_total}</span></td>
                        </tr>
                    `;
                });
            }
        }
    } catch (err) {
        console.error('Error al cargar estadísticas del Dashboard', err);
    }
}

// Bind to window object for global availability
window.loadDashboardStats = loadDashboardStats;
