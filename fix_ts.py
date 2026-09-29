import os

app_path = r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    app_code = f.read()

# 2. Fix eId unused in eliminarSubtarea
app_code = app_code.replace("const eliminarSubtarea = async (eId: string, tId: string)", "const eliminarSubtarea = async (_eId: string, tId: string)")

# 3. Fix FilaTarea eventoId unused
app_code = app_code.replace("function FilaTarea({ tarea, eventoId, mostrarEvento, onToggle, onReprogramar, onEditar, onEliminar }: { tarea: Subtarea; eventoId: string;", "function FilaTarea({ tarea, mostrarEvento, onToggle, onReprogramar, onEditar, onEliminar }: { tarea: Subtarea;")
app_code = app_code.replace("eventoId={t.eventoId} ", "")
app_code = app_code.replace("eventoId={evento.id} ", "")

# 4. Fix validarTarea otras unused
app_code = app_code.replace("function validarTarea(evento: Evento, candidata: Subtarea, otras: Subtarea[])", "function validarTarea(evento: Evento, candidata: Subtarea)")
app_code = app_code.replace("const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora }, evento.subtareas.filter((t) => t.id !== tareaId));", "const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora });")
app_code = app_code.replace("const validacion = validarDatosEvento(datos, tareas);", "const validacion = validarDatosEvento(datos, tareas);") # Keep
app_code = app_code.replace("const errs = validarTarea(evento, tarea as Subtarea, otras);", "const errs = validarTarea(evento, tarea as Subtarea);")
app_code = app_code.replace("const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora }, evento.subtareas.filter((t) => t.id !== tarea.id));", "const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora });")
app_code = app_code.replace("const e = validarTarea(evento, t as Subtarea, evento.subtareas);", "const e = validarTarea(evento, t as Subtarea);")

# 5. DetalleEvento actualizarEvento unused
app_code = app_code.replace("const { id } = useParams<{ id: string }>(); const { eventos, actualizarSubtarea, eliminarSubtarea, eliminarEvento, crearSubtarea, actualizarEvento } = useStore();", "const { id } = useParams<{ id: string }>(); const { eventos, actualizarSubtarea, eliminarSubtarea, eliminarEvento, crearSubtarea } = useStore();")

# 6. DetalleEvento editar, setEditar unused
app_code = app_code.replace("const [mostrarAgregar, setMostrarAgregar] = useState(false); const [editar, setEditar] = useState(false);", "const [mostrarAgregar, setMostrarAgregar] = useState(false);")

# 7. ReprogramarDialog error.general issue
app_code = app_code.replace("{error.general && <div className='error-box'>{error.general}</div>}</div><div className='form-actions'><button type='button' className='button button-ghost' onClick={onClose}>Cancelar</button><button type='submit' className='button button-primary'>Confirmar</button></div>", "{error && <div className='error-box'>{error}</div>}</div><div className='form-actions'><button type='button' className='button button-ghost' onClick={onClose}>Cancelar</button><button type='submit' className='button button-primary'>Confirmar</button></div>")

# 8. Unused variables in TaskEditorDialog
app_code = app_code.replace("TaskEditor evento={evento} tarea={tarea} otras={tarea ? evento.subtareas.filter((t) => t.id !== tarea.id) : evento.subtareas}", "TaskEditor evento={evento} tarea={tarea} otras={[]}")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app_code)


tsconfig_path = r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\tsconfig.json'
with open(tsconfig_path, 'r', encoding='utf-8') as f:
    tsconfig = f.read()
if '"types": ["vite/client"]' not in tsconfig and '"types":' in tsconfig:
    tsconfig = tsconfig.replace('"types": [', '"types": ["vite/client", ')
elif '"compilerOptions": {' in tsconfig and '"types"' not in tsconfig:
    tsconfig = tsconfig.replace('"compilerOptions": {', '"compilerOptions": {\n    "types": ["vite/client"],')
with open(tsconfig_path, 'w', encoding='utf-8') as f:
    f.write(tsconfig)

main_path = r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\main.tsx'
with open(main_path, 'r', encoding='utf-8') as f:
    main_code = f.read()
import re
main_code = re.sub(r'onCaughtError:\s*\([^)]+\)\s*=>\s*\{[^}]+\},?', '', main_code)
main_code = re.sub(r'onUncaughtError:\s*\([^)]+\)\s*=>\s*\{[^}]+\},?', '', main_code)
main_code = main_code.replace("createRoot(document.getElementById('root')!, {\n  \n})", "createRoot(document.getElementById('root')!)")
main_code = main_code.replace("createRoot(document.getElementById('root')!, {})", "createRoot(document.getElementById('root')!)")
with open(main_path, 'w', encoding='utf-8') as f:
    f.write(main_code)

print("Done")
