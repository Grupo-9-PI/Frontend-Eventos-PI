import sys

file_path = r"C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\App.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update TaskEditor component to remove hardcoded margins and the edit-panel class
old_task_editor = "return <form className='card card-pad edit-panel' onSubmit={submit} style={{ marginBottom: 20 }}>"
new_task_editor = "return <form className='card card-pad' onSubmit={submit}>"
content = content.replace(old_task_editor, new_task_editor)

# 2. Update DetalleEvento to wrap TaskEditor in a div with the margin so it looks correct inline
old_inline_editor = "{mostrarAgregar && <TaskEditor evento={evento} onCancel={() => setMostrarAgregar(false)}"
new_inline_editor = "{mostrarAgregar && <div style={{ marginBottom: 22 }}><TaskEditor evento={evento} onCancel={() => setMostrarAgregar(false)}"
content = content.replace(old_inline_editor, new_inline_editor)

# And close the div wrapping it
old_inline_close = "setMostrarAgregar(false); return true; }} />}"
new_inline_close = "setMostrarAgregar(false); return true; }} /></div>}"
content = content.replace(old_inline_close, new_inline_close)

# 3. Update TaskEditorDialog to remove the buggy .dialog wrapper and use a plain centered container
old_dialog = "<div className='dialog' style={{ padding: '0', background: 'transparent', boxShadow: 'none' }} onMouseDown={(e) => e.stopPropagation()}>"
new_dialog = "<div style={{ width: 'min(560px, 100%)' }} onMouseDown={(e) => e.stopPropagation()}>"
content = content.replace(old_dialog, new_dialog)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Changes applied successfully!")
