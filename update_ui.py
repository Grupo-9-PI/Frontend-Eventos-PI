import re

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    app_code = f.read()

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\index.css', 'r', encoding='utf-8') as f:
    css_code = f.read()

# 1. Update index.css
if '.field-error' not in css_code:
    css_code = css_code.replace('.field-hint { color: #777; font-size: 11px; }', 
    '.field-hint { color: #777; font-size: 11px; }\n  .field-error { color: #d1512f; font-size: 11.5px; margin-top: -3px; }\n  input.error, select.error, textarea.error { background: rgba(209,81,47,.08) !important; border-color: #d1512f !important; }')

# 2. Add ConfirmDialog to App.tsx
confirm_dialog = """function ConfirmDialog({ titulo, mensaje, onClose, onConfirm }: { titulo: string; mensaje: string; onClose: () => void; onConfirm: () => void }) {
  return <div className='dialog-backdrop' onMouseDown={onClose}><div className='dialog' style={{ padding: '26px 24px 20px', maxWidth: 400 }} onMouseDown={(e) => e.stopPropagation()}><div className='dialog-body'><h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 600 }}>{titulo}</h3><p style={{ color: 'var(--apagado)', fontSize: '13.5px', marginBottom: '28px', lineHeight: 1.5 }}>{mensaje}</p></div><div className='form-actions' style={{ marginTop: 0 }}><button type='button' className='button button-ghost' onClick={onClose}>Cancelar</button><button type='button' className='button button-danger' onClick={onConfirm}>Eliminar</button></div></div></div>;
}"""

if 'function ConfirmDialog' not in app_code:
    app_code = app_code.replace('function ReprogramarDialog', confirm_dialog + '\n\nfunction ReprogramarDialog')

# 3. Update DetalleEvento for deletion and form alignment
detalle_evento_old = """function DetalleEvento() {
  const { id } = useParams<{ id: string }>(); const { eventos, actualizarSubtarea, eliminarSubtarea, eliminarEvento, crearSubtarea, actualizarEvento } = useStore();
  const [, setLocation] = useLocation(); const evento = eventos.find((e) => e.id === id);
  const [mostrarAgregar, setMostrarAgregar] = useState(false); const [editar, setEditar] = useState(false); const [tareaEditar, setTareaEditar] = useState<Subtarea | null>(null); const [mover, setMover] = useState<Subtarea | null>(null);
  if (!evento) return <EmptyState titulo='Evento no encontrado' copy='Puede que haya sido eliminado.' accion={<Link href='/eventos' className='button button-secondary'>Volver a eventos</Link>} />;
  
  const toggle = async (tarea: Subtarea) => await actualizarSubtarea(evento.id, { ...tarea, estado: tarea.estado === 'hecho' ? 'pendiente' : 'hecho' });
  const eliminar = async (tarea: Subtarea) => { if (window.confirm('¿Eliminar "' + tarea.titulo + '"?')) await eliminarSubtarea(evento.id, tarea.id); };
  const eliminarEv = async () => { if (window.confirm('¿Eliminar "' + evento.nombre + '"?')) if (await eliminarEvento(evento.id)) setLocation('/eventos'); };
  
  const pendientes = evento.subtareas.filter((t) => t.estado !== 'hecho'); const completadas = evento.subtareas.filter((t) => t.estado === 'hecho'); const porcentaje = calcularPorcentaje(evento);
  return <div><Link href='/eventos' className='detail-back'><ArrowLeft size={14} /> Todos los eventos</Link><div className='detail-head'><div><h1 className='detail-title'>{evento.nombre}</h1></div><div className='detail-score'><div className='score-number'>{porcentaje}%</div></div></div><div className='detail-actions'><button className='button button-primary' onClick={() => setMostrarAgregar((v) => !v)}><Plus size={15} /> {mostrarAgregar ? 'Cerrar formulario' : 'Agregar gestión'}</button><button className='button button-danger' onClick={eliminarEv}><Trash2 size={14} /> Eliminar evento</button></div>{mostrarAgregar && <TaskEditor evento={evento} otras={evento.subtareas} onCancel={() => setMostrarAgregar(false)} onSave={async (t) => { if (validarTarea(evento, t as Subtarea, evento.subtareas)) return false; if(await crearSubtarea(evento.id, t)) setMostrarAgregar(false); return true; }} />}{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={async (t) => { if(await actualizarSubtarea(evento.id, t)) setTareaEditar(null); }} />}{mover && <ReprogramarDialog evento={evento} tarea={mover} onClose={() => setMover(null)} onSave={async (fecha, hora) => { if(await actualizarSubtarea(evento.id, { ...mover, fechaLimite: fecha, horaLimite: hora })) setMover(null); }} />}<div className='detail-layout'><section>{pendientes.length ? <div className='task-list'>{pendientes.map((t) => <FilaTarea key={t.id} tarea={t} eventoId={evento.id} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} onEditar={() => setTareaEditar(t)} onEliminar={() => eliminar(t)} />)}</div> : <EmptyState titulo='Plan despejado' copy='No hay gestiones pendientes.' />}{completadas.length > 0 && <div className='task-list'>{completadas.map((t) => <FilaTarea key={t.id} tarea={t} eventoId={evento.id} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} />)}</div>}</section></div></div>;
}"""

