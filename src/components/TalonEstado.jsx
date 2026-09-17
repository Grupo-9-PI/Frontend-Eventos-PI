import "./TalonEstado.css";

// Traduce días restantes a una etiqueta y un color de urgencia.
export function calcularUrgencia(dias, estado) {
  if (estado === "hecho") return { tono: "sage", texto: "Hecho" };
  if (dias < 0) return { tono: "rust", texto: `${Math.abs(dias)}d de retraso` };
  if (dias === 0) return { tono: "amber", texto: "Vence hoy" };
  if (dias <= 2) return { tono: "amber", texto: `En ${dias}d` };
  return { tono: "muted", texto: `En ${dias}d` };
}

// El talón de boleto: una franja de color a la izquierda + el dato clave.
// Es el elemento visual que se repite en /hoy, /evento/:id y /progreso.
export default function TalonEstado({ dias, estado }) {
  const { tono, texto } = calcularUrgencia(dias, estado);
  return (
    <span className={`talon talon-${tono}`}>
      <span className="talon-barra" />
      <span className="talon-texto tabular">{texto}</span>
    </span>
  );
}
