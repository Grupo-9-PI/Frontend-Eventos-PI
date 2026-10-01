import re

with open("src/Root.tsx", "r", encoding="utf-8") as f:
    root = f.read()

# Fix logout so it clears username and password
if "setUsername('');" not in root:
    root = root.replace(
        """  const logout = () => {
    setLoggedIn(false);
    localStorage.removeItem('logged_in');
  };""",
        """  const logout = () => {
    setLoggedIn(false);
    setUsername('');
    setPassword('');
    localStorage.removeItem('logged_in');
  };"""
    )

with open("src/Root.tsx", "w", encoding="utf-8") as f:
    f.write(root)

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Fix error message string
app = app.replace(
    "Agrega al menos una gestión. Haz clic en '+ Agregar' o cancela",
    "Agrega al menos una gestión. Haz clic en '+ Agregar plan inicial' o cancela"
)

# Fix Theme toggle button
# Replace the text-based Alternar Tema with a nice icon toggle in SideNav
old_sidebar_theme = """<button className="button button-ghost" style={{ width: '100%', marginBottom: 10, justifyContent: 'center' }} onClick={() => {
              const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', t);
              localStorage.setItem('tema', t);
            }}>
              Alternar Tema
            </button>"""

# Using Lucide icons for theme (Moon, Sun). We will use a state or just a generic icon.
# Since we can't easily add state to the Shell component without refactoring, let's just use a generic icon that implies theme, e.g., 🌗, or just a Sun/Moon combined icon if one exists. Let's just use CSS or standard unicode `🌗` or Lucide's `Sun` / `Moon` depending on current theme. Wait, Shell doesn't have a state for theme. I can just render both icons side by side, or simply use "🌗 Tema" or similar.
# The user said: "segundo no necesitemas que sea escrito porque igual de nada le va aservir a una persona ciega cambiar un color que no ve"
# So they want JUST AN ICON, no text.
# Let's use `🌗` or maybe `SunMedium` ? I will use the lucide icon `Sun` or `Moon` if possible, but the simplest is just `🌗` since the user liked it in the mobile menu, or a button with standard `aria-hidden`.
# Wait, why didn't it work? "no funciona, existe pero al darle no hizo ningun cambio".
# Let's check `index.css`. Did `[data-theme="light"]` get correctly injected?
