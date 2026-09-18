import { createContext, useContext, useState, useCallback } from "react";

const CLAVE_SESION = "eventops.sesion.v1";
const ContextoAutenticacion = createContext(null);

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const crudo = localStorage.getItem(CLAVE_SESION);
      return crudo ? JSON.parse(crudo) : null;
    } catch {
      return null;
    }
  });

  const iniciarSesion = useCallback((nombre) => {
    const datos = { nombre };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
    setUsuario(datos);
  }, []);

  const cerrarSesion = useCallback(() => {
    localStorage.removeItem(CLAVE_SESION);
    setUsuario(null);
  }, []);

  return (
    <ContextoAutenticacion.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>
      {children}
    </ContextoAutenticacion.Provider>
  );
}

export function useAutenticacion() {
  const contexto = useContext(ContextoAutenticacion);
  if (!contexto) throw new Error("useAutenticacion debe usarse dentro de ProveedorAutenticacion");
  return contexto;
}
