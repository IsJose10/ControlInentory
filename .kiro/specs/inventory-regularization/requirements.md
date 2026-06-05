# Requirements Document

## Introduction

El módulo de Regularización de Inventario permite realizar conteos físicos periódicos del almacén, comparando las cantidades registradas en el sistema con las cantidades reales en las ubicaciones. El proceso se divide por zonas de trabajo (Picking y Montacarguista), genera hojas de conteo imprimibles, y permite hasta 3 rondas de conteo para resolver discrepancias antes de ajustar el inventario del sistema.

## Glossary

- **Sistema_Regularización**: Módulo dentro de Inventario encargado de gestionar el proceso de conteo físico y ajuste de inventario.
- **Zona_Picking**: Conjunto de ubicaciones del almacén cuyo código de posición (últimos 2 dígitos de la ubicación) es menor que 20 (posiciones 10, 14).
- **Zona_Montacarguista**: Conjunto de ubicaciones del almacén cuyo código de posición (últimos 2 dígitos de la ubicación) es mayor o igual a 20 (posiciones 20, 24, 30, 34, 40, 44, 50, 54, 60, 64).
- **Ubicación**: Código de posición física en el almacén con formato `V` + vano(2 dígitos) + nivel(2 dígitos) + posición(2 dígitos). Ejemplo: V010110.
- **Hoja_de_Conteo**: Documento imprimible que lista los ítems a contar con campos para registrar cantidades físicas.
- **Ronda_de_Conteo**: Cada iteración del proceso de conteo físico. El sistema permite un máximo de 3 rondas.
- **Discrepancia**: Diferencia entre la cantidad registrada en el sistema y la cantidad contada físicamente para un ítem en una ubicación específica.
- **Conteo_Final**: Tercera ronda de conteo que confirma las cantidades y aplica los ajustes al inventario del sistema.

## Requirements

### Requisito 1: Acceso a la sección de Regularización

**Historia de Usuario:** Como operador de almacén, quiero acceder a una sección de Regularización dentro del módulo de Inventario, para poder iniciar procesos de conteo físico de forma organizada.

#### Criterios de Aceptación

1. THE Sistema_Regularización SHALL presentar una pestaña denominada "Regularización" dentro de la vista del módulo de Inventario, posicionada junto a las pestañas existentes ("Consulta de Inventario" y "Carga Inventario General").
2. WHEN el usuario selecciona la pestaña "Regularización", THE Sistema_Regularización SHALL mostrar un panel con dos sub-pestañas visibles: "Picking" y "Montacarguista".
3. WHEN el usuario ingresa a la sección de Regularización, THE Sistema_Regularización SHALL mostrar la sub-pestaña "Picking" como activa y su contenido visible, y la sub-pestaña "Montacarguista" como inactiva y su contenido oculto.
4. WHEN el usuario selecciona la sub-pestaña "Montacarguista", THE Sistema_Regularización SHALL mostrar el contenido de "Montacarguista" y ocultar el contenido de "Picking", actualizando el estado visual de las sub-pestañas para reflejar cuál está activa.
5. IF no existen procesos de regularización iniciados, THEN THE Sistema_Regularización SHALL mostrar un estado vacío dentro de cada sub-pestaña con un mensaje indicando que no hay conteos en curso.

### Requisito 2: Generación de listado de conteo para Picking

**Historia de Usuario:** Como operador de picking, quiero obtener un listado de los ítems a contar en mi zona de trabajo, para realizar el conteo físico de forma eficiente.

#### Criterios de Aceptación

1. WHEN el usuario selecciona la pestaña "Picking", THE Sistema_Regularización SHALL generar un listado que incluya todos los ítems cuya ubicación tenga los últimos dos dígitos del código de posición con valor numérico menor que 20 (posiciones de picking: 10, 14) y cuyo stock neto calculado (suma de entradas menos suma de salidas) sea mayor que cero.
2. THE Sistema_Regularización SHALL mostrar en el listado de Picking las columnas: código de producto, descripción del producto, ubicación (formato V + vano + nivel + posición, e.g., V010110) y cantidad registrada en el sistema (stock neto: total de movimientos IN menos total de movimientos OUT para esa combinación producto-ubicación).
3. THE Sistema_Regularización SHALL ordenar el listado de Picking por ubicación de forma ascendente (orden alfanumérico) y, en caso de ubicaciones iguales, por código de producto de forma ascendente.
4. IF no existen ítems con stock mayor que cero en ubicaciones de picking (posición < 20), THEN THE Sistema_Regularización SHALL mostrar un mensaje indicando que no hay ítems para contar en la zona de picking.
5. THE Sistema_Regularización SHALL generar el listado en un tiempo máximo de 5 segundos y mostrar un máximo de 2000 registros por consulta.

### Requisito 3: Generación de listado de conteo para Montacarguista

**Historia de Usuario:** Como montacarguista, quiero obtener un listado de los ítems a contar en las ubicaciones de altura, para realizar el conteo físico de las posiciones que requieren equipo de elevación.

