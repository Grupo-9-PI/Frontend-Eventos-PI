# Cumplimiento de criterios por Sprint — Frontend

Este documento describe, para el repositorio **Frontend-Eventos-PI**, todo lo que ya está
implementado en relación con los criterios de los sprints 0, 1, 2, 3 y 4. Las ramas de trabajo han sido
`feature/sprint-hoy-wiring`, `feature/sprint3-capacidad-conflictos` y `feature/sprint4-estado-tareas`.

El backend que consume está en **Backend-Eventos-PI** (`feature/sprint-auth-hoy`,
`feat/backend-limites-horas` y `feature/sprint3-capacidad-conflictos`), documentado en su propio
`CUMPLIMIENTO-SPRINTS.md`.

---

## Cómo levantar y verificar

```powershell
npm install
Copy-Item .env.example .env   # VITE_API_URL apunta a http://localhost:8000/api por defecto
npm run dev                   # http://localhost:5173
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` | Compilación de producción en `dist/`. |
| `npm run preview` | Sirve la compilación. |
| `npm run typecheck` | Verificación de tipos (0 errores). |

---

## Sprint 0 — Base técnica y arquitectura

### C5 — Arquitectura de información mínima (rutas SPA)

| Ruta | Pantalla | Acceso |
| --- | --- | --- |
| `/login` | Inicio de sesión | Pública |
| `/registro` | Crear cuenta | Pública |
| `/recuperar` | Recuperación de contraseña | Pública |
| `/` | Redirige a `/hoy` | Protegida |
| `/hoy` | Panel de gestiones urgentes | Protegida |
| `/eventos` | Listado de eventos | Protegida |
| `/crear` | Crear evento + plan inicial | Protegida |
| `/evento/:id` | Detalle y gestiones del evento | Protegida |
| `/progreso` | Métricas globales y por evento | Protegida |
| `/opciones` | Opciones de la cuenta (límite diario) | Protegida |
| (resto) | Vista 404 | — |

Las rutas protegidas usan `ProtectedRoute`: sin sesión redirigen a `/login`.

### C6 — Prototipo "Hoy" v1

- Vista `/hoy` con las gestiones agrupadas, contador de abiertas y acción principal **Crear
  evento**; cada fila permite marcar/desmarcar, reprogramar y ver el evento al que pertenece.

---

## Sprint 1 — Flujo end-to-end y calidad

### C1 — Flujo end-to-end (React → DRF → BD)

- `CrearEvento` envía el evento y, si se define, su **plan inicial de gestiones** a la API
  (`POST /api/eventos/` y `POST /api/subtareas/`); al terminar navega al detalle del evento.
- Plantillas rápidas de plan (Conferencia, Fiesta, Boda, Reunión) y gestión manual de borradores.
- El detalle del evento permite agregar, editar, mover y eliminar gestiones, todo contra la API.

### C2 — Validaciones frontend y feedback

- Validación por campo con mensajes en español (`field-error`): nombre, lugar, fechas, hora,
  duración, título de gestión, fecha/hora límite y estimación.
- Duración y estimaciones usan `<input type="time">` nativo (formato `HH:MM` obligatorio), no texto
  libre.
- Avisos de éxito/error no intrusivos (toast) y mensaje de error legible en login/registro.
- Tras guardar, marcar o eliminar, los datos se refrescan en silencio (sin parpadeo de esqueleto).

### C4 — UI mínima: formulario de evento y lista de gestiones

- Formulario estructurado por secciones, con campos obligatorios marcados (`*`) y errores inline.
- Listado de eventos en tarjetas con progreso y gestiones pendientes.
- Vista de progreso con métricas globales y desglose por evento.

### C5 / C6 — Evidencia UX/HCI disponible en el repositorio

Decisiones visibles implementadas en el código (la bitácora completa y las 22 decisiones viven en
el Documento Único):

- Mensajes y microcopy en español, sin tecnicismos.
- Estados explícitos: vacío con acción sugerida, carga con esqueleto y error con reintento.
- Tema claro/oscuro persistido en `localStorage`.
- Jerarquía visual de urgencia en `/hoy`: filas vencidas resaltadas y etiqueta "Requieren decisión".
- Componente de la **regla de prioridad** visible en la interfaz (tooltip "¿Cómo se ordena?" junto
  al selector de evento activo).

---

## Sprint 2 — Login y vista Hoy

### C1 — Login local, rutas protegidas y aislamiento

