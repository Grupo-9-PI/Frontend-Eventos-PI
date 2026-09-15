import { useMemo } from "react";
import { Link } from "react-router-dom";
import { almacenEventos, diasHasta } from "../store/almacenEventos";
import EncabezadoPagina from "../components/EncabezadoPagina";
import AnilloProgreso from "../components/AnilloProgreso";
import TalonEstado from "../components/TalonEstado";
import "./Progreso.css";

export default function Progreso() {
  const eventos = useMemo(() => almacenEventos.listar(), []);

  const resumen = useMemo(() => {
    let total = 0;
    let hechas = 0;
    let vencidas = 0;
    eventos.forEach((ev) => {
      ev.tareas.forEach((t) => {
        total += 1;
        if (t.estado === "hecho") hechas += 1;
        else if (diasHasta(t.fechaLimite) < 0) vencidas += 1;
      });
    });
    return { total, hechas, vencidas, eventosActivos: eventos.length };
  }, [eventos]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Progreso"
        descripcion="Cómo va cada evento y dónde se está acumulando el trabajo."
      />

      <div className="resumen-cuadricula">
        <div className="resumen-tarjeta">
          <div className="resumen-valor">{resumen.eventosActivos}</div>
          <div className="resumen-etiqueta">Eventos activos</div>
        </div>
        <div className="resumen-tarjeta">
          <div className="resumen-valor">
            {resumen.hechas}/{resumen.total}
          </div>
          <div className="resumen-etiqueta">Tareas completadas</div>
        </div>
        <div className="resumen-tarjeta">
          <div className="resumen-valor resumen-valor-rust">{resumen.vencidas}</div>
          <div className="resumen-etiqueta">Tareas retrasadas</div>
        </div>
      </div>

      <div className="progreso-lista">
        {eventos.map((evento) => {
          const total = evento.tareas.length;
          const hechas = evento.tareas.filter((t) => t.estado === "hecho").length;
          const porcentaje = total === 0 ? 0 : Math.round((hechas / total) * 100);
          const dias = diasHasta(evento.fecha);
          const retrasadas = evento.tareas.filter(
            (t) => t.estado !== "hecho" && diasHasta(t.fechaLimite) < 0
          ).length;

          return (
            <Link key={evento.id} to={`/evento/${evento.id}`} className="progreso-tarjeta">
              <AnilloProgreso porcentaje={porcentaje} tamano={52} />
              <div className="progreso-tarjeta-info">
                <div className="progreso-tarjeta-nombre">{evento.nombre}</div>
                <div className="progreso-tarjeta-meta">
                  {evento.lugar || "Sin lugar definido"} · {hechas}/{total} tareas
                </div>
              </div>
              <div className="progreso-tarjeta-insignias">
                {retrasadas > 0 && (
                  <span className="progreso-insignia progreso-insignia-rust">
                    {retrasadas} retrasada{retrasadas > 1 ? "s" : ""}
                  </span>
                )}
                <TalonEstado dias={dias} estado={dias < 0 ? "hecho" : "pendiente"} />
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
