import "./EncabezadoPagina.css";

export default function EncabezadoPagina({ titulo, descripcion, accion }) {
  return (
    <header className="encabezado-pagina">
      <div>
        <h1 className="encabezado-pagina-titulo">{titulo}</h1>
        {descripcion && <p className="encabezado-pagina-descripcion">{descripcion}</p>}
      </div>
      {accion && <div className="encabezado-pagina-accion">{accion}</div>}
    </header>
  );
}
