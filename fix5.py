import re

with open("src/index.css", "r", encoding="utf-8") as f:
    css = f.read()

# Make specificity higher so it overrides :root
css = css.replace("[data-theme='light'] {", ":root[data-theme='light'] {")

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(css)

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Change the text Alternar Tema to an Icon
# Let's find the SideNav button
app = re.sub(
    r'<button className="button button-ghost" style=\{\{ width: \'100%\', marginBottom: 10, justifyContent: \'center\' \}\} onClick=\{\(\) => \{[^}]*\}\}>\s*Alternar Tema\s*</button>',
    r"""<button className="button button-ghost" style={{ width: '100%', marginBottom: 10, justifyContent: 'center', fontSize: '20px' }} onClick={() => {
              const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', t);
              localStorage.setItem('tema', t);
            }} title="Alternar modo claro/oscuro">
              🌗
            </button>""",
    app
)

# And make sure Cerrar sesión has an icon too to match? The user just said "cambia de estilo el boton de alternar tema, primero no se sobreentiende, segundo no necesitemas que sea escrito porque igual de nada le va aservir a una persona ciega cambiar un color que no ve". So I'll just change it to 🌗.

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Fixed CSS and Theme Icon")
