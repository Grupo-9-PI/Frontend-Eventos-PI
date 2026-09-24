# Organiza · Organizador de Eventos Independientes

Frontend Sprint 0–1 para convertir la logística de un evento independiente en un plan claro, medible y accionable.

## Setup

Desde la raíz del workspace:

```bash
pnpm --filter @workspace/organizador-eventos typecheck
pnpm --filter @workspace/organizador-eventos build
```

Para desarrollo, el scaffold requiere `PORT` y `BASE_PATH`:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/organizador-eventos dev
```

## Alcance actual y límites

- Los eventos y gestiones se guardan en `localStorage` con la clave `organizador-eventos.demo.v1`.
- La primera apertura crea dos eventos de demostración con fechas relativas al día local actual. Al eliminar todos los eventos, el estado vacío se conserva y no se repuebla.
- El repositorio/adaptador está aislado en `src/lib/repositorioEventos.ts`; **la futura frontera API está únicamente en ese adaptador**. No hay endpoints, backend, autenticación ni llamadas de red en este sprint.
- Se validan plazos frente al evento, estimaciones mayores que cero, límite diario configurable y choques cuando existe hora de inicio programada.
- La capacidad inicial es de 6 horas diarias y puede cambiarse por evento.

## Nota UX / HCI

1. **Hoy prioriza decisión sobre archivo.** Las tareas sin completar se agrupan en Retrasadas, Para hoy y Próximas; dentro de cada grupo se ordenan por plazo y luego por esfuerzo. Esto reduce la búsqueda visual de una persona que opera varios proveedores a la vez. La acción directa “Mover” evita obligar a entrar al detalle para resolver un retraso.
2. **La capacidad se explica con cifras, no solo con color.** Cada estimación usa horas decimales (no `input type=time`) y los errores indican “X h frente a Y h”, junto con un día viable o la opción de revisar la estimación. Esto hace la regla auditable y mantiene al organizador en control.
3. **La reprogramación muestra su impacto antes de guardar.** El checkbox “Desplazar plan junto con la fecha” comunica el número de plazos que cambiarán, evitando el desplazamiento silencioso de dependencias.
4. **Urgencia accesible y contextual.** “Gestión inmediata” se revela con hover y foco de teclado, y explica la acción concreta para el proveedor de streaming; el estado nunca depende únicamente del color.

## Bitácora de Sprint 0–1

| Hallazgo | Cambio | Verificación |
| --- | --- | --- |
| El prototipo aceptaba duraciones como reloj y mezclaba esfuerzo con horario | Estimaciones numéricas en horas, con campos independientes para hora límite e inicio opcional | El formulario muestra `1.5 h` y el typecheck/build no incluyen inputs de duración tipo time |
| La capacidad estaba fija y permitía guardar planes sobrecargados | Límite diario por evento, validación de acumulación y sugerencia de próximo día viable | Crear o mover una tarea sobre el límite muestra cifras y no persiste el cambio |
| Reprogramar evento podía dejar plazos desalineados | Modal de edición con desplazamiento explícito y resumen de días afectados | Cambiar fecha con el checkbox activo desplaza cada plazo y vuelve a validar capacidad |
| La vista Hoy solo ofrecía lectura parcial | Se añadieron acciones directas para completar y mover, grupos consistentes y estado vacío con CTA | Las mutaciones actualizan progreso y sobreviven recarga mediante localStorage |