- Login y registro reales contra la API (`/api/auth/login/`, `/api/auth/registro/`); se eliminaron
  los accesos simulados (Google/Outlook).
- El token se guarda en `localStorage` si se marca "Mantener sesión iniciada"; si no, en
  `sessionStorage`. Al arrancar se valida con `GET /api/auth/me/`.
- `services/api.ts` adjunta `Authorization: Token <token>` en cada petición y, ante un 401, limpia
  la sesión y vuelve al login.
- Cerrar sesión llama a `/api/auth/logout/` (invalida el token en el servidor) y limpia el estado.
- El aislamiento por organizador lo garantiza el backend; el frontend solo muestra lo que la API
  le devuelve para la cuenta autenticada.

### C2 — Vista Hoy

- Consume `GET /api/hoy/` y pinta los grupos **Vencidas**, **Para hoy** y **Próximas** tal como
  llegan (agrupados por fecha y hora, ordenados por fecha y luego por menor esfuerzo).
- Cada fila muestra evento, vencimiento ("Vencida hoy · HH:MM", "Hoy · HH:MM" o fecha), estimación
  en horas y estado.
- Las filas vencidas se resaltan y el grupo Vencidas lleva la etiqueta "Requieren decisión".

### C3 — Regla de priorización visible

- Tooltip **"¿Cómo se ordena?"** en la barra superior (visible en todas las vistas, incluida Hoy):
  *"Primero las gestiones vencidas (cuya fecha y hora límite ya pasó), después las que vencen hoy y
  al final las próximas. Dentro de cada grupo va arriba la fecha más cercana y, si dos coinciden, la
  de menor esfuerzo estimado."* (2–4 líneas, sin jerga).
- El texto coincide 1:1 con el criterio de agrupación y orden del backend.

### C4 — Estados UX en `/hoy`

| Estado | Comportamiento |
| --- | --- |
| Carga | Esqueleto animado con tiempo mínimo visible de 600 ms (evita parpadeos). |
| Error | Tarjeta amigable "Algo salió mal al cargar tus gestiones" con el detalle y botón **Reintentar** que vuelve a consultar la API. |
| Vacío | Sin eventos: "Todavía no hay eventos" con acción **Crear evento**. Sin pendientes: "No hay gestiones pendientes" con acción **Ver eventos**. |

### C5 — Consumo de la API documentada

- `lib/repositorioEventos.ts` centraliza el mapeo entre camelCase (UI) y snake_case (API) para
  eventos, gestiones y `/hoy/`, incluyendo errores de red en un resultado tipado.
- Endpoints consumidos: `/auth/login/`, `/auth/registro/`, `/auth/logout/`, `/auth/me/`,
  `/eventos/` (CRUD), `/subtareas/` (CRUD) y `/hoy/`.

---

## Sprint 3 — Capacidad diaria, reprogramación y resolución de conflictos

### C1 — Reprogramar gestiones y verlo reflejado en `/hoy`

- La acción **Mover** (en `/hoy` y en el detalle del evento) guarda con
  `PATCH /api/subtareas/{id}/reprogramar/` y refresca los datos: la gestión cambia de grupo
  (Vencidas / Para hoy / Próximas) de inmediato.
- Confirmación no intrusiva: *"Fecha actualizada: la gestión se movió al …"*.
- Error de red o servidor: mensaje claro en el diálogo y **Confirmar** conserva fecha, hora y
  esfuerzo ingresados para reintentar.

### C2 — Límite diario configurable (persistido en la cuenta)

- La página **/opciones** (nueva, en el menú lateral) concentra los ajustes de la cuenta. Su tarjeta
  **Límite diario de trabajo** lee y guarda contra `GET/PUT /api/config/` (se eliminó el
  almacenamiento local del límite).
- Valor por defecto 6 h cuando no hay registro; validación en cliente y servidor de **1 a 16 h**.
- Estados: guardando ("Guardando…"), éxito ("Capacidad actualizada") y error con el input intacto.

### C3 — Conflicto de sobrecarga con cifras explícitas

- Al confirmar una reprogramación, el backend evalúa la carga del día (sin contar gestiones hechas)
  y responde `409` con las cifras. El diálogo muestra:
  *"Para el … quedarías con **X h planificadas** (límite **Y h**), un exceso de Z h"* y cuántas
  horas aportan otras gestiones abiertas de ese día.
