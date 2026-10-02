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
  return localStorage.getItem(CLAVE_LOCAL) ?? sessionStorage.getItem(CLAVE_SESION);
}

export function borrarToken(): void {
  localStorage.removeItem(CLAVE_LOCAL);
  sessionStorage.removeItem(CLAVE_SESION);
}

/**
 * Instancia preconfigurada de Axios.
 * Úsala en todo el frontend para hacer peticiones HTTP al backend.
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/** Adjunta el token en cada petición autenticada. */
api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

/** Convierte los errores de DRF en un mensaje legible para mostrar al usuario. */
export function mensajeDeError(data: unknown): string {
  if (!data) return "No se pudo conectar con el servidor.";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const registro = data as Record<string, unknown>;
    if (typeof registro.detail === "string") return registro.detail;
    const partes: string[] = [];
    for (const [campo, valor] of Object.entries(registro)) {
      const texto = Array.isArray(valor) ? valor.join(" ") : String(valor);
      partes.push(campo === "non_field_errors" ? texto : `${campo}: ${texto}`);
    }
    if (partes.length) return partes.join(" ");
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
