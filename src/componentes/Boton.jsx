import "./Boton.css";

export default function Boton({ variante = "primario", como: Componente = "button", children, ...props }) {
  return (
    <Componente className={`boton boton-${variante}`} {...props}>
      {children}
    </Componente>
  );
}
