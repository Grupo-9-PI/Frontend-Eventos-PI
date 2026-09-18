import { Link } from "react-router-dom";
import { diasHasta, esUrgenteHoy, formatoDuracion } from "../almacen/almacenEventos";
import TalonEstado from "./TalonEstado";
import "./FilaTarea.css";

const NOMBRES_CATEGORIA = {
  salon: "Salón",
  invitaciones: "Invitaciones",
  catering: "Catering",
  proveedores: "Proveedores",
  otro: "Otro",
};

export default function FilaTarea({
  tarea,
  mostrarEvento = false,
  alMarcarHecho,
  alReprogramar,
}) {
  const dias = diasHasta(tarea.fechaLimite);
  const hecha = tarea.estado === "hecho";
  const urgente = esUrgenteHoy(tarea);

  return (
    <div
      className={
        "fila-tarea" +
        (hecha ? " fila-tarea-hecha" : "") +
        (urgente ? " fila-tarea-urgente" : "")
      }
    >
      <button
        className="fila-tarea-check"
        onClick={() => alMarcarHecho?.(tarea)}
        aria-label={hecha ? "Marcar como pendiente" : "Marcar como hecho"}
        title={hecha ? "Marcar como pendiente" : "Marcar como hecho"}
      >
        {hecha ? "✓" : ""}
      </button>

      <div className="fila-tarea-principal">
        <div className="fila-tarea-titulo">
          {tarea.titulo}
          {urgente && <span className="fila-tarea-etiqueta-urgente">Gestión inmediata</span>}
        </div>
        <div className="fila-tarea-meta">
          <span>{NOMBRES_CATEGORIA[tarea.categoria] || tarea.categoria}</span>
          {tarea.tiempoEstimado && (
            <>
              <span className="fila-tarea-meta-punto">·</span>
              <span>{formatoDuracion(tarea.tiempoEstimado)} estimadas</span>
            </>
          )}
          {mostrarEvento && tarea.eventoId && (
            <>
              <span className="fila-tarea-meta-punto">·</span>
              <Link to={`/evento/${tarea.eventoId}`} className="fila-tarea-meta-enlace">
                {tarea.eventoNombre}
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="fila-tarea-acciones">
        {alReprogramar && !hecha && (
          <button className="fila-tarea-reprogramar" onClick={() => alReprogramar(tarea)}>
            Reprogramar
          </button>
        )}
        <TalonEstado dias={dias} estado={tarea.estado} hora={tarea.horaLimite} />
      </div>
    </div>
  );
}
