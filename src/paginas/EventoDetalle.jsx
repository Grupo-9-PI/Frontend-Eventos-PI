import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { almacenEventos, diasHasta, formatoFechaHora, combinarFechaHora, horasDesdeDuracion, LIMITE_HORAS_DIA } from "../almacen/almacenEventos";
import FilaTarea from "../componentes/FilaTarea";
import Boton from "../componentes/Boton";
import AnilloProgreso from "../componentes/AnilloProgreso";
import ModalReprogramar from "../componentes/ModalReprogramar";
import "./EventoDetalle.css";

const CATEGORIAS = almacenEventos.CATEGORIAS;

export default function EventoDetalle() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [version, setVersion] = useState(0);
  const refrescar = () => setVersion((v) => v + 1);

  const evento = useMemo(() => almacenEventos.obtener(id), [id, version]);

  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: "",
    categoria: "salon",
    prioridad: "media",
    fechaLimite: evento?.fecha || "",
    horaLimite: evento?.horaLimite || "18:00",
    tiempoEstimado: "01:00",
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [tareaAReprogramar, setTareaAReprogramar] = useState(null);

  if (!evento) {
    return (
      <div className="evento-no-encontrado">
        <p>No encontramos este evento. Puede que haya sido eliminado.</p>
        <Link to="/eventos" className="hoy-vacio-enlace">
          Ver todos los eventos
        </Link>
      </div>
    );
  }

  const diasParaEvento = diasHasta(evento.fecha);
  const totalTareas = evento.tareas.length;
  const hechas = evento.tareas.filter((t) => t.estado === "hecho").length;
  const porcentaje = totalTareas === 0 ? 0 : Math.round((hechas / totalTareas) * 100);

  const tareasPendientes = evento.tareas.filter((t) => t.estado !== "hecho");
  const tareasCompletadas = evento.tareas.filter((t) => t.estado === "hecho");

  const categoriasPendientes = CATEGORIAS.map((cat) => ({
    ...cat,
    tareas: tareasPendientes.filter((t) => t.categoria === cat.id),
  })).filter((cat) => cat.tareas.length > 0);

  function marcarHecho(tarea) {
    const nuevoEstado = tarea.estado === "hecho" ? "pendiente" : "hecho";
    almacenEventos.actualizarTarea(evento.id, tarea.id, { estado: nuevoEstado });
    refrescar();
  }

  function abrirReprogramar(tarea) {
    setTareaAReprogramar({ ...tarea, eventoId: evento.id });
  }

  function agregarTarea(e) {
    e.preventDefault();
    setErrorFormulario("");
    if (!nuevaTarea.titulo.trim()) {
      setErrorFormulario("Ponle un título a la tarea.");
      return;
    }

    const plazoTarea = combinarFechaHora(nuevaTarea.fechaLimite, nuevaTarea.horaLimite);
    const plazoMaximoEvento = combinarFechaHora(evento.fecha, evento.horaLimite);
    if (plazoTarea > plazoMaximoEvento) {
      setErrorFormulario(
        `La tarea no puede vencer después del plazo máximo del evento: ${formatoFechaHora(
          evento.fecha,
          evento.horaLimite
        )}.`
      );
      return;
    }

    const horasOcupadas = almacenEventos.horasOcupadasEnFecha(nuevaTarea.fechaLimite);
    const horasEstaTarea = horasDesdeDuracion(nuevaTarea.tiempoEstimado);
    if (horasOcupadas + horasEstaTarea > LIMITE_HORAS_DIA) {
      setErrorFormulario(
        `Ese día ya acumula ${horasOcupadas}h de tareas pendientes. Con esta tarea (${horasEstaTarea}h) se superarían las ${LIMITE_HORAS_DIA}h laborales máximas por día.`
      );
      return;
    }

    almacenEventos.agregarTarea(evento.id, nuevaTarea);
    setNuevaTarea({ ...nuevaTarea, titulo: "", tiempoEstimado: "01:00" });
    setMostrarFormulario(false);
    refrescar();
  }

  function eliminarEvento() {
    if (!window.confirm(`¿Eliminar "${evento.nombre}" y todas sus tareas?`)) return;
    almacenEventos.eliminar(evento.id);
    navegar("/eventos");
  }

  return (
    <div>
      <div className="evento-encabezado">
        <div>
          <div className="evento-antetitulo">
            {diasParaEvento >= 0
              ? `Faltan ${diasParaEvento} días`
              : `Ocurrió hace ${Math.abs(diasParaEvento)} días`}
          </div>
          <h1 className="evento-titulo">{evento.nombre}</h1>
          <div className="evento-subinfo">
            {formatoFechaHora(evento.fecha, evento.horaLimite)}
            {evento.lugar && ` · ${evento.lugar}`}
          </div>
          {evento.notas && <p className="evento-notas">{evento.notas}</p>}
        </div>
        <div className="evento-encabezado-anillo">
          <AnilloProgreso porcentaje={porcentaje} tamano={64} />
          <span className="evento-anillo-etiqueta">
            {hechas}/{totalTareas} tareas
          </span>
        </div>
      </div>

      <div className="evento-barra-herramientas">
        <Boton
          variante="secundario"
          onClick={() => {
            setErrorFormulario("");
            setMostrarFormulario((v) => !v);
          }}
        >
          {mostrarFormulario ? "Cancelar" : "+ Agregar tarea"}
        </Boton>
        <Boton variante="peligro" onClick={eliminarEvento}>
          Eliminar evento
        </Boton>
      </div>

      {mostrarFormulario && (
        <form className="tarea-formulario" onSubmit={agregarTarea}>
          <input
            type="text"
            placeholder="¿Qué hay que hacer?"
            value={nuevaTarea.titulo}
            onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
            autoFocus
          />
          <select
            value={nuevaTarea.categoria}
            onChange={(e) => setNuevaTarea({ ...nuevaTarea, categoria: e.target.value })}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <select
            value={nuevaTarea.prioridad}
            onChange={(e) => setNuevaTarea({ ...nuevaTarea, prioridad: e.target.value })}
          >
            <option value="alta">Prioridad alta</option>
            <option value="media">Prioridad media</option>
            <option value="baja">Prioridad baja</option>
          </select>
          <input
            type="date"
            value={nuevaTarea.fechaLimite}
            onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaLimite: e.target.value })}
          />
          <input
            type="time"
            value={nuevaTarea.horaLimite}
            onChange={(e) => setNuevaTarea({ ...nuevaTarea, horaLimite: e.target.value })}
          />
          <div className="tarea-formulario-campo-reloj">
            <label htmlFor="tarea-tiempo-estimado">Tiempo estimado</label>
            <input
              id="tarea-tiempo-estimado"
              type="time"
              value={nuevaTarea.tiempoEstimado}
              onChange={(e) =>
                setNuevaTarea({ ...nuevaTarea, tiempoEstimado: e.target.value })
              }
            />
          </div>
          <Boton type="submit">Agregar</Boton>
          {errorFormulario && <div className="modal-error tarea-formulario-error">{errorFormulario}</div>}
        </form>
      )}

      <section className="evento-seccion">
        <div className="evento-seccion-titulo">
          Pendientes
          <span className="hoy-seccion-contador">{tareasPendientes.length}</span>
        </div>
        {tareasPendientes.length === 0 ? (
          <div className="evento-vacio">
            No hay tareas pendientes. Agrega la primera gestión (salón, invitaciones,
            catering o proveedores) para empezar a trabajar.
          </div>
        ) : (
          categoriasPendientes.map((cat) => (
            <div key={cat.id} className="evento-categoria">
              <div className="evento-categoria-titulo">
                {cat.nombre}
                <span className="hoy-seccion-contador">{cat.tareas.length}</span>
              </div>
              <div className="hoy-lista">
                {cat.tareas.map((t) => (
                  <FilaTarea
                    key={t.id}
                    tarea={t}
                    alMarcarHecho={marcarHecho}
                    alReprogramar={abrirReprogramar}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {tareasCompletadas.length > 0 && (
        <section className="evento-seccion">
          <div className="evento-seccion-titulo">
            Completadas
            <span className="hoy-seccion-contador">{tareasCompletadas.length}</span>
          </div>
          <div className="hoy-lista">
            {tareasCompletadas.map((t) => (
              <FilaTarea key={t.id} tarea={t} alMarcarHecho={marcarHecho} />
            ))}
          </div>
        </section>
      )}

      {tareaAReprogramar && (
        <ModalReprogramar
          tarea={tareaAReprogramar}
          onCerrar={() => setTareaAReprogramar(null)}
          onReprogramado={() => {
            setTareaAReprogramar(null);
            refrescar();
          }}
        />
      )}
    </div>
  );
}