detalle_evento_new = """function DetalleEvento() {
  const { id } = useParams<{ id: string }>(); const { eventos, actualizarSubtarea, eliminarSubtarea, eliminarEvento, crearSubtarea, actualizarEvento } = useStore();
  const [, setLocation] = useLocation(); const evento = eventos.find((e) => e.id === id);
  const [mostrarAgregar, setMostrarAgregar] = useState(false); const [editar, setEditar] = useState(false); const [tareaEditar, setTareaEditar] = useState<Subtarea | null>(null); const [mover, setMover] = useState<Subtarea | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{ tipo: 'evento' | 'tarea', id: string, nombre: string } | null>(null);

  if (!evento) return <EmptyState titulo='Evento no encontrado' copy='Puede que haya sido eliminado.' accion={<Link href='/eventos' className='button button-secondary'>Volver a eventos</Link>} />;
  
  const toggle = async (tarea: Subtarea) => await actualizarSubtarea(evento.id, { ...tarea, estado: tarea.estado === 'hecho' ? 'pendiente' : 'hecho' });
  const eliminar = async (tarea: Subtarea) => { setConfirmarEliminar({ tipo: 'tarea', id: tarea.id, nombre: tarea.titulo }); };
  const eliminarEv = async () => { setConfirmarEliminar({ tipo: 'evento', id: evento.id, nombre: evento.nombre }); };
  
  const procesarEliminacion = async () => {
    if (!confirmarEliminar) return;
    if (confirmarEliminar.tipo === 'evento') {
      if (await eliminarEvento(confirmarEliminar.id)) setLocation('/eventos');
    } else {
      await eliminarSubtarea(evento.id, confirmarEliminar.id);
      setConfirmarEliminar(null);
    }
  };

  const pendientes = evento.subtareas.filter((t) => t.estado !== 'hecho'); const completadas = evento.subtareas.filter((t) => t.estado === 'hecho'); const porcentaje = calcularPorcentaje(evento);
  return <div><Link href='/eventos' className='detail-back'><ArrowLeft size={14} /> Todos los eventos</Link><div className='detail-head'><div><h1 className='detail-title'>{evento.nombre}</h1></div><div className='detail-score'><div className='score-number'>{porcentaje}%</div></div></div><div className='detail-actions'><button className='button button-primary' onClick={() => setMostrarAgregar((v) => !v)}><Plus size={15} /> {mostrarAgregar ? 'Cerrar formulario' : 'Agregar gestión'}</button><button className='button button-danger' onClick={eliminarEv}><Trash2 size={14} /> Eliminar evento</button></div>{confirmarEliminar && <ConfirmDialog titulo={confirmarEliminar.tipo === 'evento' ? '¿Eliminar evento?' : '¿Eliminar gestión?'} mensaje={'Esta acción eliminará ' + (confirmarEliminar.tipo === 'evento' ? 'el evento y todas sus gestiones' : 'la gestión y toda su información') + '. No se puede deshacer.'} onClose={() => setConfirmarEliminar(null)} onConfirm={procesarEliminacion} />}{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={async (t) => { if(await actualizarSubtarea(evento.id, t)) setTareaEditar(null); }} />}{mover && <ReprogramarDialog evento={evento} tarea={mover} onClose={() => setMover(null)} onSave={async (fecha, hora) => { if(await actualizarSubtarea(evento.id, { ...mover, fechaLimite: fecha, horaLimite: hora })) setMover(null); }} />}<div className='detail-layout'><section>{mostrarAgregar && <TaskEditor evento={evento} otras={evento.subtareas} onCancel={() => setMostrarAgregar(false)} onSave={async (t) => { const e = validarTarea(evento, t as Subtarea, evento.subtareas); if(e && Object.keys(e).length > 0) return false; if(await crearSubtarea(evento.id, t)) setMostrarAgregar(false); return true; }} />}{pendientes.length ? <div className='task-list'>{pendientes.map((t) => <FilaTarea key={t.id} tarea={t} eventoId={evento.id} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} onEditar={() => setTareaEditar(t)} onEliminar={() => eliminar(t)} />)}</div> : <EmptyState titulo='Plan despejado' copy='No hay gestiones pendientes.' />}{completadas.length > 0 && <div className='task-list'>{completadas.map((t) => <FilaTarea key={t.id} tarea={t} eventoId={evento.id} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} />)}</div>}</section></div></div>;
}"""
app_code = app_code.replace(detalle_evento_old, detalle_evento_new)

