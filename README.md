# EventOps

Mesa de control para planificar, ejecutar y reprogramar la logística de eventos independientes. Este frontend React cubre el alcance visual y funcional de Sprint 0–1 y conserva el modelo de navegación del proyecto original.

## Stack

- React 19 + TypeScript + Vite.
- Wouter para las rutas de la SPA.
- `localStorage` mediante un repositorio aislado; preparado para conectar una API después.
- Sin llamadas a endpoints de la aplicación, backend, autenticación ni cambios a la base de datos en este alcance.

## Rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Redirige a `/hoy`. |
| `/hoy` | Tareas de los eventos agrupadas en retrasadas, para hoy y próximas. Desde aquí se pueden completar o mover. |
| `/eventos` | Eventos activos o todos, con acceso a su detalle. |
| `/crear` | Creación de evento con un plan inicial editable. |
| `/evento/:id` | Detalle, tareas y edición o reprogramación del evento. |
| `/progreso` | Resumen de gestiones terminadas y pendientes. |

## Reglas de negocio

- La fecha y hora del evento definen el plazo máximo de sus gestiones.
- Las estimaciones son números decimales de horas; las horas límite y de inicio son campos independientes.
- Cada evento comienza con un límite de trabajo configurable de 6 horas al día.
- Se validan las fechas, las estimaciones, el total diario y los cruces de horario cuando las tareas tienen hora de inicio programada.
- Al reprogramar un evento se puede desplazar su plan; la interfaz informa cuántos plazos cambiarán antes de guardar.
- La primera apertura crea dos eventos de demostración con fechas relativas al día local. Si se eliminan todos, el estado vacío persiste y no se repuebla.

## Desarrollo

Ejecuta los comandos desde la raíz del workspace pnpm:

```bash
pnpm --filter @workspace/organizador-eventos run dev
pnpm --filter @workspace/organizador-eventos run typecheck
pnpm --filter @workspace/organizador-eventos run build
```

El servidor Vite de este scaffold recibe `PORT` y `BASE_PATH`:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/organizador-eventos run dev
```

## Estructura

```text
artifacts/organizador-eventos/
  index.html
  package.json
  public/                 # favicon y recursos estáticos
  src/
    App.tsx                # navegación y vistas del frontend
    components/            # componentes reutilizables
    lib/repositorioEventos.ts
    pages/                 # vistas auxiliares
  vite.config.ts
  tsconfig.json
  README.md
```

## Subir el proyecto a Git

Esta app es un paquete dentro del workspace pnpm. Para que una clonación conserve sus dependencias y configuración, versiona desde la raíz del workspace e incluye `pnpm-workspace.yaml`, `pnpm-lock.yaml`, el `package.json` raíz y `artifacts/organizador-eventos/`. El `.gitignore` raíz excluye `node_modules`, `dist`, `*.tsbuildinfo` y `.local`; no hace falta subir esos archivos generados o de trabajo local.

## Nota UX / HCI

1. **Hoy prioriza decisión sobre archivo.** Agrupa las tareas sin completar por urgencia y permite moverlas sin entrar al detalle del evento.
2. **La capacidad se explica con cifras.** Las estimaciones en horas y los mensajes de validación hacen visible la carga frente al límite diario.
3. **La reprogramación muestra su impacto antes de guardar.** La opción de desplazar el plan comunica cuántos plazos cambiarán.
4. **Urgencia accesible y contextual.** “Gestión inmediata” se revela con hover y foco de teclado; el estado no depende solo del color.

## Bitácora de Sprint 0–1

| Hallazgo | Cambio | Verificación |
| --- | --- | --- |
| El prototipo aceptaba duraciones como reloj y mezclaba esfuerzo con horario | Estimaciones numéricas en horas, con campos separados para hora límite e inicio opcional | Formularios con `1.5 h`; el build no usa campos de reloj para estimar duración |
| La capacidad estaba fija y permitía guardar planes sobrecargados | Límite diario configurable, validación de acumulación y sugerencia de próximo día viable | Crear o mover una tarea sobre el límite muestra cifras y no persiste el cambio |
| Reprogramar el evento podía dejar plazos desalineados | Modal con desplazamiento explícito del plan y resumen de los días afectados | El plan vuelve a validarse antes de guardar |
| La vista Hoy era principalmente de lectura | Acciones para completar y mover, grupos por plazo y estados vacíos con CTA | Los cambios actualizan el progreso y persisten en `localStorage` |