import { Link } from "react-router-dom";

export default function NoEncontrado() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
      <h1 style={{ fontSize: 22, color: "var(--paper)", marginBottom: 10 }}>
        Página no encontrada
      </h1>
      <p style={{ marginBottom: 16 }}>Esta ruta no existe en EventOps.</p>
      <Link to="/hoy" style={{ color: "var(--amber)" }}>
        Volver a Hoy
      </Link>
    </div>
  );
}