#### Criterios de Aceptación

1. WHEN el usuario selecciona la pestaña "Montacarguista", THE Sistema_Regularización SHALL generar un listado que incluya todos los ítems cuya ubicación tenga los últimos dos dígitos del código de posición (caracteres 6 y 7 del código de ubicación con formato V+vano(2)+nivel(2)+posición(2)) mayores o iguales a 20, mostrando únicamente aquellos ítems cuyo stock neto (suma de entradas menos suma de salidas) en dicha ubicación sea mayor a 0.
2. THE Sistema_Regularización SHALL mostrar en el listado de Montacarguista las columnas: código de producto, descripción del producto, ubicación y cantidad registrada en el sistema (stock neto por ubicación, calculado como la suma de movimientos IN menos la suma de movimientos OUT para ese producto en esa ubicación específica), generando una fila por cada combinación única de producto y ubicación de altura.
3. THE Sistema_Regularización SHALL ordenar el listado de Montacarguista por ubicación de forma ascendente (orden alfanumérico).
4. IF no existen ítems con stock mayor a 0 en ubicaciones de altura (posición >= 20), THEN THE Sistema_Regularización SHALL mostrar un mensaje indicando que no hay ítems pendientes de conteo en posiciones de altura.

### Requisito 4: Generación de hoja de conteo imprimible

**Historia de Usuario:** Como operador de almacén, quiero imprimir una hoja de conteo con los ítems a verificar, para realizar el conteo físico con un documento en mano.

#### Criterios de Aceptación

1. WHEN el usuario solicita imprimir la hoja de conteo, THE Sistema_Regularización SHALL generar un documento imprimible con formato tabular, con los ítems ordenados por ubicación de forma ascendente para facilitar el recorrido físico en almacén.
2. THE Sistema_Regularización SHALL incluir en la hoja de conteo imprimible las columnas: número de ítem (secuencial), código de producto, descripción del producto, ubicación y una casilla en blanco para registrar el conteo físico (ancho mínimo de 20 mm para escritura manual).
3. THE Sistema_Regularización SHALL incluir en el encabezado de la hoja imprimible: fecha de generación (formato DD/MM/AAAA), zona ("Picking" o "Montacarguista") y número de ronda de conteo (valor numérico entero comenzando en 1).
4. THE Sistema_Regularización SHALL generar la hoja de conteo imprimible exclusivamente con los ítems correspondientes a la pestaña activa (Picking o Montacarguista), sin incluir ítems de la otra zona.
5. IF no existen ítems en la pestaña activa al momento de solicitar la impresión, THEN THE Sistema_Regularización SHALL mostrar un mensaje indicando que no hay ítems disponibles para generar la hoja de conteo y no generar el documento.
6. THE Sistema_Regularización SHALL incluir al pie de la hoja imprimible un espacio de firma para el operador que realizó el conteo y un campo para registrar la fecha de ejecución del conteo físico.

### Requisito 5: Registro de conteo físico

**Historia de Usuario:** Como operador de almacén, quiero ingresar las cantidades contadas físicamente en el sistema, para que se comparen con el inventario registrado.

#### Criterios de Aceptación

1. THE Sistema_Regularización SHALL proporcionar un campo de entrada numérico junto a cada ítem del listado para registrar la cantidad contada físicamente, con un valor inicial vacío que indique que el ítem aún no ha sido contado.
2. WHEN el usuario ingresa una cantidad en el campo de conteo, THE Sistema_Regularización SHALL validar que el valor sea un número entero mayor o igual a cero y menor o igual a 999,999 unidades, y mostrar una confirmación visual (por ejemplo, borde o fondo del campo en color de éxito) indicando que el valor fue aceptado.
3. IF el usuario ingresa un valor no numérico, negativo o superior a 999,999 en el campo de conteo, THEN THE Sistema_Regularización SHALL resaltar el campo con un indicador visual de error, rechazar el valor y mantener el último valor válido registrado en dicho campo.
4. IF el usuario deja el campo de conteo vacío para un ítem, THEN THE Sistema_Regularización SHALL tratar dicho ítem como "no contado" y excluirlo de la comparación con el inventario registrado hasta que se ingrese un valor válido.

### Requisito 6: Detección de discrepancias y reconteo

**Historia de Usuario:** Como supervisor de almacén, quiero que el sistema identifique automáticamente las diferencias entre el conteo físico y el inventario registrado, para focalizar los reconteos solo en los ítems con discrepancias.

#### Criterios de Aceptación

