import re

with open("src/index.css", "r", encoding="utf-8") as f:
    css = f.read()

light_vars = """:root[data-theme='light'] {
  --tinta: #f4f5f7;
  --panel: #ffffff;
  --input-bg: #ffffff;
  --panel-elevado: #f8f9fa;
  --primario: #155eef;
  --primario-hover: #175cd3;
  --papel: #1a1a1a;
  --apagado: #6b7280;
  --linea: #e5e7eb;
  --linea-fuerte: #d1d5db;
  --oxido: #dc2626;
  --oxido-fondo: #fef2f2;
  --ambar: #d97706;
  --ambar-fondo: #fffbeb;
  --nav-hover: #e5e7eb;
  --nav-active-bg: #e0f2fe;
  --nav-active-text: #0369a1;
}"""

dark_vars = """:root {
  --tinta: #1a1a1a;
  --panel: #232323;
  --input-bg: #1d1d1d;
  --panel-elevado: #2b2b2b;
  --primario: #155eef;
  --primario-hover: #175cd3;
  --papel: #ececec;
  --apagado: #888;
  --linea: #333;
  --linea-fuerte: #444;
  --oxido: #e5484d;
  --oxido-fondo: #3a1515;
  --ambar: #f7b955;
  --ambar-fondo: #332510;
  --nav-hover: #242424;
  --nav-active-bg: rgba(44,102,147,.24);
  --nav-active-text: #d9e9f3;
}"""

# Replace the variables blocks
css = re.sub(r':root\[data-theme=\'light\'\]\s*\{[^}]*\}', light_vars, css)
css = re.sub(r':root\s*\{[^}]*\}', dark_vars, css)

# Replace the hardcoded colors in nav
css = css.replace("color: #707070;", "color: var(--apagado);")
css = css.replace("color: #a7a7a7;", "color: var(--apagado);")
css = css.replace("background: #242424;", "background: var(--nav-hover);")
css = css.replace("background: rgba(44,102,147,.24); color: #d9e9f3;", "background: var(--nav-active-bg); color: var(--nav-active-text);")

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(css)

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Fix the string "Haz clic en '+ Agregar' o cancela"
app = re.sub(r"Haz clic en '\+\s*Agregar' o cancela", "Haz clic en '+ Agregar plan inicial' o cancela", app)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Fixed CSS variables and App.tsx error text.")
