import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 19 & 20 & 21: errorNuevo, confirmations, button texts
# Let's insert errorNuevo after setNuevo
if "const [errorNuevo, setErrorNuevo]" not in app:
    app = app.replace(
        "const [nuevo, setNuevo] = useState<BorradorTarea>(borradorInicial);",
        "const [nuevo, setNuevo] = useState<BorradorTarea>(borradorInicial);\n  const [errorNuevo, setErrorNuevo] = useState<Record<string, string>>({});"
    )

old_añadir = """const añadirTarea = () => {
    if (!nuevo.titulo.trim()) return;
    setTareas((ts) => [...ts, { ...nuevo, id: generarId('draft') }]);
    setNuevo(borradorInicial());
  };"""
new_añadir = """const añadirTarea = () => {
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
  };"""
app = app.replace(old_añadir, new_añadir)

# 21: Add confirmation to submit in CrearEvento
if 'if (!window.confirm("¿Confirmas la creación de este evento' not in app:
    app = app.replace(
        "const id = await crearEventoCompleto(eventoPayload, tareasPayload);",
        'if (!window.confirm("¿Confirmas la creación de este evento y su plan de gestiones?")) return;\n    const id = await crearEventoCompleto(eventoPayload, tareasPayload);'
    )

# 21: Add confirmation to delete event in Dashboard (or wherever it exists).
# Search for delete evento
# Actually wait, there is no delete evento in Dashboard yet, but let's check DetalleEvento.
if "if (!window.confirm('¿Seguro que deseas eliminar esta gestión?')) return;" not in app:
    app = app.replace(
        "await updateSubtarea(evento.id, t.id, { estado: 'eliminado' });",
        "if (!window.confirm('¿Seguro que deseas eliminar esta gestión?')) return;\n      await updateSubtarea(evento.id, t.id, { estado: 'eliminado' });"
    )

# 23: Remove "Crea el primero."
app = app.replace("<div className=\"empty-copy\">Crea el primero.</div>", "")
app = app.replace("<div className='empty-copy'>Crea el primero.</div>", "")

# 22: Fases filters:
app = app.replace(
    "const FASES = [\n  { id: 'todos', label: 'Todos' },\n  { id: 'activos', label: 'Activos' },\n];",
    "const FASES = [\n  { id: 'todos', label: 'Todos' },\n  { id: 'activos', label: 'Activos' },\n  { id: 'pasados', label: 'Pasados' },\n  { id: 'cancelados', label: 'Cancelados' },\n  { id: 'retrasados', label: 'Retrasados' }\n];"
)
app = app.replace(
    "const FASES = [{ id: 'todos', label: 'Todos' }, { id: 'activos', label: 'Activos' }];",
    "const FASES = [{ id: 'todos', label: 'Todos' }, { id: 'activos', label: 'Activos' }, { id: 'pasados', label: 'Pasados' }, { id: 'cancelados', label: 'Cancelados' }, { id: 'retrasados', label: 'Retrasados' }];"
)

# Replace inputs with error checking in Plan Inicial
old_nueva = """<div className="field">
                    <label>Nueva gestión</label>
                    <input
                      value={nuevo.titulo}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, titulo: e.target.value })
                      }
                    />
                  </div>"""
new_nueva = """<div className="field">
                    <label>Nueva gestión <span className="req">*</span></label>
                    {errorNuevo.titulo && <div className='field-error'>{errorNuevo.titulo}</div>}
                    <input
                      className={errorNuevo.titulo ? 'error' : ''}
                      value={nuevo.titulo}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, titulo: e.target.value })
                      }
                    />
                  </div>"""
app = app.replace(old_nueva, new_nueva)
# If single quotes were used by prettier
old_nueva2 = """<div className='field'><label>Nueva gestión</label><input value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} /></div>"""
new_nueva2 = """<div className='field'><label>Nueva gestión <span className="req">*</span></label>{errorNuevo.titulo && <div className='field-error'>{errorNuevo.titulo}</div>}<input className={errorNuevo.titulo ? 'error' : ''} value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} /></div>"""
app = app.replace(old_nueva2, new_nueva2)


old_est = """<div className="field">
                    <label>Estimación (horas)</label>
                    <input
                      type="text"
                      pattern="^([0-9]{1,2}):([0-5][0-9])$"
                      placeholder="00:00"
                      value={nuevo.estimacion}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, estimacion: e.target.value })
                      }
                    />
                  </div>"""
new_est = """<div className="field">
                    <label>Estimación (horas) <span className="req">*</span></label>
                    {errorNuevo.estimacion && <div className='field-error'>{errorNuevo.estimacion}</div>}
                    <input
                      type="text"
                      className={errorNuevo.estimacion ? 'error' : ''}
                      pattern="^([0-9]{1,2}):([0-5][0-9])$"
                      placeholder="00:00"
                      value={nuevo.estimacion}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, estimacion: e.target.value })
                      }
                    />
                  </div>"""
app = app.replace(old_est, new_est)
old_est2 = """<div className='field'><label>Estimación (horas)</label><input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} /></div>"""
new_est2 = """<div className='field'><label>Estimación (horas) <span className="req">*</span></label>{errorNuevo.estimacion && <div className='field-error'>{errorNuevo.estimacion}</div>}<input type='text' className={errorNuevo.estimacion ? 'error' : ''} pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} /></div>"""
app = app.replace(old_est2, new_est2)


# 20: Change button text
app = app.replace("<Plus size={14} /> Agregar</button>", "<Plus size={14} /> Agregar al plan</button>")


# Theme toggle & logout
# We add a Theme toggle and Logout to the SideNav and Mobile Top
theme_logout_buttons = """
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
"""
if "Alternar Tema" not in app:
    # Insert at the end of nav
    app = app.replace("</nav>\n    </aside>", "</nav>\n" + theme_logout_buttons + "\n    </aside>")
    
    # Also add for mobile
    mobile_btn = """<button onClick={() => { const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', t); }} style={{ background: 'none', border: 'none', color: 'var(--papel)', fontSize: 20 }}>🌗</button><button onClick={() => (window as any).performLogout()} style={{ background: 'none', border: 'none', color: 'var(--oxido)' }}>Salir</button>"""
    app = app.replace("</Link>\n        </div>\n      </header>", mobile_btn + "\n        </div>\n      </header>")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("App refactored!")
