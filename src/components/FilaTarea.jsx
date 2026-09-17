import { Link } from "react-router-dom";
import { diasHasta } from "../store/almacenEventos";
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

  return (
    <div className={"fila-tarea" + (hecha ? " fila-tarea-hecha" : "")}>
      <button
        className="fila-tarea-check"
        onClick={() => alMarcarHecho?.(tarea)}
        aria-label={hecha ? "Marcar como pendiente" : "Marcar como hecho"}
        title={hecha ? "Marcar como pendiente" : "Marcar como hecho"}
      >
        {hecha ? "✓" : ""}
      </button>

      <div className="fila-tarea-principal">
        <div className="fila-tarea-titulo">{tarea.titulo}</div>
        <div className="fila-tarea-meta">
          <span>{NOMBRES_CATEGORIA[tarea.categoria] || tarea.categoria}</span>
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
        <TalonEstado dias={dias} estado={tarea.estado} />
      </div>
    </div>
  );
}
