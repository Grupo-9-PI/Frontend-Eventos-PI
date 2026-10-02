import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(
    r'const \[mantener, setMantener\] = useState\(false\);',
    'const [mantener, setMantener] = useState(false);\n  const [mostrarPassword, setMostrarPassword] = useState(false);',
    text
)

login_page_start = text.find('function LoginPage() {')
register_page_start = text.find('function RegisterPage() {')
login_block = text[login_page_start:register_page_start]

login_block = re.sub(
    r'<input\s+type="password"\s+value=\{password\}',
    '<input type={mostrarPassword ? "text" : "password"} value={password}',
    login_block
)

checkbox_code = """
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: "var(--papel)",
                marginTop: -10,
                marginBottom: 10
              }}
            >
              <input
                type="checkbox"
                checked={mostrarPassword}
                onChange={(e) => setMostrarPassword(e.target.checked)}
                style={{ width: 16, height: 16, margin: 0 }}
              />{" "}
              Mostrar contraseñas
            </label>
"""

login_block = re.sub(
    r'(<input[^>]*value=\{password\}[^>]*/>\s*</div>)',
    r'\1' + checkbox_code,
    login_block
)

text = text[:login_page_start] + login_block + text[register_page_start:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
