import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { almacenEventos, sumarDias, hoyISO } from "../almacen/almacenEventos";
import EncabezadoPagina from "../componentes/EncabezadoPagina";
import Boton from "../componentes/Boton";
import "./Crear.css";

export default function Crear() {
  const navegar = useNavigate();
  const [formulario, setFormulario] = useState({
    nombre: "",
    fecha: sumarDias(hoyISO(), 14),
    horaLimite: "18:00",
    lugar: "",
    notas: "",
  });
  const [error, setError] = useState("");

  function actualizarCampo(campo, valor) {
    setFormulario((f) => ({ ...f, [campo]: valor }));
  }

  function enviar(e) {
    e.preventDefault();
    if (!formulario.nombre.trim()) {
      setError("Ponle un nombre al evento.");
      return;
    }
    if (!formulario.fecha) {
      setError("Elige una fecha.");
      return;
    }
    if (!formulario.horaLimite) {
      setError("Elige una hora límite para el evento.");
      return;
    }
    const nuevo = almacenEventos.crear(formulario);
    navegar(`/evento/${nuevo.id}`);
  }

  return (
    <div>
      <EncabezadoPagina
        titulo="Crear evento"
        descripcion="Registra los datos básicos, incluyendo la hora que marca el plazo máximo del evento. Podrás agregar las tareas de logística en el detalle del evento."
      />

      <form className="crear-formulario" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="nombre">Nombre del evento</label>
          <input
            id="nombre"
            type="text"
            placeholder="Ej. Lanzamiento Studio Norte"
            value={formulario.nombre}
            onChange={(e) => actualizarCampo("nombre", e.target.value)}
          />
        </div>

        <div className="campo-fila">
          <div className="campo">
            <label htmlFor="fecha">Fecha</label>
            <input
              id="fecha"
              type="date"
              value={formulario.fecha}
              onChange={(e) => actualizarCampo("fecha", e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="horaLimite">Hora límite</label>
            <input
              id="horaLimite"
              type="time"
              value={formulario.horaLimite}
              onChange={(e) => actualizarCampo("horaLimite", e.target.value)}
            />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="lugar">Lugar</label>
          <input
            id="lugar"
            type="text"
            placeholder="Ej. Galería Ámbar, Manizales"
            value={formulario.lugar}
            onChange={(e) => actualizarCampo("lugar", e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="notas">Notas (opcional)</label>
          <textarea
            id="notas"
            rows={3}
            placeholder="Cualquier detalle que quieras tener presente para este evento"
            value={formulario.notas}
            onChange={(e) => actualizarCampo("notas", e.target.value)}
          />
        </div>

        {error && <div className="crear-error">{error}</div>}

        <div className="crear-acciones">
          <Boton type="submit">Crear evento</Boton>
        </div>
      </form>
    </div>
  );
}
