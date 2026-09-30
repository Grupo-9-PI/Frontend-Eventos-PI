import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# 21: Add confirmation to submit in CrearEvento
if 'if (!window.confirm("¿Confirmas la creación de este evento' not in app:
    app = app.replace(
        "const id = await crearEventoCompleto(eventoPayload, tareasPayload);",
        'if (!window.confirm("¿Confirmas la creación de este evento y su plan de gestiones?")) return;\n    const id = await crearEventoCompleto(eventoPayload, tareasPayload);'
    )

# 21: Add confirmation to delete event in DetalleEvento
if "if (!window.confirm('¿Seguro que deseas eliminar esta gestión?')) return;" not in app:
    app = app.replace(
        "await updateSubtarea(evento.id, t.id, { estado: \"eliminado\" });",
        "if (!window.confirm('¿Seguro que deseas eliminar esta gestión?')) return;\n      await updateSubtarea(evento.id, t.id, { estado: \"eliminado\" });"
    )

# 23: Remove "Crea el primero."
app = app.replace('copy="Crea el primero."', 'copy=""')
app = app.replace("copy='Crea el primero.'", 'copy=""')

# 22: Fases filters:
app = app.replace(
    """<select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="todos">Todos los eventos</option>
          </select>""",
    """<select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="pasados">Pasados</option>
            <option value="cancelados">Cancelados</option>
            <option value="retrasados">Retrasados</option>
            <option value="todos">Todos los eventos</option>
          </select>"""
)

# Replace filter logic
old_filter = """const lista = eventos
      .filter(
        (e) =>
          filtro === "todos" ||
          diferenciaDias(hoyISO(), e.fechaInicio) >= 0 ||
          e.subtareas.some((t) => t.estado !== "hecho"),
      )
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));"""
new_filter = """const lista = eventos
      .filter((e) => {
        if (filtro === "todos") return true;
        const isActivo = diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.subtareas.some((t) => t.estado !== "hecho");
        const isPasado = diferenciaDias(hoyISO(), e.fechaInicio) < 0 && e.subtareas.every((t) => t.estado === "hecho");
        if (filtro === "activos") return isActivo;
        if (filtro === "pasados") return isPasado;
        if (filtro === "cancelados") return false;
        if (filtro === "retrasados") return false;
        return true;
      })
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));"""

if 'if (filtro === "todos") return true;' not in app:
    app = app.replace(old_filter, new_filter)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Applied remaining refactors")