# 4. TaskEditor
task_editor_old = """function TaskEditor({ evento, tarea: tareaInicial, otras, onCancel, onSave }: { evento: Evento; tarea?: Subtarea; otras: Subtarea[]; onCancel: () => void; onSave: (tarea: Omit<Subtarea, 'id'>) => Promise<boolean> }) {
  const [tarea, setTarea] = useState<Omit<Subtarea, 'id'>>(tareaInicial ?? { titulo: '', categoria: 'otro', prioridad: 'media', estado: 'pendiente', fechaLimite: evento.fechaInicio, horaLimite: '18:00', horaInicio: '', estimacion: 1 }); const [error, setError] = useState('');
  const submit = async (e: FormEvent) => { e.preventDefault(); const problema = validarTarea(evento, tarea as Subtarea, otras); if (problema) { setError(problema); return; } await onSave({ ...tarea, estimacion: Number(tarea.estimacion) }); };
  return <form className='card edit-panel' onSubmit={submit}><div className='form-grid'><div className='field full'><label>Qué hay que hacer *</label><input value={tarea.titulo} onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })} autoFocus /></div><div className='field'><label>Fecha límite *</label><input type='date' max={evento.fechaInicio} value={tarea.fechaLimite} onChange={(e) => setTarea({ ...tarea, fechaLimite: e.target.value })} /></div><div className='field'><label>Hora límite *</label><input type='time' value={tarea.horaLimite} onChange={(e) => setTarea({ ...tarea, horaLimite: e.target.value })} /></div><div className='field'><label>Estimación (h) *</label><input type='number' min='0.25' step='0.25' value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: Number(e.target.value) })} /></div></div>{error && <div className='error-box'>{error}</div>}<div className='form-actions'><button type='button' className='button button-ghost' onClick={onCancel}>Cancelar</button><button type='submit' className='button button-primary'>Guardar gestión</button></div></form>;
}"""

task_editor_new = """function TaskEditor({ evento, tarea: tareaInicial, otras, onCancel, onSave }: { evento: Evento; tarea?: Subtarea; otras: Subtarea[]; onCancel: () => void; onSave: (tarea: Omit<Subtarea, 'id'>) => Promise<boolean> }) {
  const [tarea, setTarea] = useState<Omit<Subtarea, 'id'>>(tareaInicial ?? { titulo: '', categoria: 'otro', prioridad: 'media', estado: 'pendiente', fechaLimite: evento.fechaInicio, horaLimite: '18:00', horaInicio: '', estimacion: 1 }); const [error, setError] = useState<Record<string, string>>({});
  const submit = async (e: FormEvent) => { e.preventDefault(); const errs = validarTarea(evento, tarea as Subtarea, otras); if (Object.keys(errs).length > 0) { setError(errs); return; } await onSave({ ...tarea, estimacion: Number(tarea.estimacion) }); };
  return <form className='card edit-panel' onSubmit={submit} style={{ marginBottom: 16 }}><div className='form-grid'><div className='field full'><label>Qué hay que hacer *</label>{error.titulo && <div className='field-error'>{error.titulo}</div>}<input className={error.titulo ? 'error' : ''} value={tarea.titulo} onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })} autoFocus /></div><div className='field'><label>Fecha límite *</label>{error.fechaLimite && <div className='field-error'>{error.fechaLimite}</div>}<input type='date' className={error.fechaLimite ? 'error' : ''} max={evento.fechaInicio} value={tarea.fechaLimite} onChange={(e) => setTarea({ ...tarea, fechaLimite: e.target.value })} /></div><div className='field'><label>Hora límite *</label>{error.horaLimite && <div className='field-error'>{error.horaLimite}</div>}<input type='time' className={error.horaLimite ? 'error' : ''} value={tarea.horaLimite} onChange={(e) => setTarea({ ...tarea, horaLimite: e.target.value })} /></div><div className='field'><label>Estimación (h) *</label>{error.estimacion && <div className='field-error'>{error.estimacion}</div>}<input type='number' className={error.estimacion ? 'error' : ''} min='0.25' step='0.25' value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: Number(e.target.value) })} /></div></div>{error.general && <div className='error-box'>{error.general}</div>}<div className='form-actions'><button type='button' className='button button-ghost' onClick={onCancel}>Cancelar</button><button type='submit' className='button button-primary'>Guardar gestión</button></div></form>;
}"""
app_code = app_code.replace(task_editor_old, task_editor_new)

