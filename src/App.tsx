import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Clock3, Compass, LayoutDashboard, ListChecks, MapPin, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { CATEGORIAS, combinarFechaHora, diferenciaDias, diferenciaDias as diasEntre, fechaHoraBonita, generarId, hoyISO, repositorioEventos, sumarDias, tareasGlobales, type Evento, type EstadoSubtarea, type Prioridad, type Subtarea } from '@/lib/repositorioEventos';
import './index.css';

type Aviso = { tipo: 'success' | 'error'; texto: string };
type Store = {
  eventos: Evento[];
  cargando: boolean;
  error: string;
  aviso: Aviso | null;
  refrescar: () => void;
  quitarAviso: () => void;
  crearEventoCompleto: (evento: Omit<Evento, 'id'|'subtareas'|'creadoEn'>, tareas: Omit<Subtarea, 'id'>[]) => Promise<string | null>;
  actualizarEvento: (id: string, evento: Omit<Evento, 'id'|'subtareas'|'creadoEn'>) => Promise<boolean>;
  eliminarEvento: (id: string) => Promise<boolean>;
  crearSubtarea: (eventoId: string, subtarea: Omit<Subtarea, 'id'>) => Promise<boolean>;
  actualizarSubtarea: (eventoId: string, subtarea: Subtarea) => Promise<boolean>;
  eliminarSubtarea: (eventoId: string, subtareaId: string) => Promise<boolean>;
};
const StoreContext = createContext<Store | null>(null);
function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('El organizador necesita su proveedor de datos.');
  return store;
}

function useDatos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cargar = async () => {
    setCargando(true);
    const resultado = await repositorioEventos.cargar();
    if (resultado.ok) { setEventos(resultado.data); setError(''); }
    else setError(resultado.error);
    setCargando(false);
  };
  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(null), 3800);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  const notifyError = (err: string) => { setError(err); setAviso({ tipo: 'error', texto: err }); };
  const notifySuccess = (msg: string) => { setError(''); setAviso({ tipo: 'success', texto: msg }); };

  const crearEventoCompleto = async (evento: Omit<Evento, 'id'|'subtareas'|'creadoEn'>, tareas: Omit<Subtarea, 'id'>[]) => {
    const res = await repositorioEventos.crearEvento(evento);
    if (!res.ok) { notifyError(res.error); return null; }
    for (const t of tareas) await repositorioEventos.crearSubtarea(res.data.id, t);
    await cargar();
    notifySuccess('Evento y plan inicial guardados.');
    return res.data.id;
  };
  const actualizarEvento = async (id: string, e: Omit<Evento, 'id'|'subtareas'|'creadoEn'>) => {
    const res = await repositorioEventos.actualizarEvento(id, e);
    if (!res.ok) { notifyError(res.error); return false; }
    await cargar(); notifySuccess('Evento actualizado.'); return true;
  };
  const eliminarEvento = async (id: string) => {
    const res = await repositorioEventos.eliminarEvento(id);
    if (!res.ok) { notifyError(res.error); return false; }
    await cargar(); notifySuccess('Evento eliminado.'); return true;
  };
  const crearSubtarea = async (eId: string, t: Omit<Subtarea, 'id'>) => {
    const res = await repositorioEventos.crearSubtarea(eId, t);
    if (!res.ok) { notifyError(res.error); return false; }
    await cargar(); notifySuccess('Gestión agregada.'); return true;
  };
  const actualizarSubtarea = async (eId: string, t: Subtarea) => {
    const res = await repositorioEventos.actualizarSubtarea(eId, t);
    if (!res.ok) { notifyError(res.error); return false; }
    await cargar(); notifySuccess('Gestión actualizada.'); return true;
  };
  const eliminarSubtarea = async (_eId: string, tId: string) => {
    const res = await repositorioEventos.eliminarSubtarea(tId);
    if (!res.ok) { notifyError(res.error); return false; }
    await cargar(); notifySuccess('Gestión eliminada.'); return true;
  };

  return { eventos, cargando, error, aviso, refrescar: cargar, quitarAviso: () => setAviso(null), crearEventoCompleto, actualizarEvento, eliminarEvento, crearSubtarea, actualizarSubtarea, eliminarSubtarea };
}

