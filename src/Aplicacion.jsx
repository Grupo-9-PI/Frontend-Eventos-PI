import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProveedorAutenticacion } from "./store/contextoAutenticacion";
import DisenoApp from "./components/DisenoApp";
import Hoy from "./pages/Hoy";
import Crear from "./pages/Crear";
import EventoDetalle from "./pages/EventoDetalle";
import Progreso from "./pages/Progreso";
import IniciarSesion from "./pages/IniciarSesion";
import NoEncontrado from "./pages/NoEncontrado";

export default function Aplicacion() {
  return (
    <ProveedorAutenticacion>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<IniciarSesion />} />

          <Route element={<DisenoApp />}>
            <Route path="/" element={<Navigate to="/hoy" replace />} />
            <Route path="/hoy" element={<Hoy />} />
            <Route path="/crear" element={<Crear />} />
            <Route path="/evento/:id" element={<EventoDetalle />} />
            <Route path="/progreso" element={<Progreso />} />
          </Route>

          <Route path="*" element={<NoEncontrado />} />
        </Routes>
      </BrowserRouter>
    </ProveedorAutenticacion>
  );
}
