import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Fix añadirTarea
app = re.sub(
    r"const añ?adirTarea = \(\) => \{\s*if \(\!nuevo\.titulo\.trim\(\)\) return;\s*setTareas\(\(ts\) => \[\.\.\.ts, \{ \.\.\.nuevo, id: generarId\(\"draft\"\) \}\]\);\s*setNuevo\(borradorInicial\(\)\);\s*\};",
    """const añadirTarea = () => {
    const errs: Record<string, string> = {};
    if (!nuevo.titulo.trim()) errs.titulo = 'Obligatorio.';
    if (!nuevo.estimacion.trim() || nuevo.estimacion === '00:00') errs.estimacion = 'Obligatorio.';
    if (Object.keys(errs).length > 0) {
      setErrorNuevo(errs);
      return;
    }
    setErrorNuevo({});
    setTareas((ts) => [...ts, { ...nuevo, id: generarId("draft") }]);
    setNuevo(borradorInicial());
  };""",
    app
)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Fixed double quotes!")
