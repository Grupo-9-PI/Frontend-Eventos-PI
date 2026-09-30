import re

with open("src/index.css", "r", encoding="utf-8") as f:
    css = f.read()

# Add .req for mandatory stars
if ".req {" not in css:
    css += "\n.req { color: #d1512f; margin-left: 3px; }\n"

with open("src/index.css", "w", encoding="utf-8") as f:
    f.write(css)

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports to include time functions
if "hoursToTime" not in content:
    content = content.replace("combinarFechaHora,", "combinarFechaHora, hoursToTime, timeToHours,")

# 2. Update FormEvento and borradorInicial for time formatted strings
content = content.replace("duracion: '4'", "duracion: '04:00'")
content = content.replace("estimacion: '1'", "estimacion: '01:00'")

# Remove capacidadDiaria completely from state initialization and typing
content = re.sub(r", capacidadDiaria: string", "", content)
content = re.sub(r", capacidadDiaria: '6'", "", content)

# 3. Update CrearEvento
# Change the FormEvento interface extraction in the payload to use timeToHours
content = content.replace("duracion: Number(datos.duracion)", "duracion: timeToHours(datos.duracion)")
content = content.replace("estimacion: Number(t.estimacion)", "estimacion: timeToHours(t.estimacion)")

# In submit payload, hardcode capacidadDiaria since it's removed from form
content = content.replace("capacidadDiaria: Number(datos.capacidadDiaria)", "capacidadDiaria: 24")

# Update validation
content = re.sub(r"if \(Number\(datos\.capacidadDiaria\) <= 0\) [^\n]+", "", content)
# Validate duracion differently
content = content.replace("if (Number(datos.duracion) <= 0) e.duracion = 'Mayor que cero.';", "if (timeToHours(datos.duracion) <= 0) e.duracion = 'Requerida.';")

# Update "Plan inicial" optional logic
# Instead of hardcoded array initialization, make it empty
content = content.replace("useState<BorradorTarea[]>([borradorInicial()]);", "useState<BorradorTarea[]>([]);")

# Add showPlan state
if "const [mostrarPlan, setMostrarPlan] = useState(false);" not in content:
    content = content.replace("function CrearEvento() {", "function CrearEvento() {\n    const [mostrarPlan, setMostrarPlan] = useState(false);")

# Wrap the 'Plan inicial' section
old_plan_section = "<section className='form-section'><h2 className='form-section-title'>Plan inicial</h2>"
new_plan_section = "{!mostrarPlan ? <section className='form-section' style={{ textAlign: 'center', padding: '40px 20px' }}><button type='button' className='button button-secondary' onClick={() => setMostrarPlan(true)}>+ Agregar un plan inicial de gestiones (Opcional)</button></section> : <section className='form-section'><h2 className='form-section-title'>Plan inicial</h2>"
content = content.replace(old_plan_section, new_plan_section)

# Close the wrapper
old_plan_close = "</div></section>{error.general && <div className='error-box'>{error.general}</div>}"
new_plan_close = "</div></section>}{error.general && <div className='error-box'>{error.general}</div>}"
content = content.replace(old_plan_close, new_plan_close)

# 4. Form inputs format and required stars
# Replace all " *" with " <span className='req'>*</span>"
content = re.sub(r"<label>([A-Za-zñÑáéíóúÁÉÍÓÚ\s]+)\s?\*</label>", r"<label>\1 <span className='req'>*</span></label>", content)

