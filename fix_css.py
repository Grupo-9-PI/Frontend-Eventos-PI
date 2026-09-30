import re

with open("src/index.css", "r", encoding="utf-8") as f:
    css = f.read()

# Replace hardcoded colors with variables so data-theme works
css = css.replace("background: #1d1d1d;", "background: var(--input-bg);")
css = css.replace("background: #232323;", "background: var(--panel);")
css = css.replace("background: #181818;", "background: var(--tinta);")
css = css.replace("color: #aaa;", "color: var(--apagado);")
css = css.replace("color: #777;", "color: var(--apagado);")
css = css.replace("color: #686868;", "color: var(--apagado);")
css = css.replace("color: #bdbdbd;", "color: var(--papel);")
css = css.replace("color: #c3c3c3;", "color: var(--papel);")
css = css.replace("color: #d5d5d5;", "color: var(--papel);")

# Add --input-bg to root
if "--input-bg: #1d1d1d;" not in css:
    css = css.replace("--panel: #232323;", "--panel: #232323;\n    --input-bg: #1d1d1d;")

light_theme = """
[data-theme='light'] {
    --tinta: #f4f5f7;
    --panel: #ffffff;
    --panel-elevado: #fdfdfd;
    --input-bg: #ffffff;
    --linea: rgba(0,0,0,.12);
    --linea-fuerte: rgba(0,0,0,.2);
    --papel: #1f2937;
    --apagado: #6b7280;
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
if "[data-theme='light']" not in css:
    css = css.replace(":root {", light_theme + "\n:root {")

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Updated index.css")
