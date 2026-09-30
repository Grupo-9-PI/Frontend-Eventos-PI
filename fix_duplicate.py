import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# The first instance of aplicarPlanPredefinido is correct (inside CrearEvento).
# The second instance is inside TaskEditor, let's remove it.
# It starts with "    const aplicarPlanPredefinido = (tipoPlan: string) => {"
# and ends right before "    const submit = async (e: FormEvent) => { e.preventDefault(); const errs = validarTarea"

regex = r"    const aplicarPlanPredefinido = \(tipoPlan: string\) => \{[^}]+\}[^}]+setTareas\(tareasNuevas\);\n    };\n(?=\s*const submit = async \(e: FormEvent\) => \{\s*e\.preventDefault\(\);\s*const errs = validarTarea)"

app = re.sub(regex, "", app)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(app)

print("Fixed duplicate injection!")
