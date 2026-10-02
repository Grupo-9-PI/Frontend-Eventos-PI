import axios from "axios";

/**
 * URL base de la API apuntando al backend de Django.
 * Toma el valor de la variable de entorno, o por defecto localhost.
 */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const CLAVE_LOCAL = "eventops_token";
const CLAVE_SESION = "eventops_token_sesion";

/** Guarda el token: en localStorage si el usuario pidió mantener la sesión; si no, en sessionStorage. */
export function guardarToken(token: string, mantener: boolean): void {
  borrarToken();
  if (mantener) localStorage.setItem(CLAVE_LOCAL, token);
  else sessionStorage.setItem(CLAVE_SESION, token);
}

export function obtenerToken(): string | null {
  return (
    localStorage.getItem(CLAVE_LOCAL) ?? sessionStorage.getItem(CLAVE_SESION)
  );
}

export function borrarToken(): void {
  localStorage.removeItem(CLAVE_LOCAL);
  sessionStorage.removeItem(CLAVE_SESION);
}

/** Instancia de Axios preconfigurada para añadir el JWT en todas las peticiones */
const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = obtenerToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/** Helper para extraer mensajes de error legibles desde la respuesta de Django REST Framework */
export function mensajeDeError(data: unknown): string {
  if (!data) return "No se pudo conectar con el servidor.";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const registro = data as Record<string, unknown>;

    // Si viene un 'detail' genérico (Ej: Token vencido o credenciales)
    if (typeof registro.detail === "string") {
      if (registro.detail.toLowerCase().includes("credencial")) {
        return "Usuario o contraseña incorrectos.";
      }
      return registro.detail;
    }

    // Si vienen errores de validación de formulario por campo
    const partes: string[] = [];
    const mapaCampos: Record<string, string> = {
      email: "Correo electrónico",
      password: "Contraseña",
      nombre: "Nombre",
      non_field_errors: "Error",
    };

    for (const [campo, valor] of Object.entries(registro)) {
      const texto = Array.isArray(valor) ? valor.join(" ") : String(valor);
      const nombreCampo = mapaCampos[campo] || campo;

      if (campo === "non_field_errors") {
        partes.push(texto);
      } else {
        partes.push(`• ${nombreCampo}: ${texto}`);
      }
    }
    if (partes.length) return partes.join("\n");
  }
  return "Ocurrió un error inesperado.";
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? "";
    const esRutaDeAuth =
      url.includes("/auth/login/") || url.includes("/auth/registro/");
    if (error.response?.status === 401 && !esRutaDeAuth) {
      // Token vencido o inválido: se limpia la sesión y se vuelve al login.
      borrarToken();
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      if (!window.location.pathname.startsWith(`${base}/login`)) {
        window.location.href = `${base}/login`;
      }
    } else {
      console.error("API Error:", error.response?.data || error.message);
    }
    return Promise.reject(error);
  },
);

export default api;