# 5. Replace validarDatosEvento and validarTarea to return Record<string, string>
app_code = app_code.replace('function validarDatosEvento(datos: FormEvento, tareas: BorradorTarea[]) {\n  if (!datos.nombre.trim()) return \'Ponle un nombre al evento.\';\n  if (!datos.fechaInicio || !datos.fechaFin) return \'Elige las fechas del evento.\';\n  if (datos.fechaFin < datos.fechaInicio) return \'La fecha final no puede ser anterior al inicio.\';\n  if (Number(datos.duracion) <= 0 || Number(datos.capacidadDiaria) <= 0) return \'La duración y el límite diario deben ser mayores que cero.\';\n  if (!datos.horaEvento) return \'Indica la hora del evento.\';\n  if (!tareas.length) return \'Agrega al menos una gestión al plan inicial.\';\n  if (tareas.some((t) => !t.titulo.trim() || !t.fechaLimite || Number(t.estimacion) <= 0)) return \'Cada gestión necesita título, plazo y una estimación mayor que cero.\';\n  if (tareas.some((t) => t.fechaLimite > datos.fechaInicio)) return \'Hay una gestión con plazo posterior al inicio del evento.\';\n  return \'\';\n}',
'''function validarDatosEvento(datos: FormEvento, tareas: BorradorTarea[]) {
  const e: Record<string, string> = {};
  if (!datos.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
  if (!datos.lugar.trim()) e.lugar = 'El lugar es obligatorio.';
  if (!datos.fechaInicio || !datos.fechaFin) { if(!datos.fechaInicio) e.fechaInicio = 'Elige una fecha.'; if(!datos.fechaFin) e.fechaFin = 'Elige una fecha.'; }
  else if (datos.fechaFin < datos.fechaInicio) e.fechaFin = 'Inválida.';
  if (Number(datos.duracion) <= 0) e.duracion = 'Mayor que cero.';
  if (Number(datos.capacidadDiaria) <= 0) e.capacidadDiaria = 'Mayor que cero.';
  if (!datos.horaEvento) e.horaEvento = 'Obligatoria.';
  if (!tareas.length) e.general = 'Agrega al menos una gestión.';
  return e;
}''')

app_code = app_code.replace('function validarTarea(evento: Evento, candidata: Subtarea, otras: Subtarea[]) {\n  if (!candidata.titulo.trim()) return \'Ponle un título a la gestión.\';\n  if (!candidata.fechaLimite || !candidata.horaLimite) return \'Elige fecha y hora límite.\';\n  if (candidata.estimacion <= 0) return \'La estimación debe ser mayor que cero horas.\';\n  if (combinarFechaHora(candidata.fechaLimite, candidata.horaLimite) > combinarFechaHora(evento.fechaInicio, evento.horaEvento)) return \'El plazo debe ser anterior al inicio del evento.\';\n  return \'\';\n}',
'''function validarTarea(evento: Evento, candidata: Subtarea, otras: Subtarea[]) {
  const e: Record<string, string> = {};
  if (!candidata.titulo.trim()) e.titulo = 'El título es obligatorio.';
  if (!candidata.fechaLimite) e.fechaLimite = 'Elige fecha.';
  if (!candidata.horaLimite) e.horaLimite = 'Elige hora.';
  if (candidata.estimacion <= 0) e.estimacion = 'Mayor que 0.';
  if (candidata.fechaLimite && candidata.horaLimite && combinarFechaHora(candidata.fechaLimite, candidata.horaLimite) > combinarFechaHora(evento.fechaInicio, evento.horaEvento)) e.fechaLimite = 'El plazo debe ser anterior al evento.';
  return e;
}''')