1. WHEN el usuario confirma el conteo de una ronda, THE Sistema_Regularización SHALL comparar cada cantidad ingresada con la cantidad registrada en el sistema para cada ítem y ubicación, identificando como discrepancia cualquier diferencia distinta de cero entre ambas cantidades.
2. WHEN existen discrepancias entre el conteo físico y el inventario registrado en la ronda 1 o ronda 2, THE Sistema_Regularización SHALL generar un nuevo listado de reconteo para la siguiente ronda que incluya exclusivamente los ítems con diferencias, excluyendo los ítems cuyas cantidades coincidieron.
3. WHEN existen discrepancias detectadas en una ronda, THE Sistema_Regularización SHALL resaltar visualmente los ítems con discrepancias mostrando la cantidad del sistema, la cantidad contada y la diferencia numérica (positiva o negativa).
4. WHEN no existen discrepancias entre el conteo físico y el inventario registrado en cualquier ronda, THE Sistema_Regularización SHALL mostrar un mensaje de conformidad indicando que el inventario físico coincide con el sistema y dar por finalizado el proceso de regularización para esos ítems.
5. WHEN el usuario confirma el conteo de la ronda 3 (ronda final), THE Sistema_Regularización SHALL aplicar las cantidades del conteo físico como nuevo inventario registrado para todos los ítems incluidos en dicha ronda, independientemente de si persisten discrepancias.
6. IF el usuario intenta confirmar una ronda sin haber ingresado la cantidad contada para todos los ítems del listado, THEN THE Sistema_Regularización SHALL impedir la confirmación y mostrar un mensaje indicando la cantidad de ítems pendientes de conteo.
7. THE Sistema_Regularización SHALL permitir un máximo de 3 rondas de conteo por proceso de regularización.

### Requisito 7: Límite de rondas de conteo y confirmación final

**Historia de Usuario:** Como supervisor de almacén, quiero que el tercer conteo sea definitivo y ajuste el inventario del sistema, para cerrar el proceso de regularización con datos verificados.

#### Criterios de Aceptación

1. THE Sistema_Regularización SHALL permitir un máximo de 3 rondas de conteo por proceso de regularización. IF el usuario intenta iniciar una ronda adicional tras completar la ronda 3, THEN THE Sistema_Regularización SHALL rechazar la acción y mostrar un mensaje indicando que el proceso ya fue finalizado.
2. WHILE el proceso se encuentra en la ronda 1 o ronda 2, THE Sistema_Regularización SHALL permitir al usuario confirmar el conteo e iniciar una nueva ronda exclusivamente con los ítems cuya cantidad contada difiere de la cantidad registrada en el sistema (diferencia distinta de cero).
3. WHEN el usuario confirma el conteo en la ronda 3, THE Sistema_Regularización SHALL aplicar las cantidades del tercer conteo como valores definitivos y actualizar el inventario del sistema registrando la diferencia neta (cantidad contada menos cantidad del sistema) para cada ítem con discrepancia.
4. WHEN el usuario confirma el conteo en la ronda 3, THE Sistema_Regularización SHALL registrar un movimiento de ajuste en la tabla inventario_movimientos para cada ítem cuya cantidad fue modificada, con tipo 'IN' si la diferencia es positiva o tipo 'OUT' si la diferencia es negativa, y con documento_referencia que identifique el proceso de regularización de origen.
5. WHEN el proceso de regularización finaliza, THE Sistema_Regularización SHALL mostrar un resumen de los ajustes realizados indicando: código de producto, ubicación, cantidad anterior, cantidad nueva y diferencia. IF no existen ajustes al finalizar la ronda 3, THEN THE Sistema_Regularización SHALL mostrar un mensaje indicando que no se encontraron diferencias y que el inventario no requirió modificaciones.
6. IF ocurre un error durante la actualización del inventario en la confirmación de la ronda 3, THEN THE Sistema_Regularización SHALL revertir todos los cambios parciales realizados en esa confirmación, mantener el proceso en estado de ronda 3 pendiente de confirmación y mostrar un mensaje de error indicando que la actualización no se completó.

### Requisito 8: Finalización anticipada sin discrepancias

**Historia de Usuario:** Como operador de almacén, quiero que el proceso de regularización finalice automáticamente si no hay discrepancias en alguna ronda intermedia, para no realizar conteos innecesarios.

#### Criterios de Aceptación

1. WHEN se completa el registro de conteo de todos los ítems de la ronda 1 o ronda 2 y la cantidad contada de cada ítem coincide exactamente con la cantidad registrada en el sistema, THE Sistema_Regularización SHALL finalizar el proceso de regularización dentro de los 3 segundos siguientes, estableciendo el estado del proceso como "completado sin ajustes" y sin requerir rondas adicionales.
2. WHEN el proceso finaliza anticipadamente sin discrepancias, THE Sistema_Regularización SHALL mostrar al operador un mensaje confirmando que el inventario físico coincide con el inventario del sistema, indicando la ronda en la que se verificó la coincidencia y que no se requieren ajustes.
3. WHEN el proceso finaliza anticipadamente sin discrepancias, THE Sistema_Regularización SHALL registrar la fecha, hora, ronda de finalización y el operador responsable como evidencia de cierre anticipado para consulta posterior.
4. IF ocurre un error durante la comparación automática entre el conteo y el inventario del sistema, THEN THE Sistema_Regularización SHALL mantener el proceso en estado activo, mostrar un mensaje de error indicando que no se pudo completar la validación, y permitir al operador reintentar la comparación.
