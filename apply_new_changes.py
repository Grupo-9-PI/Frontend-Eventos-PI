import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 11. Change input type='time' to input type='text' with pattern for 'duracion' and 'estimacion' to remove AM/PM
# For duracion in CrearEvento
app = app.replace(
    "<input type='time' className={error.duracion ? 'error' : ''} value={datos.duracion} onChange={(e) => setCampo('duracion', e.target.value)} />",
    "<input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' className={error.duracion ? 'error' : ''} value={datos.duracion} onChange={(e) => setCampo('duracion', e.target.value)} />"
)

# For estimacion in Task builder in CrearEvento
app = app.replace(
    "<input type='time' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} />",
    "<input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} />"
)

# For estimacion in TaskEditor
app = app.replace(
    "<input type='time' className={error.estimacion ? 'error' : ''} value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: e.target.value })} />",
    "<input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' className={error.estimacion ? 'error' : ''} value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: e.target.value })} />"
)

# 12. Add * to Lugar and add validation
app = app.replace("<label>Lugar</label>", "<label>Lugar <span className='req'>*</span></label>")
if "if (!datos.lugar.trim()) e.lugar = 'Obligatorio.';" not in app:
    app = app.replace("if (timeToHours(datos.duracion) <= 0)", "if (!datos.lugar.trim()) e.lugar = 'Obligatorio.';\n    if (timeToHours(datos.duracion) <= 0)")


# 13. Fix "Otro" Tipo layout
old_tipo = """<div className='field'><label>Tipo</label>{error.tipo && <div className='field-error'>{error.tipo}</div>}<select className={error.tipo ? 'error' : ''} value={['Lanzamiento', 'Fiesta', 'Taller', 'Reunión', 'Conferencia', ''].includes(datos.tipo) ? datos.tipo : 'Otro'} onChange={(e) => setCampo('tipo', e.target.value)}><option value='Lanzamiento'>Lanzamiento</option><option value='Fiesta'>Fiesta</option><option value='Taller'>Taller</option><option value='Reunión'>Reunión</option><option value='Conferencia'>Conferencia</option><option value='Otro'>Otro...</option></select>{(!['Lanzamiento', 'Fiesta', 'Taller', 'Reunión', 'Conferencia', ''].includes(datos.tipo) || datos.tipo === 'Otro') && <input style={{ marginTop: 8 }} placeholder='Escribe el tipo...' value={datos.tipo === 'Otro' ? '' : datos.tipo} onChange={(e) => setCampo('tipo', e.target.value)} />}</div>"""
new_tipo = """<div className='field'><label>Tipo</label>{error.tipo && <div className='field-error'>{error.tipo}</div>}<select className={error.tipo ? 'error' : ''} value={['Lanzamiento', 'Fiesta', 'Taller', 'Reunión', 'Conferencia', ''].includes(datos.tipo) ? datos.tipo : 'Otro'} onChange={(e) => setCampo('tipo', e.target.value)}><option value='Lanzamiento'>Lanzamiento</option><option value='Fiesta'>Fiesta</option><option value='Taller'>Taller</option><option value='Reunión'>Reunión</option><option value='Conferencia'>Conferencia</option><option value='Otro'>Otro...</option></select></div>"""
app = app.replace(old_tipo, new_tipo)

# We need to insert the Otro input AFTER the Lugar field (which is the next field) to make it take full width
old_lugar = """<div className='field'><label>Lugar <span className='req'>*</span></label>{error.lugar && <div className='field-error'>{error.lugar}</div>}<input className={error.lugar ? 'error' : ''} value={datos.lugar} onChange={(e) => setCampo('lugar', e.target.value)} /></div>"""
new_lugar = old_lugar + """{(!['Lanzamiento', 'Fiesta', 'Taller', 'Reunión', 'Conferencia', ''].includes(datos.tipo) || datos.tipo === 'Otro') && <div className='field full'><input placeholder='Escribe el tipo personalizado...' value={datos.tipo === 'Otro' ? '' : datos.tipo} onChange={(e) => setCampo('tipo', e.target.value)} /></div>}"""
app = app.replace(old_lugar, new_lugar)


# 8, 9, 10. Fix the Plan Inicial section (blue button, dropdown menu, top right button)

