import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="empty" data-testid="not-found-state">
      <AlertCircle className="empty-icon" size={25} />
      <h1 className="empty-title">No encontramos esta vista</h1>
      <p className="empty-copy">La ruta no forma parte del espacio de trabajo de Organiza.</p>
      <Link href="/hoy" className="button button-primary" data-testid="link-not-found-home">Volver a Hoy</Link>
    </div>
  );
}
