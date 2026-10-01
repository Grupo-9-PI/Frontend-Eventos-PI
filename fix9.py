import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 1. Import Sun and Moon
if "Sun," not in app:
    app = app.replace('} from "lucide-react";', '  Sun,\n  Moon,\n} from "lucide-react";')

# 2. Add state to Shell
if "const [tema, setTema]" not in app:
    app = app.replace(
        "function Shell() {",
        "function Shell() {\n  const [tema, setTema] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');"
    )

# 3. Replace the text in the footer
# The text is:
# <div className="sidebar-footer">
#   Planifica con claridad.
#   <br />
#   Una gestión a la vez.
# </div>
app = re.sub(
    r'<div className="sidebar-footer">\s*Planifica con claridad\.\s*<br />\s*Una gesti[oó]n a la vez\.\s*</div>',
    '<div className="sidebar-footer" style={{ border: "none" }}></div>',
    app
)

# 4. Replace the old theme toggle button in the sidebar
old_btn = r'<button className="button button-ghost" style=\{\{\s*width: \'100%\',\s*marginBottom: 10,\s*justifyContent: \'center\',\s*fontSize: \'20px\'\s*\}\}\s*onClick=\{\(\) => \{\s*const t = document\.documentElement\.getAttribute\(\'data-theme\'\) === \'light\' \? \'dark\' : \'light\';\s*document\.documentElement\.setAttribute\(\'data-theme\', t\);\s*localStorage\.setItem\(\'tema\', t\);\s*\}\}\s*title="Alternar modo claro/oscuro">\s*🌗\s*</button>'

new_toggle = """<div style={{ display: 'flex', justifyContent: 'center', marginBottom: 15 }}>
            <button
              onClick={() => {
                const t = tema === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', t);
                localStorage.setItem('tema', t);
                setTema(t);
              }}
              title="Alternar modo claro/oscuro"
              style={{
                background: tema === 'light' ? '#e2e8f0' : '#1e293b',
                border: 'none',
                borderRadius: 20,
                width: 50,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                padding: 3,
                cursor: 'pointer',
                justifyContent: tema === 'light' ? 'flex-start' : 'flex-end',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: tema === 'light' ? '#fff' : '#fff', color: tema === 'light' ? '#e2e8f0' : '#1e293b', display: 'grid', placeItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {tema === 'light' ? <Sun size={12} color="#000" /> : <Moon size={12} color="#000" />}
              </div>
            </button>
          </div>"""

app = re.sub(old_btn, new_toggle, app)

# 5. Mobile header theme toggle
# <button onClick={() => { const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); localStorage.setItem('tema', t); }} style={{ background: 'none', border: 'none', color: 'var(--papel)', fontSize: 20 }}>🌗</button>
old_mobile_btn = r'<button onClick=\{\(\) => \{ const t = document\.documentElement\.getAttribute\(\'data-theme\'\) === \'light\' \? \'dark\' : \'light\'; document\.documentElement\.setAttribute\(\'data-theme\', t\); localStorage\.setItem\(\'tema\', t\); \}\} style=\{\{ background: \'none\', border: \'none\', color: \'var\(--papel\)\', fontSize: 20 \}\}>🌗</button>'

new_mobile_btn = """<button
              onClick={() => {
                const t = tema === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', t);
                localStorage.setItem('tema', t);
                setTema(t);
              }}
              style={{
                background: tema === 'light' ? '#e2e8f0' : '#1e293b',
                border: 'none',
                borderRadius: 20,
                width: 50,
                height: 26,
                display: 'flex',
                alignItems: 'center',
                padding: 3,
                cursor: 'pointer',
                justifyContent: tema === 'light' ? 'flex-start' : 'flex-end',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                {tema === 'light' ? <Sun size={12} color="#000" /> : <Moon size={12} color="#000" />}
              </div>
            </button>"""

app = re.sub(old_mobile_btn, new_mobile_btn, app)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)
