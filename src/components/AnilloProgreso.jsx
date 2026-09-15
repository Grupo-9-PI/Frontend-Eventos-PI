export default function AnilloProgreso({ porcentaje = 0, tamano = 56 }) {
  const grosor = 5;
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const desplazamiento = circunferencia - (porcentaje / 100) * circunferencia;
  const color =
    porcentaje >= 100 ? "var(--sage)" : porcentaje >= 50 ? "var(--amber)" : "var(--rust)";

  return (
    <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`}>
      <circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={radio}
        fill="none"
        stroke="var(--line)"
        strokeWidth={grosor}
      />
      <circle
        cx={tamano / 2}
        cy={tamano / 2}
        r={radio}
        fill="none"
        stroke={color}
        strokeWidth={grosor}
        strokeDasharray={circunferencia}
        strokeDashoffset={desplazamiento}
        strokeLinecap="round"
        transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontSize={tamano * 0.26}
        fontWeight="600"
        fill="var(--paper)"
      >
        {porcentaje}%
      </text>
    </svg>
  );
}