function App() {
  const datos = useDatos();
  return (
    <StoreContext.Provider value={datos}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <RoutedErrorBoundary><Shell /></RoutedErrorBoundary>
      </WouterRouter>
    </StoreContext.Provider>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Shell() {
  const { eventos, cargando } = useStore();
  const [location, setLocation] = useLocation();
  const globales = tareasGlobales(eventos);
  const retrasadas = globales.filter((t) => t.estado !== 'hecho' && diasEntre(hoyISO(), t.fechaLimite) < 0).length;
  const activos = eventos.filter((e) => diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.subtareas.some((t) => t.estado !== 'hecho')).length;
  const [eventoActivo, setEventoActivo] = useState('');
  const navegarEvento = (id: string) => { setEventoActivo(id); if (id) setLocation('/evento/' + id); };
  const nav = [
    { href: '/hoy', label: 'Hoy', icon: Compass, count: retrasadas ? String(retrasadas) : undefined },
    { href: '/eventos', label: 'Eventos', icon: CalendarDays, count: activos ? String(activos) : undefined },
    { href: '/progreso', label: 'Progreso', icon: LayoutDashboard },
  ];
  return (
    <div className='app-shell'>
      <aside className='sidebar' aria-label='Navegación principal'>
        <Link href='/hoy' className='brand' data-testid='link-brand'><span className='brand-mark'>EO</span><span><span className='brand-name'>EventOps</span><span className='brand-sub'>mesa de control</span></span></Link>
        <div className='nav-label'>Espacio de trabajo</div>
        <nav className='nav-group'>
          {nav.map(({ href, label, icon: Icon, count }) => <Link key={href} href={href} className={'nav-link' + (location === href ? ' active' : '')}><Icon size={16} strokeWidth={1.7} /><span>{label}</span>{count && <span className='count'>{count}</span>}</Link>)}
        </nav>
        <div className='nav-label' style={{ marginTop: 28 }}>Acción</div>
        <Link href='/crear' className='nav-link'><Plus size={16} strokeWidth={1.7} /><span>Crear evento</span></Link>
        <div className='sidebar-footer'>Planifica con claridad.<br />Una gestión a la vez.</div>
      </aside>
      <div className='main-wrap'>
        <header className='mobile-top'>
          <Link href='/hoy' className='brand'><span className='brand-mark'>EO</span><span className='brand-name'>EventOps</span></Link>
          <nav className='mobile-menu'>{nav.slice(0, 3).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={location === href ? 'active' : ''} aria-label={label}><Icon size={16} /></Link>)}</nav>
        </header>
        {!cargando && eventos.length > 0 && <div style={{ maxWidth: 1180, margin: '0 auto', padding: '16px 48px 0' }} className='active-picker'>
          <label htmlFor='selector-evento-activo' className='muted' style={{ fontSize: 11, marginRight: 9 }}>Evento activo</label>
          <select id='selector-evento-activo' value={eventoActivo} onChange={(e) => navegarEvento(e.target.value)} style={{ width: 'auto', minWidth: 220, padding: '7px 9px', fontSize: 12 }}>
            <option value=''>Consultar eventos…</option>
            {eventos.filter((e) => diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.subtareas.some((t) => t.estado !== 'hecho')).map((evento) => <option key={evento.id} value={evento.id}>{evento.nombre}</option>)}
          </select>
        </div>}
        <main className='content'>
          {cargando ? <Loading /> : <Switch>
            <Route path='/' component={RedireccionInicio} />
            <Route path='/hoy' component={Hoy} />
            <Route path='/eventos' component={Eventos} />
            <Route path='/crear' component={CrearEvento} />
            <Route path='/evento/:id' component={DetalleEvento} />
            <Route path='/progreso' component={Progreso} />
            <Route component={NotFound} />
          </Switch>}
        </main>
      </div>
      <Feedback />
    </div>
  );
}

function RedireccionInicio() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/hoy'); }, [setLocation]);
  return <Loading />;
}
function Loading() { return <div className='loading'><div className='skeleton' /><div className='skeleton' /><div className='skeleton' /></div>; }
function Feedback() {
  const { aviso, error, refrescar, quitarAviso } = useStore();
  if (!aviso && !error) return null;
  return <div className='toast' style={aviso?.tipo === 'error' || error ? { background: '#45261f', borderColor: 'rgba(209,81,47,.55)', color: '#f0b4a5' } : undefined}>
    {error ? <><strong>Fallo de red</strong><br />{error} <button className='button button-small button-ghost' onClick={refrescar}><RotateCcw size={12} /> Reintentar</button></> : aviso?.texto}
    <button onClick={quitarAviso} style={{ background: 'none', border: 0, color: 'inherit', float: 'right', padding: 0 }}><X size={14} /></button>
  </div>;
}

function Encabezado({ eyebrow, titulo, descripcion, accion }: { eyebrow?: string; titulo: string; descripcion?: string; accion?: ReactNode }) {
  return <div className='page-head'><div>{eyebrow && <div className='eyebrow'>{eyebrow}</div>}<h1 className='page-title'>{titulo}</h1>{descripcion && <p className='page-description'>{descripcion}</p>}</div>{accion}</div>;
}
function EmptyState({ titulo, copy, accion }: { titulo: string; copy: string; accion?: ReactNode }) {
  return <div className='empty'><ListChecks className='empty-icon' size={25} /><div className='empty-title'>{titulo}</div><p className='empty-copy'>{copy}</p>{accion}</div>;
}
function calcularPorcentaje(evento: Evento) {
  return evento.subtareas.length ? Math.round(evento.subtareas.filter((t) => t.estado === 'hecho').length / evento.subtareas.length * 100) : 0;
}
function estadoFecha(fecha: string) {
  const dias = diferenciaDias(hoyISO(), fecha);
  return dias < 0 ? 'overdue' : dias === 0 ? 'today' : '';
}
function textoPlazo(tarea: Subtarea) {
  const dias = diferenciaDias(hoyISO(), tarea.fechaLimite);
  return dias < 0 ? 'Retrasada · ' + fechaHoraBonita(tarea.fechaLimite, tarea.horaLimite) : dias === 0 ? 'Hoy · ' + tarea.horaLimite : fechaHoraBonita(tarea.fechaLimite, tarea.horaLimite);
}
function esInmediata(tarea: Subtarea) { return /streaming|inmediata/i.test(tarea.titulo); }

