import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Add Theme and Logout to SideNav
if "Alternar Tema" not in app:
    app = app.replace(
        """Una gestión a la vez.
          </div>
      </aside>""",
        """Una gestión a la vez.
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--linea)' }}>
            <button className="button button-ghost" style={{ width: '100%', marginBottom: 10, justifyContent: 'center' }} onClick={() => {
              const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', t);
            }}>
              Alternar Tema
            </button>
            <button className="button button-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={() => (window as any).performLogout()}>
              Cerrar sesión
            </button>
          </div>
      </aside>"""
    )

if "Salir</button>" not in app:
    app = app.replace(
        """          </header>
        {!cargando && eventos.length > 0 && (""",
        """            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); }} style={{ background: 'none', border: 'none', color: 'var(--papel)', fontSize: 20 }}>🌗</button>
              <button onClick={() => (window as any).performLogout()} style={{ background: 'none', border: 'none', color: 'var(--oxido)' }}>Salir</button>
            </div>
          </header>
        {!cargando && eventos.length > 0 && ("""
    )

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Added Theme buttons")
