import re
import sys

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Fix validarDatosEvento to accept mostrarPlan
old_val = "function validarDatosEvento(datos: FormEvento, tareas: BorradorTarea[]) {"
new_val = "function validarDatosEvento(datos: FormEvento, tareas: BorradorTarea[], mostrarPlan: boolean) {"
app = app.replace(old_val, new_val)

old_val_check = 'if (!tareas.length) e.general = "Agrega al menos una gestin.";'
old_val_check2 = 'if (!tareas.length) e.general = "Agrega al menos una gestión.";'
new_val_check = 'if (mostrarPlan && !tareas.length) e.general = "Agrega al menos una gestión. Haz clic en \'+ Agregar\' o cancela la creación del plan.";'
app = app.replace(old_val_check, new_val_check).replace(old_val_check2, new_val_check)

# Update the call to validarDatosEvento in submit
old_submit_call = "const validacion = validarDatosEvento(datos, tareas);"
new_submit_call = """
      if (mostrarPlan && !tareas.length && nuevo.titulo.trim()) {
        const errs: Record<string, string> = {};
        if (!nuevo.titulo.trim()) errs.titulo = 'Obligatorio.';
        if (!nuevo.estimacion.trim() || nuevo.estimacion === '00:00') errs.estimacion = 'Obligatorio.';
        if (Object.keys(errs).length > 0) {
          setErrorNuevo(errs);
        } else {
          setTareas((ts) => [...ts, { ...nuevo, id: generarId("draft") }]);
          setNuevo(borradorInicial());
          setErrorNuevo({});
        }
      }
      
      const validacion = validarDatosEvento(datos, tareas, mostrarPlan);
      
      if (mostrarPlan && !tareas.length && Object.keys(errorNuevo).length === 0) {
        setErrorNuevo({ titulo: 'Obligatorio', estimacion: 'Obligatorio' });
      }
"""
app = app.replace(old_submit_call, new_submit_call)


# Theme toggle missing?
# Make sure the SideNav has it properly
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

# Fix Button Text +Agregar plan inicial
app = app.replace(
    '<Plus size={14} /> Agregar\n                </button>',
    '<Plus size={14} /> Agregar plan inicial\n                </button>'
)
app = app.replace(
    '<Plus size={14} /> Agregar</button>',
    '<Plus size={14} /> Agregar plan inicial</button>'
)
app = app.replace(
    '<Plus size={14} /> Agregar al plan</button>',
    '<Plus size={14} /> Agregar plan inicial</button>'
)

# Replace filter logic
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
if 'if (filtro === "todos") return true;' not in app:
    app = app.replace(old_filter, new_filter)

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
if '<option value="pasados">Pasados</option>' not in app:
    app = app.replace(old_sel, new_sel)


with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Applied fixes via fix3.py")