function FilaTarea({ tarea, mostrarEvento, onToggle, onReprogramar, onEditar, onEliminar }: { tarea: Subtarea; mostrarEvento?: boolean; onToggle: () => void; onReprogramar: () => void; onEditar?: () => void; onEliminar?: () => void }) {
  const fecha = estadoFecha(tarea.fechaLimite);
  return <div className={'task-row ' + fecha}>
    <input className='task-check' type='checkbox' checked={tarea.estado === 'hecho'} onChange={onToggle} />
    <div className='task-main'>
      <div className={'task-title' + (tarea.estado === 'hecho' ? ' done' : '')}>{tarea.titulo}</div>
      <div className='task-meta'><span>{mostrarEvento && <strong>{(tarea as Subtarea & { eventoNombre?: string }).eventoNombre} · </strong>}{textoPlazo(tarea)}</span><span>{tarea.estimacion} h estimadas</span>{tarea.horaInicio && <span>Inicio {tarea.horaInicio}</span>}<span className='tag'>{CATEGORIAS.find((c) => c.id === tarea.categoria)?.nombre ?? 'Otro'}</span>{tarea.estado === 'en_progreso' && <span className='tag tag-urgent'>En curso</span>}{tarea.estado === 'hecho' && <span className='tag tag-done'>Hecha</span>}</div>
    </div>
    <div className='task-actions'>
      {esInmediata(tarea) && <span className='task-help tag tag-urgent' tabIndex={0}>Gestión inmediata</span>}
      {onEditar && <button className='button button-small button-ghost button-icon' onClick={onEditar}><Pencil size={13} /></button>}
      <button className='button button-small button-secondary' onClick={onReprogramar}><Clock3 size={13} /> Mover</button>
      {onEliminar && <button className='button button-small button-danger button-icon' onClick={onEliminar}><Trash2 size={13} /></button>}
    </div>
  </div>;
}

function Hoy() {
  const { eventos, actualizarSubtarea } = useStore();
  const [reprogramar, setReprogramar] = useState<{ evento: Evento; tarea: Subtarea } | null>(null);
  const todas = useMemo(() => tareasGlobales(eventos).filter((t) => t.estado !== 'hecho').sort((a, b) => combinarFechaHora(a.fechaLimite, a.horaLimite) - combinarFechaHora(b.fechaLimite, b.horaLimite) || a.estimacion - b.estimacion), [eventos]);
  const vencidas = todas.filter((t) => diferenciaDias(hoyISO(), t.fechaLimite) < 0);
  const hoy = todas.filter((t) => diferenciaDias(hoyISO(), t.fechaLimite) === 0);
  const proximas = todas.filter((t) => diferenciaDias(hoyISO(), t.fechaLimite) > 0);
  
  const cambiarEstado = (eventoId: string, tareaId: string) => {
    const e = eventos.find((ev) => ev.id === eventoId);
    const t = e?.subtareas.find((st) => st.id === tareaId);
    if(t) actualizarSubtarea(eventoId, { ...t, estado: 'hecho' });
  };
  
  const moverTarea = async (eventoId: string, tareaId: string, fecha: string, hora: string) => {
    const evento = eventos.find((e) => e.id === eventoId); if (!evento) return;
    const tarea = evento.subtareas.find((t) => t.id === tareaId); if (!tarea) return;
    const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora });
    if (problema) { window.alert(problema); return; }
    if(await actualizarSubtarea(eventoId, { ...tarea, fechaLimite: fecha, horaLimite: hora })) setReprogramar(null);
  };
  const bloque = (titulo: string, lista: typeof todas, clase = '') => <section className='hoy-section'><div className='section-head'><div className='section-title-row'><h2 className='section-title'>{titulo}</h2><span className='section-count'>{lista.length}</span></div>{titulo === 'Retrasadas' && <span className='tag tag-overdue'>Requieren decisión</span>}</div>{lista.length ? <div className='task-list'>{lista.map((t) => <FilaTarea key={t.id} tarea={t} mostrarEvento onToggle={() => cambiarEstado(t.eventoId, t.id)} onReprogramar={() => { const e = eventos.find((ev) => ev.id === t.eventoId); if (e) setReprogramar({ evento: e, tarea: t }); }} />)}</div> : <div className='card card-pad muted' style={{ fontSize: 12 }}>{clase || 'Nada en este grupo.'}</div>}</section>;
  return <div><Encabezado eyebrow='Panel de control' titulo='Hoy' descripcion={todas.length ? `${todas.length} gestiones abiertas.` : 'El plan está despejado.'} accion={<Link href='/crear' className='button button-primary'><Plus size={15} /> Crear evento</Link>} />{eventos.length === 0 ? <EmptyState titulo='Todavía no hay eventos' copy='Crea el primero.' accion={<Link href='/crear' className='button button-primary'>Crear evento</Link>} /> : todas.length === 0 ? <EmptyState titulo='No hay gestiones pendientes' copy='Todas las tareas están hechas.' accion={<Link href='/eventos' className='button button-secondary'>Ver eventos</Link>} /> : <>{bloque('Retrasadas', vencidas, 'No hay tareas retrasadas.')}{bloque('Para hoy', hoy, 'Nada vence hoy.')}{bloque('Próximas', proximas, 'No hay próximas gestiones.')}</>}{reprogramar && <ReprogramarDialog evento={reprogramar.evento} tarea={reprogramar.tarea} onClose={() => setReprogramar(null)} onSave={(fecha, hora) => moverTarea(reprogramar.evento.id, reprogramar.tarea.id, fecha, hora)} />}</div>;
}