# Modify "Tipo" to be a dropdown + optional custom input
old_tipo = "<div className='field'><label>Tipo</label>{error.tipo && <div className='field-error'>{error.tipo}</div>}<input className={error.tipo ? 'error' : ''} value={datos.tipo} onChange={(e) => setCampo('tipo', e.target.value)} /></div>"
new_tipo = """<div className='field'><label>Tipo</label>{error.tipo && <div className='field-error'>{error.tipo}</div>}<select className={error.tipo ? 'error' : ''} value={['Lanzamiento', 'Fiesta', 'Taller', 'Reunión', 'Conferencia', ''].includes(datos.tipo) ? datos.tipo : 'Otro'} onChange={(e) => setCampo('tipo', e.target.value)}><option value='Lanzamiento'>Lanzamiento</option><option value='Fiesta'>Fiesta</option><option value='Taller'>Taller</option><option value='Reunión'>Reunión</option><option value='Conferencia'>Conferencia</option><option value='Otro'>Otro...</option></select>{(!['Lanzamiento', 'Fiesta', 'Taller', 'Reunión', 'Conferencia', ''].includes(datos.tipo) || datos.tipo === 'Otro') && <input style={{ marginTop: 8 }} placeholder='Escribe el tipo...' value={datos.tipo === 'Otro' ? '' : datos.tipo} onChange={(e) => setCampo('tipo', e.target.value)} />}</div>"""
content = content.replace(old_tipo, new_tipo)

# Remove "Límite diario" input field
limite_diario_regex = r"<div className='field'><label>Límite diario[^<]+</label>\{error\.capacidadDiaria[^<]+</div>\}<input type='number'[^>]+/></div>"
content = re.sub(limite_diario_regex, "", content)

# Change (h) to (horas)
content = content.replace("(h)", "(horas)")
content = content.replace("Est. (horas)", "Estimación (horas)")

# Change type='number' to type='time' for Duracion and Estimacion
content = content.replace("<input type='number' className={error.duracion ? 'error' : ''} min='0.5' step='0.5' value={datos.duracion} onChange={(e) => setCampo('duracion', e.target.value)} />", "<input type='time' className={error.duracion ? 'error' : ''} value={datos.duracion} onChange={(e) => setCampo('duracion', e.target.value)} />")
content = content.replace("<input type='number' min='0.25' step='0.25' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} />", "<input type='time' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} />")

# 5. TaskEditor component updates (for creating/editing tasks in the modal)
# It uses state for Omit<Subtarea, 'id'>, which has estimacion as number.
# We need to map it in the local state or UI to string.
# Since it's local state, we can change it to store string and convert it on submit!
old_task_editor_state = "const [tarea, setTarea] = useState<Omit<Subtarea, 'id'>>(tareaInicial ?? { titulo: '', categoria: 'otro', prioridad: 'media', estado: 'pendiente', fechaLimite: evento.fechaInicio, horaLimite: '18:00', horaInicio: '', estimacion: 1 });"
new_task_editor_state = "const [tarea, setTarea] = useState(tareaInicial ? { ...tareaInicial, estimacion: hoursToTime(tareaInicial.estimacion) } : { titulo: '', categoria: 'otro', prioridad: 'media', estado: 'pendiente', fechaLimite: evento.fechaInicio, horaLimite: '18:00', horaInicio: '', estimacion: '01:00' });"
content = content.replace(old_task_editor_state, new_task_editor_state)

# The taskEditor submit
old_task_editor_submit = "await onSave({ ...tarea, estimacion: Number(tarea.estimacion) });"
new_task_editor_submit = "await onSave({ ...tarea, estimacion: timeToHours(tarea.estimacion as string) });"
content = content.replace(old_task_editor_submit, new_task_editor_submit)

# The TaskEditor input for estimacion
old_task_editor_input = "<input type='number' className={error.estimacion ? 'error' : ''} min='0.25' step='0.25' value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: Number(e.target.value) })} />"
new_task_editor_input = "<input type='time' className={error.estimacion ? 'error' : ''} value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: e.target.value })} />"
content = content.replace(old_task_editor_input, new_task_editor_input)

# Update validations for subtarea
# "validarTarea(evento: Evento, tarea: Subtarea)"
old_val_tarea = "if (tarea.estimacion <= 0) e.estimacion = 'Mayor a cero.';"
new_val_tarea = "if (typeof tarea.estimacion === 'string' ? timeToHours(tarea.estimacion) <= 0 : tarea.estimacion <= 0) e.estimacion = 'Requerida.';"
content = content.replace(old_val_tarea, new_val_tarea)

# 6. Display of "X h estimadas" to "00:00 horas"
# FilaTarea uses it
content = content.replace("{tarea.estimacion} h estimadas", "{hoursToTime(tarea.estimacion)} horas estimadas")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("App.tsx and index.css updated successfully!")
