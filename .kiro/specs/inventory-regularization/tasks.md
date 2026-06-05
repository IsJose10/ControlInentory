# Implementation Plan: Inventory Regularization

## Overview

Implementar el módulo de Regularización de Inventario que permite realizar conteos físicos por zonas (Picking y Montacarguista), soporta hasta 3 rondas de conteo para resolver discrepancias, genera hojas de conteo imprimibles y aplica ajustes al inventario del sistema tras la ronda final.

## Tasks

- [x] 1. Backend - Funciones de base de datos y endpoints API
  - [x] 1.1 Implementar funciones de consulta de regularización en `db.js`
    - Añadir función `getRegularizacionPicking()` que ejecute query SQL para obtener ítems con stock > 0 en ubicaciones con posición < 20, agrupados por producto+ubicación, ordenados por ubicación ASC y código ASC
    - Añadir función `getRegularizacionMontacarguista()` que ejecute query SQL para obtener ítems con stock > 0 en ubicaciones con posición >= 20, agrupados por producto+ubicación, ordenados por ubicación ASC
    - Añadir función `aplicarAjusteRegularizacion(ajustes)` que inserte movimientos de ajuste en `inventario_movimientos` de forma transaccional (tipo IN si diferencia > 0, OUT si diferencia < 0, documento_referencia con formato `REG-YYYY-MM-DD-{ZONA}`)
    - Exportar las tres funciones en `module.exports`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 7.3, 7.4, 7.6_

  - [x] 1.2 Registrar endpoints API en `server.js`
    - Añadir ruta `GET /api/inventario/regularizacion/picking` que invoque `db.getRegularizacionPicking()` y retorne JSON con el listado
    - Añadir ruta `GET /api/inventario/regularizacion/montacarguista` que invoque `db.getRegularizacionMontacarguista()` y retorne JSON con el listado
    - Añadir ruta `POST /api/inventario/regularizacion/aplicar` que reciba el body con zona y ajustes, invoque `db.aplicarAjusteRegularizacion()`, y retorne resultado o error 500 si falla la transacción
    - Manejar errores con try/catch y retornar códigos HTTP apropiados (400, 404, 500)
    - _Requirements: 2.1, 2.5, 3.1, 7.3, 7.6_

  - [ ]* 1.3 Write property tests for zone filtering and field completeness
    - **Property 1: Zone filtering correctness** — Verificar que todos los ítems retornados por `getRegularizacionPicking` tienen posición < 20 y stock > 0, y todos los de `getRegularizacionMontacarguista` tienen posición >= 20 y stock > 0
    - **Validates: Requirements 2.1, 3.1**
    - **Property 2: Zone listing field completeness** — Verificar que cada ítem retornado contiene campos no nulos: codigo (string no vacío), descripcion (string no vacío), ubicacion (formato V + 6 dígitos), cantidad_sistema (número positivo)
    - **Validates: Requirements 2.2, 3.2**
    - **Property 3: Zone listing sort order** — Verificar que el listado de picking está ordenado por ubicación ASC y código ASC, y el de montacarguista por ubicación ASC
    - **Validates: Requirements 2.3, 3.3**

- [x] 2. Frontend - Estructura de navegación y pestaña de Regularización
  - [x] 2.1 Extender `inventario.js` con pestaña "Regularización"
    - Añadir una tercera pestaña "Regularización" al panel de tabs existente
    - Implementar lógica de `switchInvTab('regularizacion')` que muestre/oculte el contenido correspondiente
    - Mostrar el contenedor de regularización con sub-pestañas "Picking" y "Montacarguista"
    - Mostrar "Picking" activa por defecto al ingresar a la pestaña de Regularización
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.2 Crear módulo `client/js/views/regularizacion.js` con estructura base
    - Crear el archivo con la función principal `renderRegularizacion()` que genera el HTML de la vista
    - Implementar `switchRegTab(tab)` para alternar entre sub-pestañas Picking/Montacarguista
    - Implementar estado vacío con mensaje cuando no hay conteos en curso
    - Exportar funciones necesarias para integración con `inventario.js`
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 3. Checkpoint - Verificar navegación
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Frontend - Lógica de conteo y validación
  - [x] 4.1 Implementar carga de listado de conteo y funciones API en `api.js`
    - Añadir función `getRegularizacionPicking()` que haga GET a `/api/inventario/regularizacion/picking`
    - Añadir función `getRegularizacionMontacarguista()` que haga GET a `/api/inventario/regularizacion/montacarguista`
    - Añadir función `aplicarAjustesRegularizacion(payload)` que haga POST a `/api/inventario/regularizacion/aplicar`
    - _Requirements: 2.1, 3.1, 7.3_

  - [x] 4.2 Implementar estado de regularización y lógica de rondas en `regularizacion.js`
    - Definir objeto `regularizacionState` con zona, rondaActual, itemsConteo, conteoIngresado, discrepancias, historialRondas
    - Implementar `cargarListadoConteo()` que obtenga datos del API según la zona activa y renderice la tabla con campos de input numérico
    - Implementar `registrarConteo(key, valor)` que almacene cantidad contada en el mapa `conteoIngresado`
    - Implementar `validarCantidad(valor)` que acepte solo enteros >= 0 y <= 999,999
    - Mostrar confirmación visual (borde verde) en inputs válidos y error (borde rojo) en inputs inválidos
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.3 Write property test for count input validation
    - **Property 5: Count input validation** — Para cualquier valor de entrada, la función de validación acepta si y solo si es un entero >= 0 y <= 999,999
    - **Validates: Requirements 5.2, 5.3**

  - [x] 4.4 Implementar confirmación de ronda y detección de discrepancias
    - Implementar `confirmarRonda()` que compare cada cantidad ingresada vs cantidad del sistema
    - Bloquear confirmación si hay ítems sin contar (mostrar cantidad pendiente)
    - Identificar discrepancias (diferencia != 0) y resaltar visualmente con cantidad_sistema, cantidad_contada y diferencia
    - Si no hay discrepancias: mostrar mensaje de conformidad y finalizar proceso (terminación anticipada)
    - Si hay discrepancias en ronda 1 o 2: generar listado de reconteo con solo los ítems discrepantes
    - Implementar `generarListadoReconteo()` que filtre solo ítems con diferencias
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7, 8.1, 8.2_

  - [ ]* 4.5 Write property tests for discrepancy detection and round filtering
    - **Property 6: Discrepancy detection correctness** — Para cualquier par (cantidad_sistema, cantidad_contada), se identifica discrepancia si y solo si difieren, y la diferencia calculada es (contada - sistema)
    - **Validates: Requirements 6.1**
    - **Property 7: Next-round filtering** — Tras una ronda, el listado siguiente contiene exactamente los ítems con diferencia != 0 y excluye los que coinciden
    - **Validates: Requirements 6.2, 7.2**
    - **Property 8: Incomplete count blocking** — Si N ítems no tienen conteo registrado, la confirmación se bloquea e informa exactamente N pendientes
    - **Validates: Requirements 6.6**

