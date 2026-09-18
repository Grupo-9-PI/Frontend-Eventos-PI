import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProveedorAutenticacion } from "./almacen/contextoAutenticacion";
import DisenoApp from "./componentes/DisenoApp";
import Hoy from "./paginas/Hoy";
import Eventos from "./paginas/Eventos";
import Crear from "./paginas/Crear";
import EventoDetalle from "./paginas/EventoDetalle";
import Progreso from "./paginas/Progreso";
import IniciarSesion from "./paginas/IniciarSesion";
import NoEncontrado from "./paginas/NoEncontrado";

export default function Aplicacion() {
  return (
    <ProveedorAutenticacion>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<IniciarSesion />} />

          <Route element={<DisenoApp />}>
            <Route path="/" element={<Navigate to="/hoy" replace />} />
            <Route path="/hoy" element={<Hoy />} />
            <Route path="/eventos" element={<Eventos />} />
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