- Se listan hasta 3 **fechas sugeridas** por el servidor, cada una con su carga proyectada.

### C4 — Resolución del conflicto (2 estrategias funcionales)

- **Mover a un día con capacidad:** `POST /api/subtareas/{id}/resolver-conflicto/` con
  `mover_otro_dia`; si el recálculo confirma, se cierra el diálogo y `/hoy` refleja el cambio.
- **Reducir la estimación:** estrategia `reducir_horas`; si aún excede el límite, el diálogo lo
  informa con las nuevas cifras y nuevas sugerencias (el cambio ya quedó persistido).
- Las horas de trabajo de cada evento se **calculan en el backend** (`horas_planificadas`, suma de
  las estimaciones de sus gestiones) y alimentan la detección de sobrecargas; ya no existe un
  presupuesto local por navegador ni un campo de presupuesto en la creación del evento.

### Extra — Edición de eventos

- En el detalle del evento, el botón **Editar evento** abre un diálogo con los datos generales
  (nombre, tipo, fechas, hora, duración, lugar y notas) y guarda con `PUT /api/eventos/{id}/`.
- Las gestiones/subtareas no se tocan desde ese diálogo.

### C5 — Calidad IxD del diálogo de conflicto

- Microcopy en español sin jerga técnica, botones con verbo ("Usar esta fecha", "Aplicar horas",
  "Revisar fecha"), estado "Guardando…" y feedback inmediato (toast) al resolver.
- Accesibilidad: `role="alertdialog"`, `aria-modal`, foco automático en el diálogo, cierre con
  `Escape` y retorno del foco al abrir/cerrar.
- El diálogo distingue el origen del límite (CAPACIDAD DIARIA vs PRESUPUESTO DEL EVENTO).

### C5 (API) — Endpoints del Sprint 3 consumidos por la UI

| Método | Ruta | Uso en la UI |
| --- | --- | --- |
| GET/PUT | `/api/config/` | Leer y guardar el límite diario del organizador. |
| PATCH | `/api/subtareas/{id}/reprogramar/` | Guardar la reprogramación y recibir el 409 con cifras y fechas sugeridas. |
| POST | `/api/subtareas/{id}/resolver-conflicto/` | Aplicar `mover_otro_dia` o `reducir_horas` y leer `resuelto` + totales. |

---

## Sprint 4 — Estado de tareas (Hecha / Pospuesta) y barra de progreso

### C1 — Marcar cada gestión como "Hecha" o "Pospuesta"

La fila de gestión (`FilaTarea`, en `src/App.tsx`) suma dos acciones por tarea, sin quitar ninguna de
las que ya existían (checkbox de completada, **Mover**, **Editar**, **Eliminar**):

| Acción | Botón | Efecto |
| --- | --- | --- |
| Completar | **Marcar hecha** / checkbox | `estado: "hecho"` contra `PUT /api/subtareas/{id}/`. Deja de contar en la carga urgente de hoy. |
| Posponer | **Posponer** | Abre `PosponerDialog` → `estado: "pospuesta"` + `nota_pospuesta` + fecha nueva opcional. |
| Reabrir | **Reactivar** | Vuelve a `estado: "pendiente"` y borra la nota. |

La lista quedó separada en tres bloques por estado, cada uno con su encabezado y contador:

- **Abiertas** (`pendiente` / `en_progreso`) — `/evento/:id`.
- **Pospuestas** — bloque propio en `/hoy` y en `/evento/:id`, con la etiqueta *"Fuera de la carga de
  hoy"*.
- **Completadas** (`hecho`) — sin cambios respecto al Sprint 3.

Accesibilidad: los botones llevan `aria-label` en el checkbox, `title` en los de icono y
`data-testid` estables (`task-check-{id}`, `posponer-{id}`, `marcar-hecha-{id}`, `reactivar-{id}`,
`task-note-{id}`).

### C2 — Barra de progreso del evento

Componente reutilizable **`BarraProgresoEvento`** (`src/App.tsx`), montado en las dos rutas pedidas:

| Ruta | Dónde | Presentación |
| --- | --- | --- |
| `/evento/:id` | Tarjeta `detail-progress`, bajo el encabezado | Barra completa: rótulo **Avance del plan**, % grande y leyenda de conteo. |
| `/progreso` | Columna derecha de cada fila de *Desglose por Evento* | Versión `compacta`: barra + leyenda (el % grande ya está a la izquierda). |

