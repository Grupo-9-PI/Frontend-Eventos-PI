import { useMemo, useState } from "react";
import {
  almacenEventos,
  combinarFechaHora,
  formatoFechaHora,
  horasDesdeDuracion,
  formatoDuracion,
  LIMITE_HORAS_DIA,
} from "../almacen/almacenEventos";
import Boton from "./Boton";
import "./ModalReprogramar.css";

export default function ModalReprogramar({ tarea, onCerrar, onReprogramado }) {
  const evento = useMemo(() => almacenEventos.obtener(tarea.eventoId), [tarea.eventoId]);
  const [fecha, setFecha] = useState(tarea.fechaLimite);
  const [hora, setHora] = useState(tarea.horaLimite || "18:00");
  const [error, setError] = useState("");

  const horasOcupadas = almacenEventos.horasOcupadasEnFecha(fecha, tarea.id);
  const horasEstaTarea = horasDesdeDuracion(tarea.tiempoEstimado);
  const horasProyectadas = horasOcupadas + horasEstaTarea;
  const excedeCapacidad = horasProyectadas > LIMITE_HORAS_DIA;

  function confirmar(e) {
    e.preventDefault();
    if (!fecha || !hora) {
      setError("Elige una fecha y una hora.");
      return;
    }

    const nuevoPlazo = combinarFechaHora(fecha, hora);

    if (evento) {
      const plazoMaximoEvento = combinarFechaHora(evento.fecha, evento.horaLimite);
      if (nuevoPlazo > plazoMaximoEvento) {
        setError(
          `No puedes ir más allá del plazo máximo del evento: ${formatoFechaHora(
            evento.fecha,
            evento.horaLimite
          )}.`
        );
        return;
      }
    }

    if (excedeCapacidad) {
      setError(
        `Ese día ya acumula ${horasOcupadas}h de tareas pendientes. Con esta tarea (${formatoDuracion(
          tarea.tiempoEstimado
        )}) se superarían las ${LIMITE_HORAS_DIA}h laborales máximas por día.`
      );
      return;
    }

    almacenEventos.actualizarTarea(tarea.eventoId, tarea.id, {
      fechaLimite: fecha,
      horaLimite: hora,
    });
    onReprogramado?.();
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form
        className="modal-tarjeta"
        onSubmit={confirmar}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-titulo">Reprogramar tarea</h2>
        <p className="modal-subtitulo">{tarea.titulo}</p>
        {tarea.tiempoEstimado && (
          <p className="modal-nota">
            Tiempo estimado de esta tarea: {formatoDuracion(tarea.tiempoEstimado)}
          </p>
        )}

        {evento && (
          <p className="modal-nota">
            Plazo máximo del evento: {formatoFechaHora(evento.fecha, evento.horaLimite)}
          </p>
        )}

        <div className="campo-fila">
          <div className="campo">
            <label htmlFor="reprogramar-fecha">Nueva fecha</label>
            <input
              id="reprogramar-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="reprogramar-hora">Nueva hora</label>
            <input
              id="reprogramar-hora"
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </div>
        </div>

        <p className={"modal-capacidad" + (excedeCapacidad ? " modal-capacidad-excedida" : "")}>
          Ese día acumularía {horasProyectadas}h de {LIMITE_HORAS_DIA}h laborales disponibles.
        </p>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-acciones">
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit">Confirmar</Boton>
        </div>
      </form>
    </div>
  );
}
