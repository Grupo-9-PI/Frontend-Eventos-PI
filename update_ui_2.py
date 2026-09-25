import re

with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    app_code = f.read()

# 1. Update TaskEditor grid to 3 columns and full width for Title
task_editor_old = """<form className='card edit-panel' onSubmit={submit} style={{ marginBottom: 16 }}><div className='form-grid'><div className='field full'><label>Qué hay que hacer *</label>"""
task_editor_new = """<form className='card edit-panel' onSubmit={submit} style={{ marginBottom: 16 }}><div className='form-grid' style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}><div className='field' style={{ gridColumn: '1 / -1' }}><label>Qué hay que hacer *</label>"""
app_code = app_code.replace(task_editor_old, task_editor_new)

# 2. Update ConfirmDialog buttons and layout
dialog_old = """<div className='form-actions' style={{ marginTop: 0 }}><button type='button' className='button button-ghost' onClick={onClose}>Cancelar</button><button type='button' className='button button-danger' onClick={onConfirm}>Eliminar</button></div>"""
dialog_new = """<div className='form-actions' style={{ marginTop: 8, justifyContent: 'center', gap: 16 }}><button type='button' className='button button-ghost' style={{ background: '#2c2c2c', borderColor: '#444', color: '#fff', padding: '0 24px' }} onClick={onClose}>Cancelar</button><button type='button' className='button button-danger' style={{ background: '#d1512f', color: '#fff', padding: '0 24px' }} onClick={onConfirm}>Eliminar</button></div>"""
app_code = app_code.replace(dialog_old, dialog_new)

# Also let's center the text in the dialog to make it look nicer
dialog_body_old = """<div className='dialog-body'><h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 600 }}>{titulo}</h3><p style={{ color: 'var(--apagado)', fontSize: '13.5px', marginBottom: '28px', lineHeight: 1.5 }}>{mensaje}</p></div>"""
dialog_body_new = """<div className='dialog-body' style={{ textAlign: 'center' }}><h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 600, color: '#fff' }}>{titulo}</h3><p style={{ color: 'var(--apagado)', fontSize: '14px', marginBottom: '28px', lineHeight: 1.5 }}>{mensaje}</p></div>"""
app_code = app_code.replace(dialog_body_old, dialog_body_new)


with open(r'C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_code)

print('Updated successfully')
