import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    app = f.read()

# Find the indices of "const aplicarPlanPredefinido"
parts = app.split("    const aplicarPlanPredefinido = (tipoPlan: string) => {")

if len(parts) == 3:
    # We have exactly two instances. We want to remove the second one.
    # The second one starts at parts[2] and goes until the next "const submit"
    sub_parts = parts[2].split("const submit = async (e: FormEvent) => {", 1)
    
    # Reassemble:
    app = parts[0] + "    const aplicarPlanPredefinido = (tipoPlan: string) => {" + parts[1] + "const submit = async (e: FormEvent) => {" + sub_parts[1]
    
    with open("src/App.tsx", "w", encoding="utf-8") as f:
        f.write(app)
    print("Fixed duplicate!")
else:
    print(f"Found {len(parts)} parts instead of 3")
