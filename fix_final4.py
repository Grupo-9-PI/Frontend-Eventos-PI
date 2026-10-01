import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 1. SIDEBAR: Add Theme and Logout
app = re.sub(
    r'Una gestión a la vez\.\s*</div>\s*</aside>',
    r"""Una gestión a la vez.
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--linea)' }}>
            <button className="button button-ghost" style={{ width: '100%', marginBottom: 10, justifyContent: 'center' }} onClick={() => {
              const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', t);
              localStorage.setItem('tema', t);
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

# 2. MOBILE HEADER: Add Theme and Logout
app = re.sub(
    r'</nav>\s*</header>\s*\{\!cargando && eventos\.length > 0 && \(',
    r"""            </nav>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); localStorage.setItem('tema', t); }} style={{ background: 'none', border: 'none', color: 'var(--papel)', fontSize: 20 }}>🌗</button>
              <button onClick={() => (window as any).performLogout()} style={{ background: 'none', border: 'none', color: 'var(--oxido)' }}>Salir</button>
            </div>
          </header>
          {!cargando && eventos.length > 0 && (""",
    app
)

# 3. FILTER DROPDOWN: Replace <select>
app = re.sub(
    r'<select value=\{filtro\} onChange=\{\(e\) => setFiltro\(e\.target\.value\)\}>\s*<option value="activos">Activos</option>\s*<option value="todos">Todos los eventos</option>\s*</select>',
    r"""<select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="pasados">Pasados</option>
            <option value="cancelados">Cancelados</option>
            <option value="retrasados">Retrasados</option>
            <option value="todos">Todos los eventos</option>
          </select>""",
    app
)

# 4. FILTER LOGIC
app = re.sub(
    r'const lista = eventos\s*\.filter\(\s*\(\s*e\s*\)\s*=>\s*filtro === "todos" \|\|\s*diferenciaDias\(hoyISO\(\), e\.fechaInicio\) >= 0 \|\|\s*e\.subtareas\.some\(\(t\) => t\.estado !== "hecho"\),\s*\)',
    r"""const lista = eventos
      .filter((e) => {
        if (filtro === "todos") return true;
        const isActivo = diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.subtareas.some((t) => t.estado !== "hecho");
        const isPasado = diferenciaDias(hoyISO(), e.fechaInicio) < 0 && e.subtareas.every((t) => t.estado === "hecho");
        if (filtro === "activos") return isActivo;
        if (filtro === "pasados") return isPasado;
        if (filtro === "cancelados") return false;
        if (filtro === "retrasados") return false;
        return true;
      })""",
    app
)

# 5. CONST FASES 
app = re.sub(
    r'const FASES = \[\s*\{ id: "todos", label: "Todos" \},\s*\{ id: "activos", label: "Activos" \},\s*\];',
    r"""const FASES = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
  { id: "pasados", label: "Pasados" },
  { id: "cancelados", label: "Cancelados" },
  { id: "retrasados", label: "Retrasados" },
];""",
    app
)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)
