# Frontend — EventOps (Organizador de Eventos)

Interfaz web en React 18 + Vite + TypeScript para organizar eventos y sus gestiones diarias.
Consume la API del backend Django (`Backend-Eventos-PI`) con autenticación por token.

## Requisitos

- Node.js 20 o superior (probado con Node 24)
- npm

## Puesta en marcha

```powershell
npm install
Copy-Item .env.example .env   # ajusta VITE_API_URL si hace falta
npm run dev
```

La aplicación queda en <http://localhost:5173>. El backend debe estar corriendo en
<http://localhost:8000>.

## Variables de entorno (`.env`)

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | URL base de la API. Por defecto `http://localhost:8000/api`. |

## Funcionalidades

- **Login y registro local** contra la API. El token se guarda en `localStorage` si se marca
  "Mantener sesión iniciada"; si no, en `sessionStorage`. Las rutas privadas
  (`/hoy`, `/eventos`, `/crear`, `/evento/:id`, `/progreso`, `/opciones`) redirigen al login sin
  sesión.
- **Vista Hoy**: consume `/api/hoy/` y muestra las gestiones agrupadas en **Vencidas**, **Para hoy**
  y **Próximas**, ya ordenadas por el backend. Debajo del encabezado resume las horas planificadas
  del día frente al límite diario. Incluye la regla de prioridad visible y los estados
  de carga, error con botón de reintento y vacío con acción sugerida.
- **Eventos**: listado con filtros por estado de agenda (activos y retrasados, pasados, cancelados,
  todos), creación con plan inicial opcional, detalle con gestión de tareas (agregar, editar, mover
  con motivo opcional, eliminar, marcar hecha) y página de progreso.
- **Opciones**: límite diario de trabajo del organizador, de 1 a 24 horas.
- Tema claro/oscuro y avisos de éxito/error.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Compila la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación de producción. |
| `npm run typecheck` | Verifica los tipos con TypeScript. |

## Estructura

```
src/
├── App.tsx                     páginas, componentes, controles compartidos y store de datos
├── Root.tsx                    contexto de autenticación
├── services/api.ts             axios, token, traducción de errores y manejo global del 401
├── lib/repositorioEventos.ts   mapeo a la API, repositorio de eventos y de /hoy
├── index.css                   estilos y variables de tema
└── pages/not-found.tsx
```

## Controles compartidos

Para que no haya dos versiones del mismo control, `App.tsx` define tres componentes que usan
todos los formularios:

| Componente | Qué es |
| --- | --- |
| `CampoHoras` | Campo de horas estimadas en `HH:MM`, con máscara y mensaje de error. |
| `CampoDuracion` | Desplegable de duraciones válidas del evento (de 30 min a 24 h). |
| `IndicadorHoras` | Mensaje «X h planificadas … de Y h», compartido por Hoy, el evento y Opciones. |

## Dependencias del backend

- `PATCH /api/subtareas/<id>/reprogramar/` acepta `motivo_movimiento`; el campo se añadió en la
  migración `0008_cancelado_y_motivo_movimiento.py`. Aplicala con `manage.py migrate` antes de usar
  el motivo del movimiento.
- `Evento.horas_planificadas` y `Evento.estado_agenda` los añade esa misma migración vía serializer.
- Sin esa migración, el detalle del evento seguirá mostrando 0 h de trabajo planificado y el
  motivo no se guardará.
