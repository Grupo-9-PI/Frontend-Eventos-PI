import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { almacenEventos, diasHasta } from "../almacen/almacenEventos";
import EncabezadoPagina from "../componentes/EncabezadoPagina";
import FilaTarea from "../componentes/FilaTarea";
import ModalReprogramar from "../componentes/ModalReprogramar";
import "./Hoy.css";

export default function Hoy() {
  const [version, setVersion] = useState(0);
  const refrescar = () => setVersion((v) => v + 1);
  const [tareaAReprogramar, setTareaAReprogramar] = useState(null);

  const tareas = useMemo(() => almacenEventos.tareasGlobales(), [version]);

  const grupos = useMemo(() => {
    const vencidas = [];
    const hoyGrupo = [];
    const proximas = [];
    tareas
      .filter((t) => t.estado !== "hecho")
      .forEach((t) => {
        const dias = diasHasta(t.fechaLimite);
        if (dias < 0) vencidas.push(t);
        else if (dias === 0) hoyGrupo.push(t);
        else if (dias <= 5) proximas.push(t);
      });
    const porUrgencia = (a, b) => diasHasta(a.fechaLimite) - diasHasta(b.fechaLimite);
    return {
      vencidas: vencidas.sort(porUrgencia),
      hoy: hoyGrupo,
      proximas: proximas.sort(porUrgencia),
    };
  }, [tareas]);

  const totalPendientes = grupos.vencidas.length + grupos.hoy.length + grupos.proximas.length;

  function marcarHecho(tarea) {
    const nuevoEstado = tarea.estado === "hecho" ? "pendiente" : "hecho";
    almacenEventos.actualizarTarea(tarea.eventoId, tarea.id, { estado: nuevoEstado });
    refrescar();
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Hoy"
        descripcion={
          totalPendientes === 0
            ? "No hay gestiones pendientes. Buen momento para adelantar próximas tareas."
            : `${totalPendientes} gestiones necesitan tu atención, ordenadas por urgencia.`
        }
      />

      {grupos.vencidas.length > 0 && (
        <section className="hoy-seccion">
          <div className="hoy-seccion-titulo hoy-seccion-titulo-oxido">
            Retrasadas
            <span className="hoy-seccion-contador">{grupos.vencidas.length}</span>
          </div>
          <div className="hoy-lista">
            {grupos.vencidas.map((t) => (
              <FilaTarea
                key={t.id}
                tarea={t}
                mostrarEvento
                alMarcarHecho={marcarHecho}
                alReprogramar={setTareaAReprogramar}
              />
            ))}
          </div>
        </section>
      )}

      <section className="hoy-seccion">
        <div className="hoy-seccion-titulo hoy-seccion-titulo-ambar">
          Vence hoy
          <span className="hoy-seccion-contador">{grupos.hoy.length}</span>
        </div>
        {grupos.hoy.length === 0 ? (
          <div className="hoy-vacio">Nada vence hoy.</div>
        ) : (
          <div className="hoy-lista">
            {grupos.hoy.map((t) => (
              <FilaTarea
                key={t.id}
                tarea={t}
                mostrarEvento
                alMarcarHecho={marcarHecho}
                alReprogramar={setTareaAReprogramar}
              />
            ))}
          </div>
        )}
      </section>

      {grupos.proximas.length > 0 && (
        <section className="hoy-seccion">
          <div className="hoy-seccion-titulo">
            Próximos 5 días
            <span className="hoy-seccion-contador">{grupos.proximas.length}</span>
          </div>
          <div className="hoy-lista">
            {grupos.proximas.map((t) => (
              <FilaTarea
                key={t.id}
                tarea={t}
                mostrarEvento
                alMarcarHecho={marcarHecho}
                alReprogramar={setTareaAReprogramar}
              />
            ))}
          </div>
        </section>
      )}

      {tareas.length === 0 && (
        <div className="hoy-vacio-total">
          Aún no tienes eventos.{" "}
          <Link to="/crear" className="hoy-vacio-enlace">
            Crea el primero
          </Link>
          .
        </div>
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