function Eventos() {
  const { eventos } = useStore();
  const [filtro, setFiltro] = useState('activos');
  const lista = eventos.filter((e) => filtro === 'todos' || diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.subtareas.some((t) => t.estado !== 'hecho')).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  return <div><Encabezado eyebrow='Agenda' titulo='Eventos' descripcion='Consulta el mapa completo.' accion={<Link href='/crear' className='button button-primary'><Plus size={15} /> Nuevo evento</Link>} /><div className='filter-row' style={{ marginBottom: 18 }}><select value={filtro} onChange={(e) => setFiltro(e.target.value)}><option value='activos'>Activos</option><option value='todos'>Todos los eventos</option></select><span className='muted' style={{ fontSize: 12 }}>{lista.length} visible</span></div>{eventos.length === 0 ? <EmptyState titulo='El tablero está vacío' copy='Crea un evento.' accion={<Link href='/crear' className='button button-primary'><Plus size={15} /> Crear evento</Link>} /> : lista.length === 0 ? <EmptyState titulo='No hay eventos activos' copy='Puedes consultar todos los eventos o crear uno nuevo.' accion={<button className='button button-secondary' onClick={() => setFiltro('todos')}>Ver todos</button>} /> : <div className='event-grid'>{lista.map((evento) => <TarjetaEvento key={evento.id} evento={evento} />)}</div>}</div>;
}
function TarjetaEvento({ evento }: { evento: Evento }) {
  const porcentaje = calcularPorcentaje(evento); const pendientes = evento.subtareas.filter((t) => t.estado !== 'hecho').length;
  return <Link href={'/evento/' + evento.id} className='card event-card'><div className='event-card-top'><div><div className='event-type'>{evento.tipo}</div><h2 className='event-name'>{evento.nombre}</h2></div><ChevronRight size={17} color='#777' /></div><div className='event-info'><span><CalendarDays size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{fechaHoraBonita(evento.fechaInicio, evento.horaEvento)}</span><span><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{evento.lugar || 'Lugar por definir'}</span></div><div className='event-footer'><div className='progress-wrap'><div className='progress-track'><div className='progress-fill' style={{ width: porcentaje + '%' }} /></div><span className='progress-text'>{porcentaje}%</span></div><span className='muted' style={{ fontSize: 11 }}>{pendientes} abiertas</span></div></Link>;
}

