import os

file_path = r"C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\index.css"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Expand max-widths
content = content.replace("max-width: 650px;", "max-width: 100%;")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("CSS updated again!")
