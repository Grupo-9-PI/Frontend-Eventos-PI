import re

with open("src/index.css", "r", encoding="utf-8") as f:
    css = f.read()

# Add color-scheme: light and accent-color: var(--primario) to light theme
css = css.replace("--card: 0 0% 100%;\n}", "--card: 0 0% 100%;\n    color-scheme: light;\n    accent-color: var(--primario);\n}")

# Also add accent-color to dark theme
css = css.replace("color-scheme: dark;\n}", "color-scheme: dark;\n    accent-color: var(--primario);\n}")

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(css)
