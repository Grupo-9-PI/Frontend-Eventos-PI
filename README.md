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
  (`/hoy`, `/eventos`, `/crear`, `/evento/:id`, `/progreso`) redirigen al login sin sesión.
- **Vista Hoy**: consume `/api/hoy/` y muestra las gestiones agrupadas en **Vencidas**, **Para hoy**
  y **Próximas**, ya ordenadas por el backend. Incluye la regla de prioridad visible y los estados
  de carga, error con botón de reintento y vacío con acción sugerida.
- **Eventos**: listado con filtros, creación con plan inicial opcional, detalle con gestión de
  tareas (agregar, editar, mover, eliminar) y página de progreso.
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
├── App.tsx                     páginas, componentes y store de datos
├── Root.tsx                    contexto de autenticación
├── services/api.ts             axios, token y manejo global del 401
├── lib/repositorioEventos.ts   mapeo a la API, repositorio de eventos y de /hoy
├── index.css                   estilos y variables de tema
└── pages/not-found.tsx
```
