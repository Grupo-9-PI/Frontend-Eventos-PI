import { NavLink } from "react-router-dom";
import { useAutenticacion } from "../store/contextoAutenticacion";
import "./BarraLateral.css";

const ENLACES = [
  { ruta: "/hoy", etiqueta: "Hoy", descripcion: "Qué exige atención" },
  { ruta: "/crear", etiqueta: "Crear evento", descripcion: "Nuevo evento" },
  { ruta: "/progreso", etiqueta: "Progreso", descripcion: "Vista general" },
];

export default function BarraLateral() {
  const { usuario, cerrarSesion } = useAutenticacion();

  return (
    <aside className="barra-lateral">
      <div className="barra-lateral-marca">
        <span className="barra-lateral-marca-icono">EO</span>
        <div>
          <div className="barra-lateral-marca-nombre">EventOps</div>
          <div className="barra-lateral-marca-etiqueta">mesa de control</div>
        </div>
      </div>

      <nav className="barra-lateral-nav">
        {ENLACES.map((enlace) => (
          <NavLink
            key={enlace.ruta}
            to={enlace.ruta}
            className={({ isActive }) =>
              "barra-lateral-enlace" + (isActive ? " barra-lateral-enlace-activo" : "")
            }
          >
            <span className="barra-lateral-enlace-etiqueta">{enlace.etiqueta}</span>
            <span className="barra-lateral-enlace-descripcion">{enlace.descripcion}</span>
          </NavLink>
        ))}
      </nav>

      <div className="barra-lateral-pie">
        {usuario ? (
          <>
            <div className="barra-lateral-usuario">{usuario.nombre}</div>
            <button className="barra-lateral-cerrar-sesion" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <NavLink to="/login" className="barra-lateral-cerrar-sesion">
            Iniciar sesión
          </NavLink>
        )}
      </div>
    </aside>
  );
}