- **Porcentaje exacto**: `ejecutadas / total` redondeado (`calcularPorcentaje`, `src/App.tsx`), es
  decir, solo cuenta como avance lo que está en `hecho`; lo pospuesto no infla el avance.
- **Conteo en texto**: *"3 de 7 gestiones ejecutadas · 1 pospuesta · 3 abiertas"*, con
  `aria-live="polite"` para que el lector de pantalla anuncie el cambio.
- Accesibilidad: `role="progressbar"` con `aria-valuenow/valuemin/valuemax` y `aria-label` con el
  nombre del evento.
- **Conexión al estado**: lee `eventos[].subtareas` del store, que se actualiza con el parche
  optimista y luego con la respuesta del servidor. Cambiar cualquier tarea mueve la barra al
  instante, sin recargar.

### C3 — Reactividad de `/hoy` sin recargar la página

El store aplica un **parche optimista** (`reflejarEnMemoria`, `src/App.tsx`) antes de llamar a la API:
al completar o posponer, la gestión sale del grupo correspondiente y el `total` se recalcula en el
mismo tick de render.

- Sin parpadeo: no se activa el esqueleto de carga (se usa `cargarTodo(false)`).
- Si la petición falla, el estado real se restaura con una recarga silenciosa y se avisa con un toast.
- `/hoy` sigue alimentándose de `GET /api/hoy/`; la capa local (`aplicarCapaPospuestas` +
  `filtrarHoyPorPospuestas`) solo filtra lo que el servidor todavía no conoce.

### C4 — Nota opcional de posposición y microcopy

**La nota se ve siempre.** Al posponer se abre `PosponerDialog` con:

- Campo de texto **"Motivo de la posposición"** (`posponer-nota`), con la pista
  *"ej. esperando confirmación de salón"*.
- **Nueva fecha límite opcional** (`posponer-fecha` / `posponer-hora`): si no se toca, solo se mueve el
  estado; si se cambia, se reutiliza `PATCH /api/subtareas/{id}/reprogramar/` del Sprint 3 y su
  validación de sobrecarga diaria. El `max` del date es la fecha de inicio del evento, que es el límite
  que el servidor impone.

La nota se muestra en un bloque `.task-note` (icono `StickyNote`, rótulo *"Motivo de la posposición"*)
en cada fila pospuesta de `/hoy` y de `/evento/:id`, y el botón **Reactivar** acompaña a la fila.

**Microcopy de confirmación** (`microcopyEstado`, `src/App.tsx`), en lugar de mensajes genéricos:

| Acción | Toast |
| --- | --- |
| Completar | *"Gestión completada: «Confirmar salón» ya no pesa en la carga de hoy."* |
| Posponer con nota | *"Gestión pospuesta: «Confirmar salón». Quedó anotado: esperando confirmación de salón."* |
| Posponer sin nota | *"Gestión pospuesta: «Confirmar salón» salió de tu carga de hoy."* |
| Reabrir | *"Gestión reabierta: «Confirmar salón» vuelve a la carga de hoy."* |

Se ajustaron además los mensajes de crear y eliminar gestión (*"… al plan del evento"*). Encima del
contenido aparece un indicador **"N pospuestas"** (`pospuestas-indicator`) que enlaza al bloque
`#pospuestas` de `/hoy`.

### Contrato de API y capa local de respaldo

El backend desplegado (`Backend-Eventos-PI`) todavía **no conoce `pospuesta` ni `nota_pospuesta`**: su
modelo `Subtarea.OPCIONES_ESTADO` es `pendiente | en_progreso | hecho` y el serializer rechaza valores
fuera de esas opciones. El frontend se escribió contra el contrato final y degrada sin romperse:

1. Se envía `estado: "pospuesta"` y `nota_pospuesta` en el `PUT` de la subtarea.
2. Si el servidor responde **400** en el campo `estado`, se detecta con `esEstadoPospuestaRechazado`
   y se reintenta automáticamente como `pendiente` (`enviarEstado`, `src/App.tsx`).
3. La posposición y su nota quedan en `repositorioPospuestas`, una capa en `localStorage` **aislada por
   cuenta** (clave `eventops_pospuestas_<token>`), que se aplica en cada carga con
   `aplicarCapaPospuestas` (eventos) y `filtrarHoyPorPospuestas` (vista de hoy).
4. Cuando el backend incorpore `pospuesta` / `nota_pospuesta`, la capa deja de intervenir de forma
   automática: el servidor pasa a ser la fuente de verdad y **no hay que tocar la UI**.

