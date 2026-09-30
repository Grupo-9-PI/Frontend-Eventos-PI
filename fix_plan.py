import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 14. Fix background color of task builder: remove `background: '#f8faff'`
app = app.replace("background: '#f8faff'", "background: 'var(--panel-alt)'")

# 15. Start with empty tasks:
app = app.replace(
    "const [tareas, setTareas] = useState<BorradorTarea[]>(() => [ { ...borradorInicial(), titulo: 'Reservar salón', categoria: 'salon', prioridad: 'alta', estimacion: '2' } ]);",
    "const [tareas, setTareas] = useState<BorradorTarea[]>([]);"
)

# 18. Change options: "vacio" is removed, add others.
old_plantillas = """const plantillas: Record<string, any[]> = {
            vacio: [],
            conferencia: [
                { titulo: 'Preparar presentación', categoria: 'otro', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '10:00', horaInicio: '', estimacion: '02:00' },
                { titulo: 'Confirmar salón', categoria: 'salon', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '12:00', horaInicio: '', estimacion: '00:30' }
            ],
            fiesta: [
                { titulo: 'Comprar decoración', categoria: 'otro', prioridad: 'media', fechaLimite: datos.fechaInicio, horaLimite: '15:00', horaInicio: '', estimacion: '01:00' },
                { titulo: 'Confirmar catering', categoria: 'catering', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '12:00', horaInicio: '', estimacion: '00:30' }
            ]
        };"""
new_plantillas = """const plantillas: Record<string, any[]> = {
            conferencia: [
                { titulo: 'Preparar presentación', categoria: 'otro', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '10:00', horaInicio: '', estimacion: '02:00' },
                { titulo: 'Confirmar salón', categoria: 'salon', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '12:00', horaInicio: '', estimacion: '00:30' }
            ],
            fiesta: [
                { titulo: 'Comprar decoración', categoria: 'otro', prioridad: 'media', fechaLimite: datos.fechaInicio, horaLimite: '15:00', horaInicio: '', estimacion: '01:00' },
                { titulo: 'Confirmar catering', categoria: 'catering', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '12:00', horaInicio: '', estimacion: '00:30' }
            ],
            boda: [
                { titulo: 'Fotografía', categoria: 'otro', prioridad: 'alta', fechaLimite: datos.fechaInicio, horaLimite: '10:00', horaInicio: '', estimacion: '02:00' }
            ],
            reunion: [
                { titulo: 'Hacer orden del día', categoria: 'otro', prioridad: 'media', fechaLimite: datos.fechaInicio, horaLimite: '09:00', horaInicio: '', estimacion: '01:00' }
            ]
        };"""
app = app.replace(old_plantillas, new_plantillas)


# 15, 16, 17. Re-structure the Plan Inicial layout
old_plan_section = """<section className='form-section'><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 className='form-section-title' style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>Plan inicial</h2><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><select onChange={(e) => aplicarPlanPredefinido(e.target.value)} defaultValue="" style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--linea)' }}><option value="" disabled>Cargar plantilla...</option><option value="vacio">Plan Vacío</option><option value="conferencia">Plan Conferencia</option><option value="fiesta">Plan Fiesta</option></select><button type='button' className='button button-primary button-small' onClick={() => setMostrarPlan(false)}>Quitar plan</button></div></div><div className='task-builder'>{tareas.map((t) => <div className='task-draft' key={t.id}><div className='task-draft-info'>{t.titulo}</div><button type='button' className='button button-small button-danger button-icon' onClick={() => setTareas((ts) => ts.filter((x) => x.id !== t.id))}><Trash2 size={13} /></button></div>)}<div className='card card-pad' style={{ border: '1px solid var(--primary)', background: 'var(--panel-alt)' }}><div className='task-builder-row'><div className='task-builder-item' style={{ flex: 2 }}><label>Nueva gestión</label><input value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} /></div><div className='task-builder-item'><label>Estimación (horas)</label><input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} /></div></div><div className='task-builder-row compact' style={{ marginTop: 11 }}><div className='task-builder-item'><label>Plazo</label><input type='date' value={nuevo.fechaLimite} max={datos.fechaInicio} onChange={(e) => setNuevo({ ...nuevo, fechaLimite: e.target.value })} /></div><div className='task-builder-item'><label>Hora</label><input type='time' value={nuevo.horaLimite} onChange={(e) => setNuevo({ ...nuevo, horaLimite: e.target.value })} /></div><div className='task-builder-item' style={{ display: 'flex', alignItems: 'flex-end' }}><button type='button' className='button button-primary' onClick={añadirTarea} style={{ width: '100%' }}><Plus size={14} /> Agregar a la lista</button></div></div></div></div></section>"""
new_plan_section = """<section className='form-section'><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 className='form-section-title' style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>Plan inicial</h2><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><button type='button' className='button button-ghost button-small' onClick={() => setMostrarPlan(false)}>Cancelar</button><button type='button' className='button button-primary button-small' onClick={añadirTarea}><Plus size={14} /> Agregar</button></div></div><div className='task-builder'><div style={{ marginBottom: '15px' }}><select onChange={(e) => aplicarPlanPredefinido(e.target.value)} defaultValue="" style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--linea)', background: 'var(--panel-alt)', color: 'var(--text)' }}><option value="" disabled>Cargar plantilla rápida...</option><option value="conferencia">Plan Conferencia</option><option value="fiesta">Plan Fiesta</option><option value="boda">Plan Boda</option><option value="reunion">Plan Reunión</option></select></div>{tareas.map((t) => <div className='task-draft' key={t.id}><div className='task-draft-info'>{t.titulo}</div><button type='button' className='button button-small button-danger button-icon' onClick={() => setTareas((ts) => ts.filter((x) => x.id !== t.id))}><Trash2 size={13} /></button></div>)}<div className='card card-pad' style={{ border: '1px solid var(--primary)', background: 'var(--panel-alt)' }}><div className='form-grid' style={{ gridTemplateColumns: '1fr 1fr' }}><div className='field'><label>Nueva gestión</label><input value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} /></div><div className='field'><label>Estimación (horas)</label><input type='text' pattern='^([0-9]{1,2}):([0-5][0-9])$' placeholder='00:00' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} /></div><div className='field'><label>Plazo</label><input type='date' value={nuevo.fechaLimite} max={datos.fechaInicio} onChange={(e) => setNuevo({ ...nuevo, fechaLimite: e.target.value })} /></div><div className='field'><label>Hora</label><input type='time' value={nuevo.horaLimite} onChange={(e) => setNuevo({ ...nuevo, horaLimite: e.target.value })} /></div></div></div></div></section>"""

app = app.replace(old_plan_section, new_plan_section)


with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)
print("Updated App.tsx successfully.")
