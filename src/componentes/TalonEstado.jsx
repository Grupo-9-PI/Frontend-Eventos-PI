import "./TalonEstado.css";

// Traduce días restantes a una etiqueta y un color de urgencia.
export function calcularUrgencia(dias, estado, hora) {
  if (estado === "hecho") return { tono: "salvia", texto: "Hecho" };
  if (dias < 0) return { tono: "oxido", texto: `${Math.abs(dias)}d de retraso` };
  if (dias === 0) return { tono: "ambar", texto: hora ? `Vence hoy · ${hora}` : "Vence hoy" };
  if (dias <= 2) return { tono: "ambar", texto: `En ${dias}d` };
  return { tono: "apagado", texto: `En ${dias}d` };
}

// El talón de boleto: una franja de color a la izquierda + el dato clave.
// Es el elemento visual que se repite en /hoy, /eventos, /evento/:id y /progreso.
export default function TalonEstado({ dias, estado, hora }) {
  const { tono, texto } = calcularUrgencia(dias, estado, hora);
  return (
    <span className={`talon talon-${tono}`}>
      <span className="talon-barra" />
      <span className="talon-texto tabular">{texto}</span>
    </span>
  );
}