type FormEvento = { nombre: string; tipo: string; fechaInicio: string; fechaFin: string; horaEvento: string; duracion: string; lugar: string; notas: string; capacidadDiaria: string };
type BorradorTarea = { id: string; titulo: string; categoria: string; prioridad: Prioridad; fechaLimite: string; horaLimite: string; horaInicio: string; estimacion: string };
const formEventoInicial = (): FormEvento => ({ nombre: '', tipo: 'Lanzamiento', fechaInicio: sumarDias(hoyISO(), 14), fechaFin: sumarDias(hoyISO(), 14), horaEvento: '19:00', duracion: '4', lugar: '', notas: '', capacidadDiaria: '6' });
const borradorInicial = (): BorradorTarea => ({ id: generarId('draft'), titulo: '', categoria: 'salon', prioridad: 'media', fechaLimite: sumarDias(hoyISO(), 7), horaLimite: '18:00', horaInicio: '', estimacion: '1' });
function CrearEvento() {
  const { crearEventoCompleto } = useStore(); const [, setLocation] = useLocation();
  const [datos, setDatos] = useState<FormEvento>(formEventoInicial); const [tareas, setTareas] = useState<BorradorTarea[]>(() => [ { ...borradorInicial(), titulo: 'Reservar salón', categoria: 'salon', prioridad: 'alta', estimacion: '2' } ]); const [nuevo, setNuevo] = useState<BorradorTarea>(borradorInicial); const [error, setError] = useState<Record<string, string>>({});
  useEffect(() => { setTareas((actuales) => actuales.map((t) => ({ ...t, fechaLimite: t.fechaLimite || datos.fechaInicio }))); }, [datos.fechaInicio]);
  const setCampo = (campo: keyof FormEvento, valor: string) => { setDatos((d) => ({ ...d, [campo]: valor })); setError(errs => ({ ...errs, [campo]: '' })); };
  const añadirTarea = () => { if (!nuevo.titulo.trim()) return; setTareas((ts) => [...ts, { ...nuevo, id: generarId('draft') }]); setNuevo(borradorInicial()); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError({}); const validacion = validarDatosEvento(datos, tareas); if (Object.keys(validacion).length > 0) { setError(validacion); return; }
    const eventoPayload = { nombre: datos.nombre.trim(), tipo: datos.tipo, fechaInicio: datos.fechaInicio, fechaFin: datos.fechaFin, horaEvento: datos.horaEvento, duracion: Number(datos.duracion), lugar: datos.lugar.trim(), notas: datos.notas.trim(), capacidadDiaria: Number(datos.capacidadDiaria) };
    const tareasPayload = tareas.map((t) => ({ titulo: t.titulo.trim(), categoria: t.categoria, prioridad: t.prioridad, estado: 'pendiente' as EstadoSubtarea, fechaLimite: t.fechaLimite, horaLimite: t.horaLimite, horaInicio: t.horaInicio || undefined, estimacion: Number(t.estimacion) }));
    const id = await crearEventoCompleto(eventoPayload, tareasPayload);
    if (id) setLocation('/evento/' + id);
  };
  return <div><Encabezado eyebrow='Nuevo plan' titulo='Crear evento' /><form onSubmit={submit} className='card form-card' noValidate><section className='form-section'><h2 className='form-section-title'>Identidad del evento</h2><div className='form-grid'><div className='field full'><label>Nombre *</label>{error.nombre && <div className='field-error'>{error.nombre}</div>}<input className={error.nombre ? 'error' : ''} value={datos.nombre} onChange={(e) => setCampo('nombre', e.target.value)} /></div><div className='field'><label>Tipo</label>{error.tipo && <div className='field-error'>{error.tipo}</div>}<input className={error.tipo ? 'error' : ''} value={datos.tipo} onChange={(e) => setCampo('tipo', e.target.value)} /></div><div className='field'><label>Lugar</label>{error.lugar && <div className='field-error'>{error.lugar}</div>}<input className={error.lugar ? 'error' : ''} value={datos.lugar} onChange={(e) => setCampo('lugar', e.target.value)} /></div><div className='field'><label>Inicio *</label>{error.fechaInicio && <div className='field-error'>{error.fechaInicio}</div>}<input type='date' className={error.fechaInicio ? 'error' : ''} value={datos.fechaInicio} onChange={(e) => setCampo('fechaInicio', e.target.value)} /></div><div className='field'><label>Fin *</label>{error.fechaFin && <div className='field-error'>{error.fechaFin}</div>}<input type='date' className={error.fechaFin ? 'error' : ''} value={datos.fechaFin} onChange={(e) => setCampo('fechaFin', e.target.value)} /></div><div className='field'><label>Hora *</label>{error.horaEvento && <div className='field-error'>{error.horaEvento}</div>}<input type='time' className={error.horaEvento ? 'error' : ''} value={datos.horaEvento} onChange={(e) => setCampo('horaEvento', e.target.value)} /></div><div className='field'><label>Duración (h) *</label>{error.duracion && <div className='field-error'>{error.duracion}</div>}<input type='number' className={error.duracion ? 'error' : ''} min='0.5' step='0.5' value={datos.duracion} onChange={(e) => setCampo('duracion', e.target.value)} /></div><div className='field'><label>Límite diario (h) *</label>{error.capacidadDiaria && <div className='field-error'>{error.capacidadDiaria}</div>}<input type='number' className={error.capacidadDiaria ? 'error' : ''} min='1' step='0.5' value={datos.capacidadDiaria} onChange={(e) => setCampo('capacidadDiaria', e.target.value)} /></div><div className='field full'><label>Notas</label><textarea value={datos.notas} onChange={(e) => setCampo('notas', e.target.value)} /></div></div></section><section className='form-section'><h2 className='form-section-title'>Plan inicial</h2><div className='task-builder'>{tareas.map((t) => <div className='task-draft' key={t.id}><div className='task-draft-info'>{t.titulo}</div><button type='button' className='button button-small button-danger button-icon' onClick={() => setTareas((ts) => ts.filter((x) => x.id !== t.id))}><Trash2 size={13} /></button></div>)}<div className='card card-pad'><div className='task-builder-row'><div className='task-builder-item'><label>Nueva gestión</label><input value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} /></div><div className='task-builder-item'><label>Est. (h)</label><input type='number' min='0.25' step='0.25' value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} /></div></div><div className='task-builder-row compact' style={{ marginTop: 11 }}><div className='task-builder-item'><label>Plazo</label><input type='date' value={nuevo.fechaLimite} max={datos.fechaInicio} onChange={(e) => setNuevo({ ...nuevo, fechaLimite: e.target.value })} /></div><div className='task-builder-item'><label>Hora</label><input type='time' value={nuevo.horaLimite} onChange={(e) => setNuevo({ ...nuevo, horaLimite: e.target.value })} /></div><div className='task-builder-item'><button type='button' className='button button-secondary' onClick={añadirTarea}><Plus size={14} /> Agregar</button></div></div></div></div></section>{error.general && <div className='error-box'>{error.general}</div>}<div className='form-actions'><Link href='/eventos' className='button button-ghost'>Cancelar</Link><button className='button button-primary' type='submit'><Check size={15} /> Crear evento y plan</button></div></form></div>;
}

