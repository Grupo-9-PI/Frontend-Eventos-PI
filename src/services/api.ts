import axios from 'axios';

/**
 * URL base de la API apuntando al backend de Django.
 * Toma el valor de la variable de entorno, o por defecto a localhost si no está definida.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Instancia preconfigurada de Axios.
 * Úsala en todo el frontend para hacer peticiones HTTP al backend de manera sencilla.
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Interceptor para capturar errores, manejar tokens de autenticación (si hay en el futuro),
 * o formatear las respuestas.
 */
api.interceptors.response.use(
  (response) => {
    // Aquí puedes transformar la respuesta del backend si es necesario
    return response;
  },
  (error) => {
    // Aquí se puede manejar errores globales, como redireccionar al login si hay un 401
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
