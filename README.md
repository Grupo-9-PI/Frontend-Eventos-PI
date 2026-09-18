# EventOps

Mesa de control para organizadores de eventos independientes: planificar, ejecutar y
reprogramar la logística de un evento (salón, invitaciones, catering, proveedores),
con una vista rápida de qué necesita atención hoy y del progreso general.

## Stack

- React 19 (SPA) + Vite
- React Router (rutas declaradas en `src/Aplicacion.jsx`)
- Sin backend por ahora: los datos viven en `localStorage` a través de
  `src/almacen/almacenEventos.js`. Sustituir ese archivo por llamadas a una API
  real es el único cambio necesario para conectar un backend después.


## Rutas

| Ruta          | Descripción                                                                     |
| ------------- | -------------------------------------------------------------------------------- |
| `/`           | Redirige a `/hoy`                                                                |
| `/hoy`        | Tareas de todos los eventos agrupadas por urgencia (retrasadas, hoy, próximas)   |
| `/eventos`    | Todos los eventos registrados, con acceso rápido al detalle de cada uno          |
| `/crear`      | Formulario para crear un nuevo evento (incluye hora límite)                      |
| `/evento/:id` | Detalle de un evento: agregar tarea, ver pendientes y completadas                |
| `/progreso`   | Vista general de todos los eventos; "Tareas completadas" despliega el listado    |
| `/login`      | Inicio de sesión simulado (guarda el nombre en `localStorage`)                   |

## Reglas de negocio

- Cada evento tiene una **fecha y hora límite** que actúa como su plazo máximo.
- Cada tarea tiene fecha límite, hora límite y **tiempo estimado** (se captura con
  un reloj normal: horas y minutos, sin redondear a números fijos).
- Al **reprogramar** una tarea (formulario con fecha y hora), la nueva fecha/hora
  no puede superar el plazo máximo del evento al que pertenece.
- En un mismo día no se pueden acumular más de **8 horas** de tareas pendientes
  (suma del tiempo estimado). Si reprogramar o crear una tarea supera ese límite,
  la acción se bloquea con un mensaje explicativo.
- Las tareas que vencen **hoy y siguen pendientes** se destacan con subrayado y
  una etiqueta de "Gestión inmediata".

## Desarrollo

```bash
npm install
npm run dev           # servidor de desarrollo
npm run build     # build de producción en dist/
npm run preview   # sirve el build de producción localmente
npm run lint       # linter (oxlint)
```

## Estructura

```
src/
  Aplicacion.jsx        # Rutas de la app
  principal.jsx         # Punto de entrada (equivalente a main.jsx)
  componentes/
    BarraLateral.jsx     # Navegación (Hoy, Eventos, Crear evento, Progreso)
    FilaTarea.jsx        # Fila de tarea reutilizable (subraya las urgentes)
    TalonEstado.jsx       # "Talón de boleto" de urgencia/estado
    AnilloProgreso.jsx    # Anillo de progreso SVG
    ModalReprogramar.jsx  # Formulario modal para reprogramar (valida plazo y 8h/día)
    Boton.jsx, EncabezadoPagina.jsx, DisenoApp.jsx
  paginas/               # Una carpeta por ruta: Hoy, Eventos, Crear, EventoDetalle,
                          # Progreso, IniciarSesion
  almacen/
    almacenEventos.js         # Datos + reglas (plazo, límite de 8h/día)
    contextoAutenticacion.jsx # Sesión mock
publico/                 # favicon e íconos servidos tal cual (equivalente a public/)
```
