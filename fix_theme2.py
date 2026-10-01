import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

app = app.replace(
    "document.documentElement.setAttribute('data-theme', t);",
    "document.documentElement.setAttribute('data-theme', t); localStorage.setItem('tema', t);"
)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)
