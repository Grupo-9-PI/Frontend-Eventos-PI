import { useState, useEffect, FormEvent } from 'react';
import App from './App';
import { Eye, EyeOff, LogIn, User, Lock, AlertCircle } from 'lucide-react';

export default function Root() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [mantener, setMantener] = useState(false);
  const [vista, setVista] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (localStorage.getItem('logged_in') === 'true') {
      setLoggedIn(true);
    }
  }, []);

  const login = (e: FormEvent) => {
    e.preventDefault();
    if (username === 'Usuario' && password === '12345') {
      setLoggedIn(true);
      if (mantener) {
        localStorage.setItem('logged_in', 'true');
      }
    } else {
      setError('Credenciales incorrectas. Usa Usuario / 12345');
    }
  };

  const logout = () => {
    setLoggedIn(false);
    setUsername('');
    setPassword('');
    localStorage.removeItem('logged_in');
  };

  (window as any).performLogout = logout;

  if (loggedIn) {
    return <App />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--tinta)', color: 'var(--papel)', fontFamily: 'var(--fuente-texto)' }}>
      <div className="card" style={{ width: 420, maxWidth: '90%', background: 'var(--panel)', border: '1px solid var(--linea-fuerte)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
        
        <div style={{ background: 'var(--panel-elevado)', padding: '30px 20px', textAlign: 'center', borderBottom: '1px solid var(--linea)' }}>
          <div style={{ width: 60, height: 60, background: 'var(--azul)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', color: '#fff' }}>
            <LogIn size={28} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, fontFamily: 'var(--fuente-titulo)' }}>Organizador de Eventos</h1>
          <p style={{ color: 'var(--apagado)', margin: '5px 0 0', fontSize: 14 }}>Inicia sesión para acceder a tu panel</p>
        </div>
        
        <div style={{ padding: '30px 25px' }}>
          {vista === 'register' ? (
            <div>
              <div style={{ background: 'rgba(232, 163, 61, 0.1)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid rgba(232, 163, 61, 0.3)' }}>
                <AlertCircle size={32} color="var(--ambar)" style={{ margin: '0 auto 10px' }} />
                <h3 style={{ color: 'var(--ambar)', margin: '0 0 10px', fontSize: 16 }}>En construcción</h3>
                <p style={{ fontSize: 13, color: 'var(--papel)', lineHeight: 1.5, margin: 0 }}>El registro de nuevas cuentas estará disponible próximamente. Por favor, utiliza la cuenta de prueba por ahora.</p>
              </div>
              <div style={{ marginTop: 20 }}>
                <button type="button" className="button button-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setVista('login')}>Volver al inicio de sesión</button>
              </div>
            </div>
          ) : (
            <form onSubmit={login}>
              <div style={{ display: 'grid', gap: 18 }}>
                <div className="field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> Usuario</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} required placeholder="Ej: Usuario" style={{ padding: '12px 14px' }} />
                </div>
                
                <div className="field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Lock size={14} /> Contraseña</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={mostrarPassword ? "text" : "password"} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      placeholder="••••••••"
                      style={{ padding: '12px 14px', width: '100%', paddingRight: 45 }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--apagado)', padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      tabIndex={-1}
                      title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                {error && (
                  <div className="error-box" style={{ padding: '12px 14px', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--papel)' }}>
                    <input type="checkbox" checked={mantener} onChange={e => setMantener(e.target.checked)} style={{ width: 16, height: 16, margin: 0, cursor: 'pointer' }} />
                    Mantener sesión iniciada
                  </label>
                </div>
                
                <button type="submit" className="button button-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: 15, marginTop: 5 }}>
                  Iniciar sesión
                </button>
              </div>
              
              <div style={{ marginTop: 25, textAlign: 'center', paddingTop: 20, borderTop: '1px solid var(--linea)' }}>
                <span style={{ fontSize: 13, color: 'var(--apagado)' }}>¿No tienes una cuenta? </span>
                <button type="button" className="button button-ghost button-small" onClick={() => setVista('register')} style={{ padding: '4px 8px' }}>Crear cuenta nueva</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
