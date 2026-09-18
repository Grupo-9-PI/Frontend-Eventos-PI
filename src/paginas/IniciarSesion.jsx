import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAutenticacion } from "../almacen/contextoAutenticacion";
import Boton from "../componentes/Boton";
import "./IniciarSesion.css";

export default function IniciarSesion() {
  const { iniciarSesion } = useAutenticacion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");

  function enviar(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    iniciarSesion(nombre.trim());
    const destino = ubicacion.state?.desde || "/hoy";
    navegar(destino, { replace: true });
  }

  return (
    <div className="inicio-sesion-pagina">
      <form className="inicio-sesion-tarjeta" onSubmit={enviar}>
        <div className="inicio-sesion-icono">EO</div>
        <h1 className="inicio-sesion-titulo">Entrar a EventOps</h1>
        <p className="inicio-sesion-descripcion">
          Sesión simulada localmente — no hay backend todavía, así que esto solo guarda tu
          nombre para personalizar la mesa de control.
        </p>

        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            type="text"
            placeholder="¿Cómo te llamas?"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </div>

        <div className="campo">
          <label htmlFor="correo">Correo (opcional)</label>
          <input
            id="correo"
            type="email"
            placeholder="tucorreo@ejemplo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>

        <Boton type="submit">Entrar</Boton>
      </form>
    </div>
  );
}
