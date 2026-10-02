import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import App from "./App";
import "./index.css";
import {
  api,
  borrarToken,
  guardarToken,
  mensajeDeError,
  obtenerToken,
} from "@/services/api";

export type Usuario = { id: number; nombre: string; email: string };
export type ResultadoAuth = { ok: true } | { ok: false; error: string };

type AuthContexto = {
  usuario: Usuario | null;
  loggedIn: boolean;
  cargandoSesion: boolean;
  login: (
    email: string,
    password: string,
    mantener: boolean,
  ) => Promise<ResultadoAuth>;
  registrar: (
    nombre: string,
    email: string,
    password: string,
  ) => Promise<ResultadoAuth>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContexto | null>(null);

export function useAuth(): AuthContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro del proveedor de autenticación.");
  }
  return contexto;
}

export default function Root({ children }: { children?: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) {
      setCargandoSesion(false);
      return;
    }
    api
      .get<Usuario>("/auth/me/")
      .then((respuesta) => setUsuario(respuesta.data))
      .catch(() => borrarToken())
      .finally(() => setCargandoSesion(false));
  }, []);

  const login = async (
    email: string,
    password: string,
    mantener: boolean,
  ): Promise<ResultadoAuth> => {
    try {
      const { data } = await api.post("/auth/login/", { email, password });
      guardarToken(data.token, mantener);
      setUsuario(data.usuario);
      return { ok: true };
    } catch (error: any) {
      borrarToken();
      setUsuario(null);
      if (!error.response) {
        return {
          ok: false,
          error:
            "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
        };
      }
      return { ok: false, error: mensajeDeError(error.response.data) };
    }
  };

  const registrar = async (
    nombre: string,
    email: string,
    password: string,
  ): Promise<ResultadoAuth> => {
    try {
      const { data } = await api.post("/auth/registro/", {
        nombre,
        email,
        password,
      });
      guardarToken(data.token, false);
      setUsuario(data.usuario);
      return { ok: true };
    } catch (error: any) {
      if (!error.response) {
        return {
          ok: false,
          error:
            "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
        };
      }
      return { ok: false, error: mensajeDeError(error.response.data) };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (obtenerToken()) await api.post("/auth/logout/");
    } catch {
      // El token ya no es válido en el servidor; igual se limpia la sesión local.
    }
    borrarToken();
    setUsuario(null);
  };

  if (cargandoSesion) return null;

  return (
    <AuthContext.Provider
      value={{
        usuario,
        loggedIn: usuario !== null,
        cargandoSesion,
        login,
        registrar,
        logout,
      }}
    >
      {children ?? <App />}
    </AuthContext.Provider>
  );
}
