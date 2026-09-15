# EventOps

Mesa de control para organizadores de eventos independientes: planificar, ejecutar y
reprogramar la logística de un evento (salón, invitaciones, catering, proveedores),
con una vista rápida de qué necesita atención hoy y del progreso general.

## Stack

- React 19 (SPA) + Vite
- React Router (rutas declaradas en `src/Aplicacion.jsx`)
- Sin backend por ahora: los datos viven en `localStorage` a través de
  `src/store/almacenEventos.js`. Sustituir ese archivo por llamadas a una API real
  es el único cambio necesario para conectar un backend después.

Todo el código (archivos, componentes, funciones, props y clases CSS) está en español,
salvo lo que pertenece a la API de React/JSX en sí (`children`, `useState`, `useMemo`, etc.),
que no se puede traducir sin romper el framework.

## Rutas

| Ruta          | Descripción                                                                     |
| ------------- | -------------------------------------------------------------------------------- |
| `/`           | Redirige a `/hoy`                                                                |
| `/hoy`        | Tareas de todos los eventos agrupadas por urgencia (retrasadas, hoy, próximas)   |
| `/crear`      | Formulario para crear un nuevo evento                                            |
| `/evento/:id` | Detalle de un evento: datos, progreso y tareas agrupadas por categoría           |
| `/progreso`   | Vista general de todos los eventos con resumen y % de avance                     |
| `/login`      | Inicio de sesión simulado (guarda el nombre en `localStorage`)                   |

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción en dist/
npm run preview  # sirve el build de producción localmente
npm run lint      # oxlint
```

## Estructura

```
src/
  Aplicacion.jsx   # Rutas de la app
  principal.jsx    # Punto de entrada (equivalente a main.jsx)
  components/      # BarraLateral, FilaTarea, TalonEstado, AnilloProgreso, Boton, etc.
  pages/           # Una carpeta por ruta: Hoy, Crear, EventoDetalle, Progreso, IniciarSesion
  store/           # almacenEventos.js (datos) y contextoAutenticacion.jsx (sesión mock)
```
