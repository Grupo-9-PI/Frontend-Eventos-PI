import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f: 
    api_ts = f.read()

new_mensaje = """export function mensajeDeError(data: unknown): string {
  if (!data) return "No se pudo conectar con el servidor.";
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const registro = data as Record<string, unknown>;
    
    // Si viene un 'detail' genérico (Ej: Token vencido o credenciales)
    if (typeof registro.detail === "string") {
      if (registro.detail.toLowerCase().includes("credencial")) {
        return "Usuario o contraseña incorrectos.";
      }
      return registro.detail;
    }
    
    // Si vienen errores de validación de formulario por campo
    const partes: string[] = [];
    const mapaCampos: Record<string, string> = {
      email: "Correo electrónico",
      password: "Contraseña",
      nombre: "Nombre",
      non_field_errors: "Error",
    };

    for (const [campo, valor] of Object.entries(registro)) {
      const texto = Array.isArray(valor) ? valor.join(" ") : String(valor);
      const nombreCampo = mapaCampos[campo] || campo;
      
      if (campo === "non_field_errors") {
        partes.push(texto);
      } else {
        partes.push(`• ${nombreCampo}: ${texto}`);
      }
    }
    if (partes.length) return partes.join("\\n");
  }
  return "Ocurrió un error inesperado.";
}"""

# Use a non-greedy match to replace the old function block
api_ts = re.sub(r'export function mensajeDeError.*?return \"Ocurri. un error inesperado\.\";\s*\}', new_mensaje, api_ts, flags=re.DOTALL)

with open('src/services/api.ts', 'w', encoding='utf-8') as f: 
    f.write(api_ts)
