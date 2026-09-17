import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { almacenEventos, diasHasta } from "../store/almacenEventos";
import FilaTarea from "../components/FilaTarea";
import Boton from "../components/Boton";
import AnilloProgreso from "../components/AnilloProgreso";
import "./EventoDetalle.css";

const CATEGORIAS = almacenEventos.CATEGORIAS;

function formatoFecha(fechaISO) {
  const d = new Date(fechaISO + "T00:00:00");
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

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
  });
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  if (!evento) {
    return (
      <div className="evento-no-encontrado">
        <p>No encontramos este evento. Puede que haya sido eliminado.</p>
        <Link to="/progreso" className="hoy-vacio-enlace">
          Ver todos los eventos
        </Link>
      </div>
    );
  }

  const diasParaEvento = diasHasta(evento.fecha);
  const totalTareas = evento.tareas.length;
  const hechas = evento.tareas.filter((t) => t.estado === "hecho").length;
  const porcentaje = totalTareas === 0 ? 0 : Math.round((hechas / totalTareas) * 100);

  const porCategoria = CATEGORIAS.map((cat) => ({
    ...cat,
    tareas: evento.tareas.filter((t) => t.categoria === cat.id),
  })).filter((cat) => cat.tareas.length > 0);

  function marcarHecho(tarea) {
    const nuevoEstado = tarea.estado === "hecho" ? "pendiente" : "hecho";
    almacenEventos.actualizarTarea(evento.id, tarea.id, { estado: nuevoEstado });
    refrescar();
  }

  function reprogramar(tarea) {
    const nueva = window.prompt("Nueva fecha límite (AAAA-MM-DD):", tarea.fechaLimite);
    if (!nueva) return;
    almacenEventos.actualizarTarea(evento.id, tarea.id, { fechaLimite: nueva });
    refrescar();
  }

  function agregarTarea(e) {
    e.preventDefault();
    if (!nuevaTarea.titulo.trim()) return;
    almacenEventos.agregarTarea(evento.id, nuevaTarea);
    setNuevaTarea({ ...nuevaTarea, titulo: "" });
    setMostrarFormulario(false);
    refrescar();
  }

  function eliminarEvento() {
    if (!window.confirm(`¿Eliminar "${evento.nombre}" y todas sus tareas?`)) return;
    almacenEventos.eliminar(evento.id);
    navegar("/progreso");
  }

  return (
    <div>
      <div className="evento-encabezado">
        <div>
          <div className="evento-antetitulo">
            {diasParaEvento >= 0 ? `Faltan ${diasParaEvento} días` : `Ocurrió hace ${Math.abs(diasParaEvento)} días`}
          </div>
          <h1 className="evento-titulo">{evento.nombre}</h1>
          <div className="evento-subinfo">
            {formatoFecha(evento.fecha)}
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
        <Boton variante="secundario" onClick={() => setMostrarFormulario((v) => !v)}>
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
          <Boton type="submit">Agregar</Boton>
        </form>
      )}

      {totalTareas === 0 ? (
        <div className="evento-vacio">
          Todavía no hay tareas para este evento. Agrega la primera gestión (salón,
          invitaciones, catering o proveedores) para empezar a trabajar.
        </div>
      ) : (
        porCategoria.map((cat) => (
          <section key={cat.id} className="evento-categoria">
            <div className="evento-categoria-titulo">
              {cat.nombre}
              <span className="hoy-seccion-contador">
                {cat.tareas.filter((t) => t.estado === "hecho").length}/{cat.tareas.length}
              </span>
            </div>
            <div className="hoy-lista">
              {cat.tareas.map((t) => (
                <FilaTarea
                  key={t.id}
                  tarea={t}
                  alMarcarHecho={marcarHecho}
                  alReprogramar={reprogramar}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
