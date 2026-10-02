import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app = f.read()

# 1. Check if LoginPage exists, if not, add it
if 'function LoginPage' not in app:
    login_components = """
import { useAuth } from './Root';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loggedIn } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!loggedIn) {
      setLocation("/login");
    }
  }, [loggedIn, setLocation]);

  if (!loggedIn) return null;
  return <>{children}</>;
}

function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [mantener, setMantener] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--tinta)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ width: 48, height: 48, background: 'var(--azul)', color: 'var(--papel)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 18, fontWeight: 700, fontFamily: 'var(--fuente-titulo)' }}>EO</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--papel)', marginBottom: 8, fontFamily: 'var(--fuente-titulo)' }}>Bienvenido de nuevo</h1>
          <p style={{ color: 'var(--apagado)', fontSize: 14 }}>Inicia sesión para gestionar tus eventos</p>
        </div>
        <div className="card" style={{ padding: '30px', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: 'var(--panel)' }}>
          <form onSubmit={(e) => { e.preventDefault(); login(mantener); setLocation('/hoy'); }} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="field">
              <label style={{ color: 'var(--papel)' }}>Correo electrónico</label>
              <input type="email" required placeholder="tu@correo.com" />
            </div>
            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <label style={{ color: 'var(--papel)' }}>Contraseña</label>
                 <a href="#" style={{ fontSize: 12, color: 'var(--azul-claro)' }}>¿Olvidaste tu contraseña?</a>
              </div>
              <input type="password" required placeholder="••••••••" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--papel)' }}>
              <input type="checkbox" checked={mantener} onChange={e => setMantener(e.target.checked)} style={{ width: 16, height: 16, margin: 0 }} /> Mantener sesión iniciada
            </label>
            <button type="submit" className="button button-primary" style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 10 }}>Ingresar</button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--linea)' }}></div>
            <span style={{ fontSize: 12, color: 'var(--apagado)' }}>O continúa con</span>
            <div style={{ flex: 1, height: 1, background: 'var(--linea)' }}></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
             <button type="button" className="button button-secondary" style={{ flex: 1, padding: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }} onClick={() => { login(mantener); setLocation('/hoy'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/></svg> Google
             </button>
             <button type="button" className="button button-secondary" style={{ flex: 1, padding: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }} onClick={() => { login(mantener); setLocation('/hoy'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#0078D4" d="M2.384 19.062L21.616 23.3V.7L2.384 4.938v14.124zm16.732-15.86v17.6l-14.232-3.48V6.678l14.232-3.48z"/><path fill="#0078D4" d="M7.884 9.072v5.856l6.232-1.54v-2.776l-6.232-1.54z"/></svg> Outlook
             </button>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: 13, color: 'var(--apagado)' }}>¿No tienes una cuenta? </span>
            <button type="button" onClick={() => setLocation('/registro')} style={{ background: 'none', border: 'none', color: 'var(--azul-claro)', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>Crear cuenta nueva</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const [, setLocation] = useLocation();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    alert("Usuario registrado con éxito (Simulación)");
    setLocation("/login");
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--tinta)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--papel)', marginBottom: 10, fontFamily: 'var(--fuente-titulo)' }}>Crear Cuenta</h1>
          <p style={{ color: 'var(--apagado)', fontSize: 14 }}>Únete a Organizador de Eventos</p>
        </div>
        <div className="card" style={{ padding: '30px', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: 'var(--panel)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div className="field">
              <label style={{ color: 'var(--papel)' }}>Nombre completo</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Juan Pérez" />
            </div>
            <div className="field">
              <label style={{ color: 'var(--papel)' }}>Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="correo@ejemplo.com" />
            </div>
            <div className="field">
              <label style={{ color: 'var(--papel)' }}>Contraseña</label>
              <input type={mostrarPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <div className="field">
              <label style={{ color: 'var(--papel)' }}>Confirmar contraseña</label>
              <input type={mostrarPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--papel)' }}>
              <input type="checkbox" checked={mostrarPassword} onChange={e => setMostrarPassword(e.target.checked)} style={{ width: 16, height: 16, margin: 0 }} /> Mostrar contraseñas
            </label>
            <button type="submit" className="button button-primary" style={{ width: '100%', padding: '12px', fontSize: 14, marginTop: 10 }}>Registrarse</button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--linea)' }}></div>
            <span style={{ fontSize: 12, color: 'var(--apagado)' }}>O regístrate con</span>
            <div style={{ flex: 1, height: 1, background: 'var(--linea)' }}></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
             <button type="button" className="button button-secondary" style={{ flex: 1, padding: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }} onClick={() => { alert('Simulación: Registro con Google'); setLocation('/login'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"/></svg> Google
             </button>
             <button type="button" className="button button-secondary" style={{ flex: 1, padding: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }} onClick={() => { alert('Simulación: Registro con Outlook'); setLocation('/login'); }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#0078D4" d="M2.384 19.062L21.616 23.3V.7L2.384 4.938v14.124zm16.732-15.86v17.6l-14.232-3.48V6.678l14.232-3.48z"/><path fill="#0078D4" d="M7.884 9.072v5.856l6.232-1.54v-2.776l-6.232-1.54z"/></svg> Outlook
             </button>
          </div>
          
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <span style={{ fontSize: 13, color: 'var(--apagado)' }}>¿Ya tienes una cuenta? </span>
            <button type="button" onClick={() => setLocation('/login')} style={{ background: 'none', border: 'none', color: 'var(--azul-claro)', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', padding: 0 }}>Inicia sesión</button>
          </div>
        </div>
      </div>
    </div>
  );
}
"""
    app += '\n' + login_components