function validarDatosEvento(datos: FormEvento, tareas: BorradorTarea[]) {
  const e: Record<string, string> = {};
  if (!datos.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
  if (!datos.lugar.trim()) e.lugar = 'El lugar es obligatorio.';
  if (!datos.fechaInicio || !datos.fechaFin) { if(!datos.fechaInicio) e.fechaInicio = 'Elige una fecha.'; if(!datos.fechaFin) e.fechaFin = 'Elige una fecha.'; }
  else if (datos.fechaFin < datos.fechaInicio) e.fechaFin = 'Inválida.';
  if (Number(datos.duracion) <= 0) e.duracion = 'Mayor que cero.';
  if (Number(datos.capacidadDiaria) <= 0) e.capacidadDiaria = 'Mayor que cero.';
  if (!datos.horaEvento) e.horaEvento = 'Obligatoria.';
  if (!tareas.length) e.general = 'Agrega al menos una gestión.';
  return e;
}

function validarTarea(evento: Evento, candidata: Subtarea) {
  const e: Record<string, string> = {};
  if (!candidata.titulo.trim()) e.titulo = 'El título es obligatorio.';
  if (!candidata.fechaLimite) e.fechaLimite = 'Elige fecha.';
  if (!candidata.horaLimite) e.horaLimite = 'Elige hora.';
  if (candidata.estimacion <= 0) e.estimacion = 'Mayor que 0.';
  if (candidata.fechaLimite && candidata.horaLimite && combinarFechaHora(candidata.fechaLimite, candidata.horaLimite) > combinarFechaHora(evento.fechaInicio, evento.horaEvento)) e.fechaLimite = 'El plazo debe ser anterior al evento.';
  return e;
}

function DetalleEvento() {
  const { id } = useParams<{ id: string }>(); const { eventos, actualizarSubtarea, eliminarSubtarea, eliminarEvento, crearSubtarea } = useStore();
  const [, setLocation] = useLocation(); const evento = eventos.find((e) => e.id === id);
  const [mostrarAgregar, setMostrarAgregar] = useState(false); const [tareaEditar, setTareaEditar] = useState<Subtarea | null>(null); const [mover, setMover] = useState<Subtarea | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{ tipo: 'evento' | 'tarea', id: string, nombre: string } | null>(null);

  if (!evento) return <EmptyState titulo='Evento no encontrado' copy='Puede que haya sido eliminado.' accion={<Link href='/eventos' className='button button-secondary'>Volver a eventos</Link>} />;
  
  const toggle = async (tarea: Subtarea) => await actualizarSubtarea(evento.id, { ...tarea, estado: tarea.estado === 'hecho' ? 'pendiente' : 'hecho' });
  const eliminar = async (tarea: Subtarea) => { setConfirmarEliminar({ tipo: 'tarea', id: tarea.id, nombre: tarea.titulo }); };
  const eliminarEv = async () => { setConfirmarEliminar({ tipo: 'evento', id: evento.id, nombre: evento.nombre }); };
  
  const procesarEliminacion = async () => {
    if (!confirmarEliminar) return;
    if (confirmarEliminar.tipo === 'evento') {
      if (await eliminarEvento(confirmarEliminar.id)) setLocation('/eventos');
    } else {
      await eliminarSubtarea(evento.id, confirmarEliminar.id);
      setConfirmarEliminar(null);
    }
  };

  const pendientes = evento.subtareas.filter((t) => t.estado !== 'hecho'); const completadas = evento.subtareas.filter((t) => t.estado === 'hecho'); const porcentaje = calcularPorcentaje(evento);
  return <div><Link href='/eventos' className='detail-back'><ArrowLeft size={14} /> Todos los eventos</Link><div className='detail-head'><div><h1 className='detail-title'>{evento.nombre}</h1></div><div className='detail-score'><div className='score-number'>{porcentaje}%</div></div></div><div className='detail-actions'><button className='button button-primary' onClick={() => setMostrarAgregar((v) => !v)}><Plus size={15} /> {mostrarAgregar ? 'Cerrar formulario' : 'Agregar gestión'}</button><button className='button button-danger' onClick={eliminarEv}><Trash2 size={14} /> Eliminar evento</button></div>{confirmarEliminar && <ConfirmDialog titulo={confirmarEliminar.tipo === 'evento' ? '¿Eliminar evento?' : '¿Eliminar gestión?'} mensaje={'Esta acción eliminará ' + (confirmarEliminar.tipo === 'evento' ? 'el evento y todas sus gestiones' : 'la gestión y toda su información') + '. No se puede deshacer.'} onClose={() => setConfirmarEliminar(null)} onConfirm={procesarEliminacion} />}{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={async (t) => { if(await actualizarSubtarea(evento.id, t)) setTareaEditar(null); }} />}{mover && <ReprogramarDialog evento={evento} tarea={mover} onClose={() => setMover(null)} onSave={async (fecha, hora) => { if(await actualizarSubtarea(evento.id, { ...mover, fechaLimite: fecha, horaLimite: hora })) setMover(null); }} />}<div className='detail-layout'><section>{mostrarAgregar && <TaskEditor evento={evento} onCancel={() => setMostrarAgregar(false)} onSave={async (t) => { const e = validarTarea(evento, t as Subtarea); if (e && Object.keys(e).length > 0) return false; if (await crearSubtarea(evento.id, t)) setMostrarAgregar(false); return true; }} />}{pendientes.length ? <div className='task-list'>{pendientes.map((t) => <FilaTarea key={t.id} tarea={t} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} onEditar={() => setTareaEditar(t)} onEliminar={() => eliminar(t)} />)}</div> : <EmptyState titulo='Plan despejado' copy='No hay gestiones pendientes.' />}{completadas.length > 0 && <div className='task-list'>{completadas.map((t) => <FilaTarea key={t.id} tarea={t} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} />)}</div>}</section></div></div>;
}

