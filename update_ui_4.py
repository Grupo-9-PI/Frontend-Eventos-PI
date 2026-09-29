import re

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    app_code = f.read()

# Revert TaskEditor to be inline in DetalleEvento and NOT a dialog.
# Find the line that renders TaskEditorDialog for mostrarAgregar
old_dialog_render = """{mostrarAgregar && <TaskEditorDialog evento={evento} onClose={() => setMostrarAgregar(false)} onSave={async (t) => { if(await crearSubtarea(evento.id, t)) setMostrarAgregar(false); }} />}{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={async (t) => { if(await actualizarSubtarea(evento.id, t)) setTareaEditar(null); }} />}"""
new_dialog_render = """{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={async (t) => { if(await actualizarSubtarea(evento.id, t)) setTareaEditar(null); }} />}"""
app_code = app_code.replace(old_dialog_render, new_dialog_render)

# Re-insert the inline TaskEditor in the detail-layout section
old_section_start = """<div className='detail-layout'><section>{pendientes.length ?"""
new_section_start = """<div className='detail-layout'><section>{mostrarAgregar && <TaskEditor evento={evento} otras={evento.subtareas} onCancel={() => setMostrarAgregar(false)} onSave={async (t) => { const e = validarTarea(evento, t as Subtarea, evento.subtareas); if (e && Object.keys(e).length > 0) return false; if (await crearSubtarea(evento.id, t)) setMostrarAgregar(false); return true; }} />}{pendientes.length ?"""
app_code = app_code.replace(old_section_start, new_section_start)

# Add card-pad to TaskEditor so it has padding!
old_form_tag = """<form className='card edit-panel' onSubmit={submit} style={{ marginBottom: 16 }}>"""
new_form_tag = """<form className='card card-pad edit-panel' onSubmit={submit} style={{ marginBottom: 20 }}>"""
app_code = app_code.replace(old_form_tag, new_form_tag)

# Let's ensure the ConfirmDialog buttons look nice.
# Right now they are: flex: 1, padding: 11px, border-radius: 8
# I'll just keep them, they should look good. But I'll make sure there is no transparent background weirdness.
# Actually I'll leave ConfirmDialog as is, the user didn't complain about my previous edit to it, 
# just that "estiliza mas los botones... como en la imagen de referencia". Wait, the user DID complain "y estiliza mas los botones de confirmacion".
# They probably didn't see the new modal because they got stuck looking at the ugly TaskEditor. 
# But just in case, I will make the confirm dialog buttons even closer to the reference.
# The reference (Image 3) had a red button "Desistir" and a secondary button "Volver".

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_code)

print("Updated successfully")
