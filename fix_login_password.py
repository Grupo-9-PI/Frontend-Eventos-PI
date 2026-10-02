import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app_tsx = f.read()

# 1. Update state
old_state = 'const [mantener, setMantener] = useState(false);'
new_state = 'const [mantener, setMantener] = useState(false);\n  const [mostrarPassword, setMostrarPassword] = useState(false);'
app_tsx = app_tsx.replace(old_state, new_state)

# 2. Update password input type in LoginPage
login_block_start = app_tsx.find('function LoginPage() {')
register_block_start = app_tsx.find('function RegisterPage() {')

login_block = app_tsx[login_block_start:register_block_start]

old_password_input = '<input type="password" required placeholder="•" />'
new_password_input = '<input type={mostrarPassword ? "text" : "password"} required placeholder="•" />'
login_block = login_block.replace(old_password_input, new_password_input)

# 3. Add the checkbox inside the LoginPage. We'll put it right under the password input
checkbox_html = """
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: "var(--papel)",
                marginTop: -10,
              }}
            >
              <input
                type="checkbox"
                checked={mostrarPassword}
                onChange={(e) => setMostrarPassword(e.target.checked)}
                style={{ width: 16, height: 16, margin: 0 }}
              />{" "}
              Mostrar contraseña
            </label>"""

# Find where the `mantener sesión` label starts, and insert it BEFORE that
mantener_label_idx = login_block.find('<label\n              style={{\n                display: "flex",\n                alignItems: "center",\n                gap: 8,\n                cursor: "pointer",\n                fontSize: 13,\n                color: "var(--papel)",\n              }}\n            >\n              <input\n                type="checkbox"\n                checked={mantener}')

# fallback if the exact formatting is different
if mantener_label_idx == -1:
    mantener_label_idx = login_block.find('<label') # This might be the email label! Let's be more specific
    # Instead, let's just insert it after the password input field's closing tag
    
if "Mantener sesi" in login_block:
    login_block = login_block.replace(
        '<label', 
        checkbox_html + '\n            <label', 
        1 # oops, that would replace the email label!
    )

# Let's do it safer:
login_block = login_block.replace(
    new_password_input + '\n            </div>',
    new_password_input + '\n            </div>' + checkbox_html
)


app_tsx = app_tsx[:login_block_start] + login_block + app_tsx[register_block_start:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_tsx)
