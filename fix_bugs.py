import re

# Fix TS syntax error
with open("src/lib/repositorioEventos.ts", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("m %% 60;", "m % 60;")

with open("src/lib/repositorioEventos.ts", "w", encoding="utf-8") as f:
    f.write(content)

# Fix remaining App.tsx issues
with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 1. Remove Límite diario exactly
old_limite = "<div className='field'><label>Límite diario (horas) *</label>{error.capacidadDiaria && <div className='field-error'>{error.capacidadDiaria}</div>}<input type='number' className={error.capacidadDiaria ? 'error' : ''} min='1' step='0.5' value={datos.capacidadDiaria} onChange={(e) => setCampo('capacidadDiaria', e.target.value)} /></div>"
app = app.replace(old_limite, "")

# 2. Fix the * for Duración
app = app.replace("<label>Duración (horas) *</label>", "<label>Duración (horas) <span className='req'>*</span></label>")

# 3. Fix the * for Estimación in the modal
app = app.replace("<label>Estimación (horas) *</label>", "<label>Estimación (horas) <span className='req'>*</span></label>")

# 4. Check for any other remaining literal asterisks (like in the task builder, but that's not required)
# Wait, let's verify if there are any other `*` in labels.

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Fixed!")