# We need to add applying logic to the component.
# Let's add applying logic right before `const submit = async (e: FormEvent) => {`
apply_plan_code = """
    const aplicarPlanPredefinido = (tipoPlan: string) => {
        if (!tipoPlan) return;
        const plantillas: Record<string, any[]> = {
            vacio: [],
            conferencia: [
                { titulo: 'Preparar presentación', categoria: 'otro', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '10:00', horaInicio: '', estimacion: '02:00' },
                { titulo: 'Confirmar salón', categoria: 'salon', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '12:00', horaInicio: '', estimacion: '00:30' }
            ],
            fiesta: [
                { titulo: 'Comprar decoración', categoria: 'otro', prioridad: 'media', fechaLimite: datos.fechaInicio, horaLimite: '15:00', horaInicio: '', estimacion: '01:00' },
                { titulo: 'Confirmar catering', categoria: 'catering', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '12:00', horaInicio: '', estimacion: '00:30' }
            ]
        };
        const tareasNuevas = (plantillas[tipoPlan] || []).map(t => ({ ...t, id: generarId('draft') }));
        setTareas(tareasNuevas);
    };
"""
if "const aplicarPlanPredefinido" not in app:
    app = app.replace("const submit = async (e: FormEvent) => {", apply_plan_code + "\n    const submit = async (e: FormEvent) => {")


# The section replacement
old_plan_section = """{!mostrarPlan ? <section className='form-section' style={{ textAlign: 'center', padding: '40px 20px' }}><button type='button' className='button button-secondary' onClick={() => setMostrarPlan(true)}>+ Agregar un plan inicial de gestiones (Opcional)</button></section> : <section className='form-section'><h2 className='form-section-title'>Plan inicial</h2><div className='task-builder'>{tareas.map((t) => <div className='task-draft' key={t.id}><div className='task-draft-info'>{t.titulo}</div><button type='button' className='button button-small button-danger button-icon' onClick={() => setTareas((ts) => ts.filter((x) => x.id !== t.id))}><Trash2 size={13} /></button></div>)}<div className='card card-pad'><div className='task-builder-row'><div className='task-builder-item'><label>Nueva gestión</label><input value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} /></div><div className='task-builder-item'><label>Estimación (horas)</label><input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} /></div></div><div className='task-builder-row compact' style={{ marginTop: 11 }}><div className='task-builder-item'><label>Plazo</label><input type='date' value={nuevo.fechaLimite} max={datos.fechaInicio} onChange={(e) => setNuevo({ ...nuevo, fechaLimite: e.target.value })} /></div><div className='task-builder-item'><label>Hora</label><input type='time' value={nuevo.horaLimite} onChange={(e) => setNuevo({ ...nuevo, horaLimite: e.target.value })} /></div><div className='task-builder-item'><button type='button' className='button button-secondary' onClick={añadirTarea}><Plus size={14} /> Agregar</button></div></div></div></div></section>}"""
new_plan_section = """{!mostrarPlan ? <section className='form-section' style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--panel-alt)', borderRadius: 'var(--radio-lg)', margin: '21px', border: '1px solid var(--linea)' }}><button type='button' className='button button-primary' onClick={() => setMostrarPlan(true)}>+ Agregar un plan inicial de gestiones (Opcional)</button></section> : <section className='form-section'><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 className='form-section-title' style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>Plan inicial</h2><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><select onChange={(e) => aplicarPlanPredefinido(e.target.value)} defaultValue="" style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--linea)' }}><option value="" disabled>Cargar plantilla...</option><option value="vacio">Plan Vacío</option><option value="conferencia">Plan Conferencia</option><option value="fiesta">Plan Fiesta</option></select><button type='button' className='button button-primary button-small' onClick={() => setMostrarPlan(false)}>Quitar plan</button></div></div><div className='task-builder'>{tareas.map((t) => <div className='task-draft' key={t.id}><div className='task-draft-info'>{t.titulo}</div><button type='button' className='button button-small button-danger button-icon' onClick={() => setTareas((ts) => ts.filter((x) => x.id !== t.id))}><Trash2 size={13} /></button></div>)}<div className='card card-pad' style={{ border: '1px solid var(--primary)', background: '#f8faff' }}><div className='task-builder-row'><div className='task-builder-item' style={{ flex: 2 }}><label>Nueva gestión</label><input value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} /></div><div className='task-builder-item'><label>Estimación (horas)</label><input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} /></div></div><div className='task-builder-row compact' style={{ marginTop: 11 }}><div className='task-builder-item'><label>Plazo</label><input type='date' value={nuevo.fechaLimite} max={datos.fechaInicio} onChange={(e) => setNuevo({ ...nuevo, fechaLimite: e.target.value })} /></div><div className='task-builder-item'><label>Hora</label><input type='time' value={nuevo.horaLimite} onChange={(e) => setNuevo({ ...nuevo, horaLimite: e.target.value })} /></div><div className='task-builder-item' style={{ display: 'flex', alignItems: 'flex-end' }}><button type='button' className='button button-primary' onClick={añadirTarea} style={{ width: '100%' }}><Plus size={14} /> Agregar a la lista</button></div></div></div></div></section>}"""

app = app.replace(old_plan_section, new_plan_section)


with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Applied new user changes!")
