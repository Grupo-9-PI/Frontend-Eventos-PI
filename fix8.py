import re

with open("src/index.css", "r", encoding="utf-8") as f:
    css = f.read()

# I need to restore the shadcn UI variables for the light theme so that `Root.tsx` isn't messed up in light mode.
light_vars_with_shadcn = """
:root[data-theme='light'] {
    --tinta: #f9fafb;
    --panel: #ffffff;
    --panel-elevado: #f3f4f6;
    --input-bg: #ffffff;
    --linea: #e5e7eb;
    --linea-fuerte: #d1d5db;
    --papel: #111827;
    --apagado: #4b5563;
    --azul: #2563eb;
    --azul-claro: #3b82f6;
    --ambar: #d97706;
    --oxido: #dc2626;
    --salvia: #059669;
    --background: 0 0% 96%;
    --foreground: 0 0% 10%;
    --border: 0 0% 85%;
    --card: 0 0% 100%;
}
"""

css = re.sub(r':root\[data-theme=\'light\'\]\s*\{[^}]*\}', light_vars_with_shadcn.strip(), css)

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(css)
