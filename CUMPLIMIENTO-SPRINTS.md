# Cumplimiento de criterios por Sprint — Frontend

Este documento describe, para el repositorio **Frontend-Eventos-PI**, todo lo que ya está
implementado en relación con los criterios de los sprints 0, 1, 2 y 3. Las ramas de trabajo han sido
`feature/sprint-hoy-wiring` y `feature/sprint3-capacidad-conflictos`.

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

- La tarjeta **Límite de trabajo diario** en `/hoy` lee y guarda contra `GET/PUT /api/config/`
  (se eliminó el almacenamiento local del límite).
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
- El presupuesto local del evento (feature previa) se mantiene como **guardia secundario** con su
  propio aviso y opción de reducir horas.

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

## Estado del código

- `npm run typecheck` y `npm run build` pasan sin errores.
- Limpieza de código muerto: se eliminaron los componentes shadcn sin uso, hooks y utilidades sin
  referencias, scripts de parcheo de un solo uso y capturas; `package.json` quedó con las
  dependencias reales.
- `README.md` con instrucciones de instalación, variables y scripts.

## Pendientes y evidencia externa

- Tablero Kanban (To Do/Doing/Done) y bitácora UX/HCI: se evidencian en el Documento Único.
- Recuperación de contraseña: la pantalla existe, pero avisa que el restablecimiento lo hace el
  administrador (no hay servicio de correo en el alcance).
- Despliegue del frontend: definir `VITE_API_URL` con la URL del backend en producción.