# 6. Update CrearEvento to use Record<string, string> instead of string for error
crear_evento_old_error = "const [error, setError] = useState('');\n  useEffect(() => { setTareas((actuales) => actuales.map((t) => ({ ...t, fechaLimite: t.fechaLimite || datos.fechaInicio }))); }, [datos.fechaInicio]);\n  const setCampo = (campo: keyof FormEvento, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));\n  const añadirTarea = () => { if (!nuevo.titulo.trim()) return; setTareas((ts) => [...ts, { ...nuevo, id: generarId('draft') }]); setNuevo(borradorInicial()); };\n  const submit = async (e: FormEvent) => {\n    e.preventDefault(); setError(''); const validacion = validarDatosEvento(datos, tareas); if (validacion) { setError(validacion); return; }"
crear_evento_new_error = "const [error, setError] = useState<Record<string, string>>({});\n  useEffect(() => { setTareas((actuales) => actuales.map((t) => ({ ...t, fechaLimite: t.fechaLimite || datos.fechaInicio }))); }, [datos.fechaInicio]);\n  const setCampo = (campo: keyof FormEvento, valor: string) => { setDatos((d) => ({ ...d, [campo]: valor })); setError(errs => ({ ...errs, [campo]: '' })); };\n  const añadirTarea = () => { if (!nuevo.titulo.trim()) return; setTareas((ts) => [...ts, { ...nuevo, id: generarId('draft') }]); setNuevo(borradorInicial()); };\n  const submit = async (e: FormEvent) => {\n    e.preventDefault(); setError({}); const validacion = validarDatosEvento(datos, tareas); if (Object.keys(validacion).length > 0) { setError(validacion); return; }"
app_code = app_code.replace(crear_evento_old_error, crear_evento_new_error)

# Let's do regex replacement on CrearEvento inputs to add error spans and classes
fields = ['nombre', 'tipo', 'lugar', 'fechaInicio', 'fechaFin', 'horaEvento', 'duracion', 'capacidadDiaria', 'notas']
for field in fields:
    old_input = f"<input value={{datos.{field}}}"
    new_input = f"{{error.{field} && <div className='field-error'>{{error.{field}}}</div>}}<input className={{error.{field} ? 'error' : ''}} value={{datos.{field}}}"
    app_code = app_code.replace(old_input, new_input)
    
    old_input_date = f"<input type='date' value={{datos.{field}}}"
    new_input_date = f"{{error.{field} && <div className='field-error'>{{error.{field}}}</div>}}<input type='date' className={{error.{field} ? 'error' : ''}} value={{datos.{field}}}"
    app_code = app_code.replace(old_input_date, new_input_date)
    
    old_input_time = f"<input type='time' value={{datos.{field}}}"
    new_input_time = f"{{error.{field} && <div className='field-error'>{{error.{field}}}</div>}}<input type='time' className={{error.{field} ? 'error' : ''}} value={{datos.{field}}}"
    app_code = app_code.replace(old_input_time, new_input_time)
    
    old_input_num = f"<input type='number' min='0.5' step='0.5' value={{datos.{field}}}"
    new_input_num = f"{{error.{field} && <div className='field-error'>{{error.{field}}}</div>}}<input type='number' className={{error.{field} ? 'error' : ''}} min='0.5' step='0.5' value={{datos.{field}}}"
    app_code = app_code.replace(old_input_num, new_input_num)
    
    old_input_num2 = f"<input type='number' min='1' step='0.5' value={{datos.{field}}}"
    new_input_num2 = f"{{error.{field} && <div className='field-error'>{{error.{field}}}</div>}}<input type='number' className={{error.{field} ? 'error' : ''}} min='1' step='0.5' value={{datos.{field}}}"
    app_code = app_code.replace(old_input_num2, new_input_num2)

app_code = app_code.replace("{error && <div className='error-box'>{error}</div>}", "{error.general && <div className='error-box'>{error.general}</div>}")

# ReprogramarDialog fix:
reprog_old = "const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora }, evento.subtareas.filter((t) => t.id !== tarea.id)); if (problema) { setError(problema); return; }"
reprog_new = "const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora }, evento.subtareas.filter((t) => t.id !== tarea.id)); if (Object.keys(problema).length > 0) { setError('Asegúrate de colocar fecha y hora.'); return; }"
app_code = app_code.replace(reprog_old, reprog_new)


with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_code)

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\index.css', 'w', encoding='utf-8') as f:
    f.write(css_code)

print('Updated successfully')