- [x] 5. Checkpoint - Verificar lógica de conteo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend - Ronda 3 y ajustes de inventario
  - [x] 6.1 Implementar confirmación de ronda 3 y aplicación de ajustes
    - Implementar `aplicarAjustes()` que envíe al backend los ajustes de la ronda 3
    - Generar payload con zona y array de ajustes (codigo_producto, ubicacion, cantidad_sistema, cantidad_contada, diferencia)
    - Manejar respuesta exitosa mostrando resumen de ajustes (código, ubicación, cantidad anterior, cantidad nueva, diferencia)
    - Manejar error manteniendo ronda 3 activa para reintento sin limpiar datos
    - Bloquear intento de ronda 4 con mensaje "El proceso de regularización ya ha sido finalizado"
    - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.2 Write property tests for final round adjustments
    - **Property 9: Final round adjustment movement types** — Para cada ítem con diferencia en ronda 3, se genera movimiento IN si (contada - sistema) > 0, o OUT si < 0, con cantidad = valor absoluto de la diferencia
    - **Validates: Requirements 6.5, 7.3, 7.4**
    - **Property 10: Adjustment summary completeness** — El resumen contiene para cada ítem ajustado: codigo, ubicacion, cantidad_anterior = sistema, cantidad_nueva = contada, diferencia = nueva - anterior (matemáticamente consistente)
    - **Validates: Requirements 7.5**

- [x] 7. Frontend - Hoja de conteo imprimible
  - [x] 7.1 Extender `print.js` con tipo de documento REGULARIZACION
    - Añadir caso `REGULARIZACION` en la función de impresión existente
    - Generar encabezado con: fecha (DD/MM/AAAA), zona ("Picking" o "Montacarguista"), número de ronda
    - Generar tabla con columnas: Nº ítem (secuencial), código, descripción, ubicación, casilla en blanco (ancho mínimo 20mm)
    - Generar pie con espacio de firma y campo de fecha de ejecución
    - Ordenar ítems por ubicación ascendente
    - Mostrar mensaje si no hay ítems disponibles para imprimir
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.2 Conectar botón de impresión en `regularizacion.js`
    - Implementar `imprimirHojaConteo()` que invoque la función de impresión con los datos del listado actual
    - Pasar solo ítems de la zona activa (aislamiento de zona en impresión)
    - Validar que existan ítems antes de generar el documento
    - _Requirements: 4.4, 4.5_

  - [ ]* 7.3 Write property test for print zone isolation
    - **Property 4: Print zone isolation** — Para cualquier hoja de conteo generada, todos los ítems pertenecen exclusivamente a la zona indicada y ningún ítem de la otra zona aparece
    - **Validates: Requirements 4.4**

- [x] 8. Integración y finalización
  - [x] 8.1 Integrar módulo de regularización con `app.js` y navegación global
    - Registrar la vista de regularización en el sistema de navegación de la aplicación
    - Asegurar que el script `regularizacion.js` se carga en `index.html`
    - Verificar que el flujo completo funciona: cargar listado → ingresar conteo → confirmar ronda → reconteo → ronda 3 → ajustes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 8.2 Write integration tests for the complete regularization flow
    - Test API GET `/api/inventario/regularizacion/picking` retorna datos correctos
    - Test API GET `/api/inventario/regularizacion/montacarguista` retorna datos correctos
    - Test API POST `/api/inventario/regularizacion/aplicar` registra movimientos correctamente
    - Test transaccionalidad: error parcial revierte todos los cambios
    - _Requirements: 2.1, 3.1, 7.3, 7.6_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using **fast-check**
- Unit tests validate specific examples and edge cases
- The backend uses `executeQuery()` helper and follows the existing pattern in `db.js` for both SQLite and PostgreSQL compatibility
- Frontend follows the existing Vanilla JS view pattern used in `inventario.js`, `picking.js`, etc.
- Print functionality extends the existing `print.js` utility

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "2.1", "4.1"] },
    { "id": 2, "tasks": ["1.3", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4"] },
    { "id": 4, "tasks": ["4.5", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3"] },
    { "id": 7, "tasks": ["8.1"] },
    { "id": 8, "tasks": ["8.2"] }
  ]
}
```
