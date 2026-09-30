import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Fix añadirTarea
app = re.sub(
    r"const añadirTarea = \(\) => \{\s*if \(\!nuevo\.titulo\.trim\(\)\) return;\s*setTareas\(\(ts\) => \[\.\.\.ts, \{ \.\.\.nuevo, id: generarId\('draft'\) \}\]\);\s*setNuevo\(borradorInicial\(\)\);\s*\};",
    """const añadirTarea = () => {
    const errs: Record<string, string> = {};
    if (!nuevo.titulo.trim()) errs.titulo = 'Obligatorio.';
    if (!nuevo.estimacion.trim() || nuevo.estimacion === '00:00') errs.estimacion = 'Obligatorio.';
    if (Object.keys(errs).length > 0) {
      setErrorNuevo(errs);
      return;
    }
    setErrorNuevo({});
    setTareas((ts) => [...ts, { ...nuevo, id: generarId('draft') }]);
    setNuevo(borradorInicial());
  };""",
    app
)

# Fix Theme and Logout
app = re.sub(
    r"</nav>\s*</aside>",
    """</nav>
      <div style={{ marginTop: 'auto', padding: '20px' }}>
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
    </aside>""",
    app
)

app = re.sub(
    r"</Link>\s*</div>\s*</header>",
    """</Link>
          <button onClick={() => { const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); }} style={{ background: 'none', border: 'none', color: 'var(--papel)', fontSize: 20, marginLeft: 10 }}>🌗</button>
          <button onClick={() => (window as any).performLogout()} style={{ background: 'none', border: 'none', color: 'var(--oxido)', marginLeft: 10 }}>Salir</button>
        </div>
      </header>""",
    app
)


with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Fixed formatting replacements!")
