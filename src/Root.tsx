import { useState, useEffect, FormEvent } from 'react';
import App from './App';

export default function Root() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    localStorage.removeItem('logged_in');
  };

  // Add the logout function to window so App.tsx can call it from anywhere
  (window as any).performLogout = logout;

  if (loggedIn) {
    return <App />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--tinta)', color: 'var(--papel)' }}>
      <div className="card card-pad" style={{ width: 400, maxWidth: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, marginBottom: 5 }}>Organizador de Eventos</h1>
          <p style={{ color: 'var(--apagado)' }}>Inicia sesión para continuar</p>
        </div>
        
        {vista === 'register' ? (
          <div>
            <div style={{ background: 'var(--panel)', padding: 20, borderRadius: 8, textAlign: 'center', border: '1px solid var(--ambar)' }}>
              <h3 style={{ color: 'var(--ambar)', marginBottom: 10 }}>En construcción</h3>
              <p style={{ fontSize: 13 }}>El registro de nuevas cuentas estará disponible próximamente. Por ahora, usa la cuenta de prueba.</p>
            </div>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button type="button" className="button button-ghost" onClick={() => setVista('login')}>Volver al login</button>
            </div>
          </div>
        ) : (
          <form onSubmit={login}>
            <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="field">
                <label>Usuario</label>
                <input value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              
              {error && <div className="error-box" style={{ padding: 10 }}>{error}</div>}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
                <input type="checkbox" id="mantener" checked={mantener} onChange={e => setMantener(e.target.checked)} style={{ width: 'auto' }} />
                <label htmlFor="mantener" style={{ marginBottom: 0, fontWeight: 'normal', cursor: 'pointer' }}>Mantener sesión iniciada</label>
              </div>
              
              <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>Iniciar sesión</button>
            </div>
            
            <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid var(--linea)', paddingTop: 15 }}>
              <span style={{ fontSize: 13, color: 'var(--apagado)' }}>¿No tienes cuenta? </span>
              <button type="button" className="button button-ghost button-small" onClick={() => setVista('register')}>Crear cuenta</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