La capa cubre solo el estado que el servidor aún no expone, en línea con el criterio de no duplicar
en el cliente lo que el backend calcula (`horasPlanificadas`, Sprint 3).

### Archivos y rutas modificados

| Archivo | Cambios del Sprint 4 |
| --- | --- |
| `src/lib/repositorioEventos.ts` | `EstadoSubtarea` suma `"pospuesta"`; `Subtarea` suma `notaPospuesta`; `Resultado` suma `codigo`; `mapSubtareaToApi` / `mapSubtareaFromApi` / `mapTareaHoyFromApi` con `nota_pospuesta`; nuevos `CODIGO_ESTADO_POSPUESTA`, `esEstadoPospuestaRechazado`, `repositorioPospuestas`, `aplicarCapaPospuestas`, `filtrarHoyPorPospuestas`, `tareasPospuestas`. |
| `src/App.tsx` | Store: `posponerSubtarea`, `reactivarSubtarea`, `enviarEstado`, `reflejarEnMemoria`, `microcopyEstado`, `esVisibleEnHoy`, `pospuestas`/`totalPospuestas`, capa aplicada en `cargarTodo`. Componentes: `BarraProgresoEvento`, `PosponerDialog`, `IndicadorPospuestas`, `FilaTarea` ampliada, `Hoy` con bloque de pospuestas, `DetalleEvento` con barra y separación por estado, `Progreso` con barra por evento y tarjeta de pospuestas. |
| `src/index.css` | `.tag-pospuesta`, `.task-row.pospuesta`, `.task-note`, `.progress-block/.progress-head/.progress-percent/.progress-legend`, `.detail-progress`, `.pospuestas-indicator`, `.posponer-dialog`, `.posponer-dates` y sus reglas móviles. Todo aditivo: no se modificó ninguna clase existente. |

### Verificación realizada

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | 0 errores. |
| `npm run build` | Compila sin advertencias. |
| Suite del backend (`python manage.py test`) | 43 pruebas, OK (sin regresiones). |
| Contrato real contra el backend desplegado | `PUT` con `estado: "pospuesta"` → **400** `{"estado": ["\"pospuesta\" no es una elección válida."]}`; el detector lo identifica y el reintento como `pendiente` responde **200**. El campo `nota_pospuesta` extra es **ignorado** por el serializer actual (no rompe la petición). |
| Lógica de la capa local (11 comprobaciones) | Todas en verde: capa vacía inocua, `hecho` del servidor gana, la nota del servidor gana cuando ya la expone, `/hoy` recalcula el total, persistencia aislada por cuenta, y `esEstadoPospuestaRechazado` discrimina el 400 real de otros errores (409 de sobrecarga, 500, otros 400). |
| Pipeline completo con datos del servidor | `/hoy`: 5 → 4 urgently, grupo "Para hoy" 1 → 0; bloque Pospuestas con su nota; barra *1 de 6 · 1 pospuesta · 4 abiertas (17%)*; ninguna pospuesta queda en `/hoy` y todas tienen nota visible. |
- Limpieza de código muerto: se eliminaron los componentes shadcn sin uso, hooks y utilidades sin
  referencias, scripts de parcheo de un solo uso y capturas; `package.json` quedó con las
  dependencias reales.
- `README.md` con instrucciones de instalación, variables y scripts.

## Pendientes y evidencia externa

- Backend: agregar `pospuesta` a `Subtarea.OPCIONES_ESTADO` y el campo `nota_pospuesta` al modelo.
  El frontend ya envía ambos y deja de usar la capa local en cuanto el servidor los devuelve.
- Recorrido visual en navegador (aún pendiente de captura): crear evento con plan → `/hoy` →
  **Posponer** con nota → la fila sale del grupo y el total baja al instante → la nota aparece en el
  bloque **Pospuestas** → **Reactivar** la devuelve al día → `/evento/:id` muestra la barra y el bloque
  → `/progreso` refleja el mismo porcentaje.
- Tablero Kanban (To Do/Doing/Done) y bitácora UX/HCI: se evidencian en el Documento Único.
- Recuperación de contraseña: la pantalla existe, pero avisa que el restablecimiento lo hace el
  administrador (no hay servicio de correo en el alcance).
- Despliegue del frontend: definir `VITE_API_URL` con la URL del backend en producción.