function TaskEditor({ evento, tarea: tareaInicial, onCancel, onSave }: { evento: Evento; tarea?: Subtarea; onCancel: () => void; onSave: (tarea: Omit<Subtarea, 'id'>) => Promise<boolean> }) {
  const [tarea, setTarea] = useState<Omit<Subtarea, 'id'>>(tareaInicial ?? { titulo: '', categoria: 'otro', prioridad: 'media', estado: 'pendiente', fechaLimite: evento.fechaInicio, horaLimite: '18:00', horaInicio: '', estimacion: 1 }); const [error, setError] = useState<Record<string, string>>({});
  const submit = async (e: FormEvent) => { e.preventDefault(); const errs = validarTarea(evento, tarea as Subtarea); if (Object.keys(errs).length > 0) { setError(errs); return; } await onSave({ ...tarea, estimacion: Number(tarea.estimacion) }); };
  return <form className='card card-pad edit-panel' onSubmit={submit} style={{ marginBottom: 20 }}><div className='form-grid' style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}><div className='field' style={{ gridColumn: '1 / -1' }}><label>Qué hay que hacer *</label>{error.titulo && <div className='field-error'>{error.titulo}</div>}<input className={error.titulo ? 'error' : ''} value={tarea.titulo} onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })} autoFocus /></div><div className='field'><label>Fecha límite *</label>{error.fechaLimite && <div className='field-error'>{error.fechaLimite}</div>}<input type='date' className={error.fechaLimite ? 'error' : ''} max={evento.fechaInicio} value={tarea.fechaLimite} onChange={(e) => setTarea({ ...tarea, fechaLimite: e.target.value })} /></div><div className='field'><label>Hora límite *</label>{error.horaLimite && <div className='field-error'>{error.horaLimite}</div>}<input type='time' className={error.horaLimite ? 'error' : ''} value={tarea.horaLimite} onChange={(e) => setTarea({ ...tarea, horaLimite: e.target.value })} /></div><div className='field'><label>Estimación (h) *</label>{error.estimacion && <div className='field-error'>{error.estimacion}</div>}<input type='number' className={error.estimacion ? 'error' : ''} min='0.25' step='0.25' value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: Number(e.target.value) })} /></div></div>{error.general && <div className='error-box'>{error.general}</div>}<div className='form-actions'><button type='button' className='button button-ghost' onClick={onCancel}>Cancelar</button><button type='submit' className='button button-primary'>Guardar gestión</button></div></form>;
}

function TaskEditorDialog({ evento, tarea, onClose, onSave }: { evento: Evento; tarea?: Subtarea; onClose: () => void; onSave: (t: any) => Promise<void> }) {
  return <div className='dialog-backdrop' onMouseDown={onClose}><div className='dialog' style={{ padding: '0', background: 'transparent', boxShadow: 'none' }} onMouseDown={(e) => e.stopPropagation()}><TaskEditor evento={evento} tarea={tarea} onCancel={onClose} onSave={async (t) => { await onSave(tarea ? { ...t, id: tarea.id } : t); return true; }} /></div></div>;
}

