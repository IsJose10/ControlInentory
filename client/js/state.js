export const state = {
    currentView: 'dashboard',
    clientes: [],
    proveedores: [],
    productos: [],
    movimientosRecientes: [],
    stockPorUbicacion: [],
    currentPickingData: null,
    activeReceiptOC: null,
    activeDiscrepancyReport: null
};

export const UBICACION = {
    vanos: Array.from({ length: 3 }, (_, i) => String(i + 1).padStart(2, '0')),
    niveles: Array.from({ length: 40 }, (_, i) => String(i + 1).padStart(2, '0')),
    posiciones: ['10', '14', '20', '24', '30', '34', '40', '44', '50', '54', '60', '64']
};

