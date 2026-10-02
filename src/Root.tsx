import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  FormEvent,
} from "react";
import App from "./App";
import "./index.css";

export const AuthContext = createContext<any>(null);

export const useAuth = () => useContext(AuthContext);

export default function Root() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("logged_in") === "true") {
      setLoggedIn(true);
    }
    setCargando(false);
  }, []);

  const login = (mantener: boolean) => {
    setLoggedIn(true);
    if (mantener) localStorage.setItem("logged_in", "true");
  };

  const logout = () => {
    setLoggedIn(false);
    localStorage.removeItem("logged_in");
  };

  if (cargando) return null;

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      <App />
    </AuthContext.Provider>
  );
}