function ConfirmDialog({ titulo, mensaje, onClose, onConfirm }: { titulo: string; mensaje: string; onClose: () => void; onConfirm: () => void }) {
  return <div className='dialog-backdrop' onMouseDown={onClose}><div className='dialog' style={{ padding: '32px 28px', maxWidth: 420, borderRadius: 12 }} onMouseDown={(e) => e.stopPropagation()}><div className='dialog-body' style={{ textAlign: 'center' }}><h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 600, color: '#fff' }}>{titulo}</h3><p style={{ color: '#b0b0b0', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>{mensaje}</p></div><div className='form-actions' style={{ marginTop: 0, display: 'flex', gap: 12, justifyContent: 'center' }}><button type='button' className='button' style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid #555', color: '#e0e0e0', fontWeight: 500, borderRadius: 8 }} onClick={onClose}>Cancelar</button><button type='button' className='button' style={{ flex: 1, padding: '11px', background: '#d33833', border: '1px solid #d33833', color: '#fff', fontWeight: 500, borderRadius: 8 }} onClick={onConfirm}>Eliminar</button></div></div></div>;
}

function ReprogramarDialog({ evento, tarea, onClose, onSave }: { evento: Evento; tarea: Subtarea; onClose: () => void; onSave: (fecha: string, hora: string) => void }) {
  const [fecha, setFecha] = useState(tarea.fechaLimite); const [hora, setHora] = useState(tarea.horaLimite); const [error, setError] = useState('');
  const confirmar = (e: FormEvent) => { e.preventDefault(); const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora }); if (Object.keys(problema).length > 0) { setError('Asegúrate de colocar fecha y hora.'); return; } onSave(fecha, hora); };
  return <div className='dialog-backdrop' onMouseDown={onClose}><form className='dialog' onSubmit={confirmar} onMouseDown={(e) => e.stopPropagation()}><div className='dialog-body'><div className='form-grid'><div className='field'><label>Nuevo plazo</label><input type='date' value={fecha} max={evento.fechaInicio} onChange={(e) => setFecha(e.target.value)} /></div><div className='field'><label>Nueva hora</label><input type='time' value={hora} onChange={(e) => setHora(e.target.value)} /></div></div>{error && <div className='error-box'>{error}</div>}</div><div className='form-actions'><button type='button' className='button button-ghost' onClick={onClose}>Cancelar</button><button type='submit' className='button button-primary'>Confirmar</button></div></form></div>;
}

function Progreso() {
  const { eventos } = useStore();
  if (!eventos.length) return <div><Encabezado eyebrow='Progreso' titulo='Métricas' /><EmptyState titulo='Sin datos' copy='Aún no hay eventos registrados.' /></div>;

  const totalEventos = eventos.length;
  const eventosCompletados = eventos.filter(e => e.subtareas.length > 0 && e.subtareas.every(t => t.estado === 'hecho')).length;
  const eventosActivos = totalEventos - eventosCompletados;

  const todasTareas = eventos.flatMap(e => e.subtareas);
  const totalTareas = todasTareas.length;
  const tareasCompletadas = todasTareas.filter(t => t.estado === 'hecho').length;
  
  const porcentajeGlobal = totalTareas === 0 ? 0 : Math.round((tareasCompletadas / totalTareas) * 100);

  return (
    <div>
      <Encabezado eyebrow='Progreso' titulo='Métricas globales' />
      <div className='detail-layout' style={{ marginTop: '32px' }}>
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
             <div className='card card-pad' style={{ background: 'rgba(111,174,134,0.06)', borderColor: 'rgba(111,174,134,0.2)' }}>
               <div style={{ color: 'var(--salvia)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Progreso Global</div>
               <div style={{ fontSize: '42px', color: 'var(--salvia)', fontWeight: 300 }}>{porcentajeGlobal}%</div>
             </div>
             <div className='card card-pad'>
               <div style={{ color: 'var(--apagado)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Eventos Activos</div>
               <div style={{ fontSize: '42px', color: '#fff', fontWeight: 300 }}>{eventosActivos} <span style={{ fontSize: '16px', color: '#555' }}>/ {totalEventos}</span></div>
             </div>
             <div className='card card-pad'>
               <div style={{ color: 'var(--apagado)', fontSize: '12px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Gestiones Completadas</div>
               <div style={{ fontSize: '42px', color: '#fff', fontWeight: 300 }}>{tareasCompletadas} <span style={{ fontSize: '16px', color: '#555' }}>/ {totalTareas}</span></div>
             </div>
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 500, color: '#e0e0e0' }}>Desglose por Evento</h3>
          <div className='task-list'>
            {eventos.map(e => {
               const p = calcularPorcentaje(e);
               return (
                 <Link href={'/evento/' + e.id} key={e.id} className='task-row' style={{ gridTemplateColumns: 'minmax(0,1fr) auto', padding: '16px 20px', cursor: 'pointer', textDecoration: 'none' }}>
                   <div>
                     <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px', color: '#fff' }}>{e.nombre}</div>
                     <div style={{ fontSize: '13px', color: 'var(--apagado)' }}>{e.subtareas.filter(t => t.estado === 'hecho').length} de {e.subtareas.length} gestiones completadas</div>
                   </div>
                   <div style={{ fontSize: '24px', color: p === 100 ? 'var(--salvia)' : '#e0e0e0', fontWeight: 300 }}>{p}%</div>
                 </Link>
               )
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
