import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 1. Fix FormEvento interface
# If it has "capacidadDiaria" anywhere in FormEvento definition, remove it
app = re.sub(r"; capacidadDiaria:\s*string", "", app)

# 2. Fix TaskEditor validation casting
app = app.replace("validarTarea(evento, tarea as Subtarea);", "validarTarea(evento, tarea as any as Subtarea);")

# 3. Fix TaskEditor state TS inferences
old_state = "prioridad: 'media', estado: 'pendiente'"
new_state = "prioridad: 'media' as Prioridad, estado: 'pendiente' as EstadoSubtarea"
app = app.replace(old_state, new_state)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Fixed TS errors")
