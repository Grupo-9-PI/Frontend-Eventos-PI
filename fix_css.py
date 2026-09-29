import os

file_path = r"C:\Users\santi\OneDrive\Desktop\Organizador-de-Eventos-Frontend\src\index.css"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update .form-card
old_form_card = ".form-card { max-width: 840px; }"
new_form_card = ".form-card { max-width: 100%; }"
content = content.replace(old_form_card, new_form_card)

# 2. Update .detail-layout
old_detail_layout = ".detail-layout { display: grid; grid-template-columns: minmax(0,1fr) 280px; gap: 25px; align-items: start; }"
new_detail_layout = ".detail-layout { display: grid; grid-template-columns: 1fr; gap: 25px; align-items: start; }"
content = content.replace(old_detail_layout, new_detail_layout)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("index.css updated successfully!")
