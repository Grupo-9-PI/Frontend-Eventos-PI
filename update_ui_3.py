import re

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    app_code = f.read()

# 1. Update TaskEditorDialog
dialog_editor_old = """function TaskEditorDialog({ evento, tarea, onClose, onSave }: { evento: Evento; tarea: Subtarea; onClose: () => void; onSave: (t: Subtarea) => void }) {
  return <div className='dialog-backdrop' onMouseDown={onClose}><div className='dialog' onMouseDown={(e) => e.stopPropagation()}><TaskEditor evento={evento} tarea={tarea} otras={evento.subtareas.filter((t) => t.id !== tarea.id)} onCancel={onClose} onSave={async (t) => { onSave({ ...t, id: tarea.id }); return true; }} /></div></div>;
}"""

dialog_editor_new = """function TaskEditorDialog({ evento, tarea, onClose, onSave }: { evento: Evento; tarea?: Subtarea; onClose: () => void; onSave: (t: any) => Promise<void> }) {
  return <div className='dialog-backdrop' onMouseDown={onClose}><div className='dialog' style={{ padding: '0', background: 'transparent', boxShadow: 'none' }} onMouseDown={(e) => e.stopPropagation()}><TaskEditor evento={evento} tarea={tarea} otras={tarea ? evento.subtareas.filter((t) => t.id !== tarea.id) : evento.subtareas} onCancel={onClose} onSave={async (t) => { await onSave(tarea ? { ...t, id: tarea.id } : t); return true; }} /></div></div>;
}"""
app_code = app_code.replace(dialog_editor_old, dialog_editor_new)

# 2. Update DetalleEvento rendering of TaskEditor
detalle_evento_task_old = """{mostrarAgregar && <TaskEditor evento={evento} otras={evento.subtareas} onCancel={() => setMostrarAgregar(false)} onSave={async (t) => { const e = validarTarea(evento, t as Subtarea, evento.subtareas); if(e && Object.keys(e).length > 0) return false; if(await crearSubtarea(evento.id, t)) setMostrarAgregar(false); return true; }} />}"""
detalle_evento_task_new = """"""
app_code = app_code.replace(detalle_evento_task_old, detalle_evento_task_new)

# Insert the TaskEditorDialog for adding tasks where the other dialogs are:
dialog_render_old = """{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={async (t) => { if(await actualizarSubtarea(evento.id, t)) setTareaEditar(null); }} />}"""
dialog_render_new = """{mostrarAgregar && <TaskEditorDialog evento={evento} onClose={() => setMostrarAgregar(false)} onSave={async (t) => { if(await crearSubtarea(evento.id, t)) setMostrarAgregar(false); }} />}{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={async (t) => { if(await actualizarSubtarea(evento.id, t)) setTareaEditar(null); }} />}"""
app_code = app_code.replace(dialog_render_old, dialog_render_new)

# 3. Update ConfirmDialog
confirm_old = """function ConfirmDialog({ titulo, mensaje, onClose, onConfirm }: { titulo: string; mensaje: string; onClose: () => void; onConfirm: () => void }) {
  return <div className='dialog-backdrop' onMouseDown={onClose}><div className='dialog' style={{ padding: '26px 24px 20px', maxWidth: 400 }} onMouseDown={(e) => e.stopPropagation()}><div className='dialog-body' style={{ textAlign: 'center' }}><h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 600, color: '#fff' }}>{titulo}</h3><p style={{ color: 'var(--apagado)', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>{mensaje}</p></div><div className='form-actions' style={{ marginTop: 8, justifyContent: 'center', gap: 16 }}><button type='button' className='button button-ghost' style={{ background: '#2c2c2c', borderColor: '#444', color: '#fff', padding: '0 24px' }} onClick={onClose}>Cancelar</button><button type='button' className='button button-danger' style={{ background: '#d1512f', color: '#fff', padding: '0 24px' }} onClick={onConfirm}>Eliminar</button></div></div></div>;
}"""

confirm_new = """function ConfirmDialog({ titulo, mensaje, onClose, onConfirm }: { titulo: string; mensaje: string; onClose: () => void; onConfirm: () => void }) {
  return <div className='dialog-backdrop' onMouseDown={onClose}><div className='dialog' style={{ padding: '32px 28px', maxWidth: 420, borderRadius: 12 }} onMouseDown={(e) => e.stopPropagation()}><div className='dialog-body' style={{ textAlign: 'center' }}><h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600, color: '#fff' }}>{titulo}</h3><p style={{ color: '#b0b0b0', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>{mensaje}</p></div><div className='form-actions' style={{ marginTop: 0, display: 'flex', gap: 12, justifyContent: 'center' }}><button type='button' className='button' style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #555', color: '#e0e0e0', fontWeight: 500, borderRadius: 8 }} onClick={onClose}>Cancelar</button><button type='button' className='button' style={{ flex: 1, padding: '11px', background: '#d33833', border: '1px solid #d33833', color: '#fff', fontWeight: 500, borderRadius: 8 }} onClick={onConfirm}>Eliminar</button></div></div></div>;
}"""
app_code = app_code.replace(confirm_old, confirm_new)


with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_code)

print('Updated successfully')
