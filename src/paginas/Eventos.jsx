import { useMemo } from "react";
import { Link } from "react-router-dom";
import { almacenEventos, diasHasta, formatoFechaHora } from "../almacen/almacenEventos";
import EncabezadoPagina from "../componentes/EncabezadoPagina";
import AnilloProgreso from "../componentes/AnilloProgreso";
import "./Eventos.css";

export default function Eventos() {
  const eventos = useMemo(() => almacenEventos.listar(), []);

  return (
    <div>
      <EncabezadoPagina
        titulo="Eventos"
        descripcion="Todos los eventos registrados. Selecciona uno para ver o agregar sus tareas."
      />

      <div className="eventos-cuadricula">
        {eventos.map((evento) => {
          const total = evento.tareas.length;
          const hechas = evento.tareas.filter((t) => t.estado === "hecho").length;
          const pendientes = total - hechas;
          const porcentaje = total === 0 ? 0 : Math.round((hechas / total) * 100);
          const dias = diasHasta(evento.fecha);

          return (
            <Link key={evento.id} to={`/evento/${evento.id}`} className="evento-tarjeta">
              <div className="evento-tarjeta-encabezado">
                <AnilloProgreso porcentaje={porcentaje} tamano={44} />
                <span className="evento-tarjeta-dias">
                  {dias >= 0 ? `Faltan ${dias}d` : `Hace ${Math.abs(dias)}d`}
                </span>
              </div>
              <div className="evento-tarjeta-nombre">{evento.nombre}</div>
              <div className="evento-tarjeta-fecha">
                {formatoFechaHora(evento.fecha, evento.horaLimite)}
              </div>
              <div className="evento-tarjeta-lugar">
                {evento.lugar || "Sin lugar definido"}
              </div>
              <div className="evento-tarjeta-pie">
                <span className="evento-tarjeta-contador evento-tarjeta-contador-pendiente">
                  {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
                </span>
                <span className="evento-tarjeta-contador evento-tarjeta-contador-hecho">
                  {hechas} completada{hechas !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {eventos.length === 0 && (
        <div className="hoy-vacio-total">
          Aún no tienes eventos.{" "}
          <Link to="/crear" className="hoy-vacio-enlace">
            Crea el primero
          </Link>
          .
        </div>
      )}
    </div>
  );
}