# Modify the App component to use ProtectedRoute and Login
app = re.sub(
    r'<Switch>\s*<Route path="/" component=\{RedireccionInicio\} />\s*<Route path="/hoy" component=\{Hoy\} />.*?<Route component=\{NotFound\} />\s*</Switch>',
    '''<Switch>
              <Route path="/login" component={LoginPage} />
              <Route path="/registro" component={RegisterPage} />
              <Route path="/:rest*">
                <ProtectedRoute>
                  <Switch>
                    <Route path="/" component={RedireccionInicio} />
                    <Route path="/hoy" component={Hoy} />
                    <Route path="/eventos" component={Eventos} />
                    <Route path="/crear" component={CrearEvento} />
                    <Route path="/evento/:id" component={DetalleEvento} />
                    <Route path="/progreso" component={Progreso} />
                    <Route component={NotFound} />
                  </Switch>
                </ProtectedRoute>
              </Route>
            </Switch>''',
    app,
    flags=re.DOTALL
)

# Update theme state in App component if needed
app = re.sub(
    r'const \[tema, setTema\] = useState\(\s*\(\) => document\.documentElement\.getAttribute\("data-theme"\) \|\| "dark",\s*\);',
    '''const [tema, setTema] = useState(() => {
    const saved = localStorage.getItem("tema");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });''',
    app
)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app)

# Fix CSS
with open('src/index.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Make the contrast better in light mode
if '--papel: #111827;' in css:
    css = css.replace('--papel: #111827;', '--papel: #0f172a;')
if '--tinta: #f9fafb;' in css:
    css = css.replace('--tinta: #f9fafb;', '--tinta: #f1f5f9;')
if '--apagado: #4b5563;' in css:
    css = css.replace('--apagado: #4b5563;', '--apagado: #334155;')

# Replace hardcoded colors with CSS variables
replacements = {
    r'color:\s*#b7b7b7;': 'color: var(--apagado);',
    r'background:\s*#272727;': 'background: var(--panel-elevado);',
    r'border:\s*1px solid #737373;': 'border: 1px solid var(--apagado);',
    r'color:\s*#162019;': 'color: var(--panel);',
    r'color:\s*#818181;': 'color: var(--apagado);',
    r'color:\s*#c6c6c6;': 'color: var(--papel);',
    r'color:\s*#bcbcbc;': 'color: var(--apagado);',
    r'background:\s*#303030;': 'background: var(--panel-elevado);',
    r'border-top-color:\s*#303030;': 'border-top-color: var(--panel-elevado);',
    r'background:\s*#3a3a3a;': 'background: var(--linea-fuerte);',
    r'color:\s*#eef5fa;': 'color: #ffffff;',
    r'color:\s*#f1a08c;': 'color: var(--oxido);'
}

for old, new in replacements.items():
    css = re.sub(old, new, css)

with open('src/index.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("UI applied")
