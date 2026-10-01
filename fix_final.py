import re
import sys

def apply_fixes():
    with open("src/App.tsx", "r", encoding="utf-8") as f:
        app = f.read()

    # 1. Add Theme and Logout to SideNav
    # Locate </aside>
    if "Alternar Tema" not in app:
        app = app.replace(
            "        </Link>\n      </aside>",
            """        </Link>
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
        if "Alternar Tema" not in app:
            print("Failed to add Theme to SideNav")

    # 2. Add Theme and Logout to Mobile Menu
    # Locate </header>
    if "Salir</button>" not in app:
        app = app.replace(
            "            </nav>\n          </header>",
            """            </nav>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); }} style={{ background: 'none', border: 'none', color: 'var(--papel)', fontSize: 20 }}>🌗</button>
              <button onClick={() => (window as any).performLogout()} style={{ background: 'none', border: 'none', color: 'var(--oxido)' }}>Salir</button>
            </div>
          </header>"""
        )

    # 3. Fix Button text +Agregar -> + Agregar plan inicial
    app = app.replace(
        '<Plus size={14} /> Agregar\n                </button>',
        '<Plus size={14} /> Agregar plan inicial\n                </button>'
    )
    app = app.replace(
        '<Plus size={14} /> Agregar</button>',
        '<Plus size={14} /> Agregar plan inicial</button>'
    )

    # 4. Filters pasados, cancelados, retrasados
    if '<option value="pasados">Pasados</option>' not in app:
        old_sel = """<select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="todos">Todos los eventos</option>
          </select>"""
        new_sel = """<select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="pasados">Pasados</option>
            <option value="cancelados">Cancelados</option>
            <option value="retrasados">Retrasados</option>
            <option value="todos">Todos los eventos</option>
          </select>"""
        app = app.replace(old_sel, new_sel)

    # 5. Replace FASES list if present
    app = app.replace(
        """const FASES = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
];""",
        """const FASES = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Activos" },
  { id: "pasados", label: "Pasados" },
  { id: "cancelados", label: "Cancelados" },
  { id: "retrasados", label: "Retrasados" },
];"""
    )
    app = app.replace(
        """const FASES = [
    { id: "todos", label: "Todos" },
    { id: "activos", label: "Activos" },
  ];""",
        """const FASES = [
    { id: "todos", label: "Todos" },
    { id: "activos", label: "Activos" },
    { id: "pasados", label: "Pasados" },
    { id: "cancelados", label: "Cancelados" },
    { id: "retrasados", label: "Retrasados" },
  ];"""
    )

    # 6. Filter logic
    old_filter = """const lista = eventos
      .filter(
        (e) =>
          filtro === "todos" ||
          diferenciaDias(hoyISO(), e.fechaInicio) >= 0 ||
          e.subtareas.some((t) => t.estado !== "hecho"),
      )"""
    new_filter = """const lista = eventos
      .filter((e) => {
        if (filtro === "todos") return true;
        const isActivo = diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.subtareas.some((t) => t.estado !== "hecho");
        const isPasado = diferenciaDias(hoyISO(), e.fechaInicio) < 0 && e.subtareas.every((t) => t.estado === "hecho");
        if (filtro === "activos") return isActivo;
        if (filtro === "pasados") return isPasado;
        if (filtro === "cancelados") return false;
        if (filtro === "retrasados") return false;
        return true;
      })"""
    app = app.replace(old_filter, new_filter)

    with open("src/App.tsx", "w", encoding="utf-8") as f:
        f.write(app)

apply_fixes()
print("Fixes applied to App.tsx")
