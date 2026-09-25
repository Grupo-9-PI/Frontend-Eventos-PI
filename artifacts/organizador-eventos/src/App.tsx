import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, Clock3, Compass, LayoutDashboard, ListChecks, MapPin, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import { CATEGORIAS, combinarFechaHora, diferenciaDias, diferenciaDias as diasEntre, fechaBonita, fechaHoraBonita, generarId, hoyISO, repositorioEventos, sumarDias, tareasGlobales, type Evento, type EstadoTarea, type Prioridad, type Tarea } from "@/lib/repositorioEventos";
import "./index.css";

type Aviso = { tipo: "success" | "error"; texto: string };
type Store = {
  eventos: Evento[];
  cargando: boolean;
  error: string;
  aviso: Aviso | null;
  guardar: (eventos: Evento[], texto?: string) => boolean;
  refrescar: () => void;
  quitarAviso: () => void;
};
const StoreContext = createContext<Store | null>(null);
function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("El organizador necesita su proveedor de datos.");
  return store;
}

function useDatosLocales() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const cargar = () => {
    setCargando(true);
    const resultado = repositorioEventos.cargar();
    if (resultado.ok) { setEventos(resultado.data); setError(""); }
    else setError(resultado.error);
    setCargando(false);
  };
  useEffect(() => { cargar(); }, []);
  const guardar = (siguiente: Evento[], texto?: string) => {
    const resultado = repositorioEventos.guardar(siguiente);
    if (!resultado.ok) { setError(resultado.error); setAviso({ tipo: "error", texto: resultado.error }); return false; }
    setEventos(resultado.data); setError(""); if (texto) setAviso({ tipo: "success", texto }); return true;
  };
  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(null), 3800);
    return () => window.clearTimeout(timer);
  }, [aviso]);
  return { eventos, cargando, error, aviso, guardar, refrescar: cargar, quitarAviso: () => setAviso(null) };
}

function App() {
  const datos = useDatosLocales();
  return (
    <StoreContext.Provider value={datos}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
  const retrasadas = globales.filter((t) => t.estado !== "hecho" && diasEntre(hoyISO(), t.fechaLimite) < 0).length;
  const activos = eventos.filter((e) => diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.tareas.some((t) => t.estado !== "hecho")).length;
  const [eventoActivo, setEventoActivo] = useState("");
  const navegarEvento = (id: string) => { setEventoActivo(id); if (id) setLocation(`/evento/${id}`); };
  const nav = [
    { href: "/hoy", label: "Hoy", icon: Compass, count: retrasadas ? String(retrasadas) : undefined },
    { href: "/eventos", label: "Eventos", icon: CalendarDays, count: activos ? String(activos) : undefined },
    { href: "/progreso", label: "Progreso", icon: LayoutDashboard },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <Link href="/hoy" className="brand" data-testid="link-brand">
          <span className="brand-mark">EO</span><span><span className="brand-name">EventOps</span><span className="brand-sub">mesa de control</span></span>
        </Link>
        <div className="nav-label">Espacio de trabajo</div>
        <nav className="nav-group">
          {nav.map(({ href, label, icon: Icon, count }) => <Link key={href} href={href} className={`nav-link${location === href ? " active" : ""}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={16} strokeWidth={1.7} /><span>{label}</span>{count && <span className="count">{count}</span>}</Link>)}
        </nav>
        <div className="nav-label" style={{ marginTop: 28 }}>Acción</div>
        <Link href="/crear" className="nav-link" data-testid="link-nav-crear"><Plus size={16} strokeWidth={1.7} /><span>Crear evento</span></Link>
        <div className="sidebar-footer">Planifica con claridad.<br />Una gestión a la vez.</div>
      </aside>
      <div className="main-wrap">
        <header className="mobile-top">
          <Link href="/hoy" className="brand" data-testid="link-mobile-brand"><span className="brand-mark">EO</span><span className="brand-name">EventOps</span></Link>
          <nav className="mobile-menu">{nav.slice(0, 3).map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={location === href ? "active" : ""} aria-label={label} data-testid={`link-mobile-${label.toLowerCase()}`}><Icon size={16} /></Link>)}</nav>
        </header>
        {!cargando && eventos.length > 0 && <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 48px 0" }} className="active-picker">
          <label htmlFor="selector-evento-activo" className="muted" style={{ fontSize: 11, marginRight: 9 }}>Evento activo</label>
          <select id="selector-evento-activo" value={eventoActivo} onChange={(e) => navegarEvento(e.target.value)} data-testid="select-evento-activo" style={{ width: "auto", minWidth: 220, padding: "7px 9px", fontSize: 12 }}>
            <option value="">Consultar eventos…</option>
            {eventos.filter((e) => diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.tareas.some((t) => t.estado !== "hecho")).map((evento) => <option key={evento.id} value={evento.id}>{evento.nombre}</option>)}
          </select>
        </div>}
        <main className="content">
          {cargando ? <Loading /> : <Switch>
            <Route path="/" component={RedireccionInicio} />
            <Route path="/hoy" component={Hoy} />
            <Route path="/eventos" component={Eventos} />
            <Route path="/crear" component={CrearEvento} />
            <Route path="/evento/:id" component={DetalleEvento} />
            <Route path="/progreso" component={Progreso} />
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
  useEffect(() => { setLocation("/hoy"); }, [setLocation]);
  return <Loading />;
}
function Loading() { return <div className="loading" aria-label="Cargando"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>; }
function Feedback() {
  const { aviso, error, refrescar, quitarAviso } = useStore();
  if (!aviso && !error) return null;
  return <div className="toast" role="status" data-testid="status-feedback" style={aviso?.tipo === "error" || error ? { background: "#45261f", borderColor: "rgba(209,81,47,.55)", color: "#f0b4a5" } : undefined}>
    {error ? <><strong>Almacenamiento local</strong><br />{error} <button className="button button-small button-ghost" onClick={refrescar} data-testid="button-retry-storage"><RotateCcw size={12} /> Reintentar</button></> : aviso?.texto}
    <button onClick={quitarAviso} aria-label="Cerrar aviso" data-testid="button-close-feedback" style={{ background: "none", border: 0, color: "inherit", float: "right", padding: 0 }}><X size={14} /></button>
  </div>;
}

function Encabezado({ eyebrow, titulo, descripcion, accion }: { eyebrow?: string; titulo: string; descripcion?: string; accion?: ReactNode }) {
  return <div className="page-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 className="page-title">{titulo}</h1>{descripcion && <p className="page-description">{descripcion}</p>}</div>{accion}</div>;
}
function EmptyState({ titulo, copy, accion }: { titulo: string; copy: string; accion?: ReactNode }) {
  return <div className="empty" data-testid="empty-state"><ListChecks className="empty-icon" size={25} /><div className="empty-title">{titulo}</div><p className="empty-copy">{copy}</p>{accion}</div>;
}
function calcularPorcentaje(evento: Evento) {
  return evento.tareas.length ? Math.round(evento.tareas.filter((t) => t.estado === "hecho").length / evento.tareas.length * 100) : 0;
}
function estadoFecha(fecha: string) {
  const dias = diferenciaDias(hoyISO(), fecha);
  return dias < 0 ? "overdue" : dias === 0 ? "today" : "";
}
function textoPlazo(tarea: Tarea) {
  const dias = diferenciaDias(hoyISO(), tarea.fechaLimite);
  return dias < 0 ? `Retrasada · ${fechaHoraBonita(tarea.fechaLimite, tarea.horaLimite)}` : dias === 0 ? `Hoy · ${tarea.horaLimite}` : fechaHoraBonita(tarea.fechaLimite, tarea.horaLimite);
}
function esInmediata(tarea: Tarea) { return /streaming|inmediata/i.test(tarea.titulo); }

function FilaTarea({ tarea, eventoId, mostrarEvento, onToggle, onReprogramar, onEditar, onEliminar }: { tarea: Tarea; eventoId: string; mostrarEvento?: boolean; onToggle: () => void; onReprogramar: () => void; onEditar?: () => void; onEliminar?: () => void }) {
  const fecha = estadoFecha(tarea.fechaLimite);
  return <div className={`task-row ${fecha}`} data-testid={`row-tarea-${tarea.id}`}>
    <input className="task-check" type="checkbox" checked={tarea.estado === "hecho"} onChange={onToggle} aria-label={`${tarea.estado === "hecho" ? "Reabrir" : "Marcar hecha"}: ${tarea.titulo}`} data-testid={`checkbox-tarea-${tarea.id}`} />
    <div className="task-main">
      <div className={`task-title${tarea.estado === "hecho" ? " done" : ""}`} data-testid={`text-tarea-${tarea.id}`}>{tarea.titulo}</div>
      <div className="task-meta"><span>{mostrarEvento && <strong>{(tarea as Tarea & { eventoNombre?: string }).eventoNombre} · </strong>}{textoPlazo(tarea)}</span><span>{tarea.estimacion} h estimadas</span>{tarea.horaInicio && <span>Inicio {tarea.horaInicio}</span>}<span className="tag">{CATEGORIAS.find((c) => c.id === tarea.categoria)?.nombre ?? "Otro"}</span>{tarea.estado === "en_progreso" && <span className="tag tag-urgent">En curso</span>}{tarea.estado === "hecho" && <span className="tag tag-done">Hecha</span>}</div>
    </div>
    <div className="task-actions">
      {esInmediata(tarea) && <span className="task-help tag tag-urgent" tabIndex={0} aria-describedby={`help-${tarea.id}`}>Gestión inmediata<span className="help-pop" role="tooltip" id={`help-${tarea.id}`}>Contacta hoy al proveedor de streaming, confirma hora de llegada del equipo y agenda una nueva prueba técnica.</span></span>}
      {onEditar && <button className="button button-small button-ghost button-icon" onClick={onEditar} aria-label={`Editar ${tarea.titulo}`} data-testid={`button-edit-task-${tarea.id}`}><Pencil size={13} /></button>}
      <button className="button button-small button-secondary" onClick={onReprogramar} data-testid={`button-reschedule-task-${tarea.id}`}><Clock3 size={13} /> Mover</button>
      {onEliminar && <button className="button button-small button-danger button-icon" onClick={onEliminar} aria-label={`Eliminar ${tarea.titulo}`} data-testid={`button-delete-task-${tarea.id}`}><Trash2 size={13} /></button>}
    </div>
  </div>;
}

function Hoy() {
  const { eventos, guardar } = useStore();
  const [reprogramar, setReprogramar] = useState<{ evento: Evento; tarea: Tarea } | null>(null);
  const todas = useMemo(() => tareasGlobales(eventos).filter((t) => t.estado !== "hecho").sort((a, b) => combinarFechaHora(a.fechaLimite, a.horaLimite) - combinarFechaHora(b.fechaLimite, b.horaLimite) || a.estimacion - b.estimacion), [eventos]);
  const vencidas = todas.filter((t) => diferenciaDias(hoyISO(), t.fechaLimite) < 0);
  const hoy = todas.filter((t) => diferenciaDias(hoyISO(), t.fechaLimite) === 0);
  const proximas = todas.filter((t) => diferenciaDias(hoyISO(), t.fechaLimite) > 0);
  const cambiarEstado = (eventoId: string, tareaId: string) => guardar(eventos.map((e) => e.id === eventoId ? { ...e, tareas: e.tareas.map((t) => t.id === tareaId ? { ...t, estado: "hecho" as EstadoTarea } : t) } : e), "Gestión marcada como hecha.");
  const moverTarea = (eventoId: string, tareaId: string, fecha: string, hora: string) => {
    const evento = eventos.find((e) => e.id === eventoId); if (!evento) return;
    const tarea = evento.tareas.find((t) => t.id === tareaId); if (!tarea) return;
    const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora }, evento.tareas.filter((t) => t.id !== tareaId));
    if (problema) { window.alert(problema); return; }
    guardar(eventos.map((e) => e.id === eventoId ? { ...e, tareas: e.tareas.map((t) => t.id === tareaId ? { ...t, fechaLimite: fecha, horaLimite: hora } : t) } : e), "Tarea reprogramada.");
    setReprogramar(null);
  };
  const bloque = (titulo: string, lista: typeof todas, clase = "") => <section className="hoy-section" id={titulo === "Retrasadas" ? "retrasadas" : undefined}><div className="section-head"><div className="section-title-row"><h2 className="section-title">{titulo}</h2><span className="section-count">{lista.length}</span></div>{titulo === "Retrasadas" && <span className="tag tag-overdue">Requieren decisión</span>}</div>{lista.length ? <div className="task-list">{lista.map((t) => <FilaTarea key={t.id} tarea={t} eventoId={t.eventoId} mostrarEvento onToggle={() => cambiarEstado(t.eventoId, t.id)} onReprogramar={() => { const e = eventos.find((ev) => ev.id === t.eventoId); if (e) setReprogramar({ evento: e, tarea: t }); }} />)}</div> : <div className="card card-pad muted" style={{ fontSize: 12 }}>{clase || "Nada en este grupo."}</div>}</section>;
  return <div><Encabezado eyebrow="Panel de control" titulo="Hoy" descripcion={todas.length ? `${todas.length} gestiones abiertas, ordenadas por fecha límite y esfuerzo.` : "El plan está despejado. Usa este espacio para decidir qué mover después."} accion={<Link href="/crear" className="button button-primary" data-testid="button-create-from-today"><Plus size={15} /> Crear evento</Link>} />{eventos.length === 0 ? <EmptyState titulo="Todavía no hay eventos" copy="Crea el primero y convierte sus gestiones en un plan visible." accion={<Link href="/crear" className="button button-primary" data-testid="button-empty-create">Crear evento</Link>} /> : todas.length === 0 ? <EmptyState titulo="No hay gestiones pendientes" copy="Todas las tareas están hechas. Un buen momento para revisar el próximo hito." accion={<Link href="/eventos" className="button button-secondary" data-testid="button-empty-view-events">Ver eventos</Link>} /> : <>{bloque("Retrasadas", vencidas, "No hay tareas retrasadas.")}{bloque("Para hoy", hoy, "Nada vence hoy.")}{bloque("Próximas", proximas, "No hay próximas gestiones.")}</>}{reprogramar && <ReprogramarDialog evento={reprogramar.evento} tarea={reprogramar.tarea} onClose={() => setReprogramar(null)} onSave={(fecha, hora) => moverTarea(reprogramar.evento.id, reprogramar.tarea.id, fecha, hora)} />}</div>;
}

function Eventos() {
  const { eventos } = useStore();
  const [filtro, setFiltro] = useState("activos");
  const lista = eventos.filter((e) => filtro === "todos" || diferenciaDias(hoyISO(), e.fechaInicio) >= 0 || e.tareas.some((t) => t.estado !== "hecho")).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  return <div><Encabezado eyebrow="Agenda" titulo="Eventos" descripcion="Consulta el mapa completo de tus producciones y entra al evento que necesita atención." accion={<Link href="/crear" className="button button-primary" data-testid="button-create-event"><Plus size={15} /> Nuevo evento</Link>} /><div className="filter-row" style={{ marginBottom: 18 }}><select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar eventos" data-testid="select-filter-events"><option value="activos">Activos</option><option value="todos">Todos los eventos</option></select><span className="muted" style={{ fontSize: 12 }}>{lista.length} evento{lista.length === 1 ? "" : "s"} visible{lista.length === 1 ? "" : "s"}</span></div>{eventos.length === 0 ? <EmptyState titulo="El tablero está vacío" copy="Crea un evento para iniciar un plan logístico que puedas mover y medir." accion={<Link href="/crear" className="button button-primary" data-testid="button-events-empty-create"><Plus size={15} /> Crear evento</Link>} /> : lista.length === 0 ? <EmptyState titulo="No hay eventos activos" copy="Puedes consultar todos los eventos o crear uno nuevo." accion={<button className="button button-secondary" onClick={() => setFiltro("todos")} data-testid="button-show-all-events">Ver todos</button>} /> : <div className="event-grid">{lista.map((evento) => <TarjetaEvento key={evento.id} evento={evento} />)}</div>}</div>;
}
function TarjetaEvento({ evento }: { evento: Evento }) {
  const porcentaje = calcularPorcentaje(evento); const pendientes = evento.tareas.filter((t) => t.estado !== "hecho").length;
  return <Link href={`/evento/${evento.id}`} className="card event-card" data-testid={`card-event-${evento.id}`}><div className="event-card-top"><div><div className="event-type">{evento.tipo}</div><h2 className="event-name">{evento.nombre}</h2></div><ChevronRight size={17} color="#777" /></div><div className="event-info"><span><CalendarDays size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{fechaHoraBonita(evento.fechaInicio, evento.horaEvento)}</span><span><MapPin size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />{evento.lugar || "Lugar por definir"}</span></div><div className="event-footer"><div className="progress-wrap"><div className="progress-track"><div className="progress-fill" style={{ width: `${porcentaje}%` }} /></div><span className="progress-text">{porcentaje}%</span></div><span className="muted" style={{ fontSize: 11 }}>{pendientes} abiertas</span></div></Link>;
}

type FormEvento = { nombre: string; tipo: string; fechaInicio: string; fechaFin: string; horaEvento: string; duracion: string; lugar: string; notas: string; capacidadDiaria: string };
type BorradorTarea = { id: string; titulo: string; categoria: string; prioridad: Prioridad; fechaLimite: string; horaLimite: string; horaInicio: string; estimacion: string };
const formEventoInicial = (): FormEvento => ({ nombre: "", tipo: "Lanzamiento", fechaInicio: sumarDias(hoyISO(), 14), fechaFin: sumarDias(hoyISO(), 14), horaEvento: "19:00", duracion: "4", lugar: "", notas: "", capacidadDiaria: "6" });
const borradorInicial = (): BorradorTarea => ({ id: generarId("draft"), titulo: "", categoria: "salon", prioridad: "media", fechaLimite: sumarDias(hoyISO(), 7), horaLimite: "18:00", horaInicio: "", estimacion: "1" });
function CrearEvento() {
  const { eventos, guardar } = useStore(); const [, setLocation] = useLocation();
  const [datos, setDatos] = useState<FormEvento>(formEventoInicial); const [tareas, setTareas] = useState<BorradorTarea[]>(() => [ { ...borradorInicial(), titulo: "Reservar salón", categoria: "salon", prioridad: "alta", estimacion: "2" }, { ...borradorInicial(), titulo: "Enviar invitaciones", categoria: "invitaciones", prioridad: "media", estimacion: "1.5" }, { ...borradorInicial(), titulo: "Confirmar catering", categoria: "catering", prioridad: "media", estimacion: "2" } ]); const [nuevo, setNuevo] = useState<BorradorTarea>(borradorInicial); const [error, setError] = useState("");
  useEffect(() => { setTareas((actuales) => actuales.map((t) => ({ ...t, fechaLimite: t.fechaLimite || datos.fechaInicio }))); }, [datos.fechaInicio]);
  const setCampo = (campo: keyof FormEvento, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));
  const editarTarea = (id: string, campo: keyof BorradorTarea, valor: string) => {
    const cambios: Partial<BorradorTarea> = {};
    if (campo === "titulo") {
      const categoria = window.prompt("Categoría (salon, invitaciones, catering, proveedores u otro)", "salon");
      const plazo = window.prompt("Plazo (AAAA-MM-DD)", sumarDias(datos.fechaInicio, -7));
      const estimacion = window.prompt("Estimación en horas", "1");
      if (categoria) cambios.categoria = CATEGORIAS.some((c) => c.id === categoria) ? categoria : "otro";
      if (plazo) cambios.fechaLimite = plazo;
      if (estimacion && Number(estimacion) > 0) cambios.estimacion = estimacion;
    }
    setTareas((ts) => ts.map((t) => t.id === id ? { ...t, [campo]: valor, ...cambios } : t));
  };
  const añadirTarea = () => { if (!nuevo.titulo.trim()) return; setTareas((ts) => [...ts, { ...nuevo, id: generarId("draft") }]); setNuevo(borradorInicial()); };
  const submit = (e: FormEvent) => { e.preventDefault(); setError(""); const validacion = validarDatosEvento(datos, tareas); if (validacion) { setError(validacion); return; } const evento: Evento = { id: generarId("evt"), nombre: datos.nombre.trim(), tipo: datos.tipo, fechaInicio: datos.fechaInicio, fechaFin: datos.fechaFin, horaEvento: datos.horaEvento, duracion: Number(datos.duracion), lugar: datos.lugar.trim(), notas: datos.notas.trim(), capacidadDiaria: Number(datos.capacidadDiaria), creadoEn: hoyISO(), tareas: tareas.map((t) => ({ id: generarId("tsk"), titulo: t.titulo.trim(), categoria: t.categoria, prioridad: t.prioridad, estado: "pendiente", fechaLimite: t.fechaLimite, horaLimite: t.horaLimite, horaInicio: t.horaInicio || undefined, estimacion: Number(t.estimacion) })) }; if (guardar([...eventos, evento], "Evento y plan inicial guardados.")) setLocation(`/evento/${evento.id}`); };
  return <div><Encabezado eyebrow="Nuevo plan" titulo="Crear evento" descripcion="Define el hito y saldrás con tres gestiones iniciales listas para editar. Las horas son esfuerzo de trabajo, no una duración de reloj." /><form onSubmit={submit} className="card form-card" noValidate><section className="form-section"><h2 className="form-section-title">Identidad del evento</h2><p className="form-section-note">Lo suficiente para que el plan tenga contexto.</p><div className="form-grid"><div className="field full"><label htmlFor="evento-nombre">Nombre del evento *</label><input id="evento-nombre" value={datos.nombre} onChange={(e) => setCampo("nombre", e.target.value)} placeholder="Ej. Lanzamiento Studio Norte" data-testid="input-event-name" /></div><div className="field"><label htmlFor="evento-tipo">Tipo *</label><select id="evento-tipo" value={datos.tipo} onChange={(e) => setCampo("tipo", e.target.value)} data-testid="select-event-type"><option>Lanzamiento</option><option>Conferencia</option><option>Concierto</option><option>Boda</option><option>Otro</option></select></div><div className="field"><label htmlFor="evento-lugar">Lugar</label><input id="evento-lugar" value={datos.lugar} onChange={(e) => setCampo("lugar", e.target.value)} placeholder="Galería, sala o dirección" data-testid="input-event-place" /></div><div className="field"><label htmlFor="evento-fecha">Fecha de inicio *</label><input id="evento-fecha" type="date" value={datos.fechaInicio} onChange={(e) => { setCampo("fechaInicio", e.target.value); if (!datos.fechaFin || datos.fechaFin < e.target.value) setCampo("fechaFin", e.target.value); }} data-testid="input-event-start-date" /></div><div className="field"><label htmlFor="evento-fecha-fin">Fecha final *</label><input id="evento-fecha-fin" type="date" min={datos.fechaInicio} value={datos.fechaFin} onChange={(e) => setCampo("fechaFin", e.target.value)} data-testid="input-event-end-date" /></div><div className="field"><label htmlFor="evento-hora">Hora del evento *</label><input id="evento-hora" type="time" value={datos.horaEvento} onChange={(e) => setCampo("horaEvento", e.target.value)} data-testid="input-event-time" /></div><div className="field"><label htmlFor="evento-duracion">Duración del evento (horas) *</label><input id="evento-duracion" type="number" min="0.5" step="0.5" value={datos.duracion} onChange={(e) => setCampo("duracion", e.target.value)} data-testid="input-event-duration" /></div><div className="field"><label htmlFor="evento-capacidad">Límite diario de trabajo (horas) *</label><input id="evento-capacidad" type="number" min="1" step="0.5" value={datos.capacidadDiaria} onChange={(e) => setCampo("capacidadDiaria", e.target.value)} data-testid="input-event-capacity" /><span className="field-hint">Inicialmente 6 h. Puedes ajustarlo a tu ritmo real.</span></div><div className="field full"><label htmlFor="evento-notas">Notas de producción</label><textarea id="evento-notas" value={datos.notas} onChange={(e) => setCampo("notas", e.target.value)} placeholder="Dependencias, acuerdos o señales de riesgo…" data-testid="textarea-event-notes" /></div></div></section><section className="form-section"><h2 className="form-section-title">Plan inicial <span className="section-count">editable</span></h2><p className="form-section-note">Cada gestión necesita un plazo que no supere la fecha del evento. La estimación usa horas decimales, nunca un reloj.</p><div className="task-builder">{tareas.map((t) => <div className="task-draft" key={t.id}><div className="task-draft-info"><div className="task-draft-title">{t.titulo || "Sin título"}</div><div className="task-draft-meta">{CATEGORIAS.find((c) => c.id === t.categoria)?.nombre} · {t.estimacion} h · vence {fechaBonita(t.fechaLimite)}</div></div><button type="button" className="button button-small button-danger button-icon" onClick={() => setTareas((ts) => ts.filter((x) => x.id !== t.id))} aria-label={`Quitar ${t.titulo}`} data-testid={`button-remove-draft-${t.id}`}><Trash2 size={13} /></button><button type="button" className="button button-small button-ghost" onClick={() => { const titulo = window.prompt("Nombre de la gestión", t.titulo); if (titulo !== null) editarTarea(t.id, "titulo", titulo); }} data-testid={`button-edit-draft-${t.id}`}><Pencil size={13} /></button></div>)}<div className="card card-pad"><div className="task-builder-row"><div className="task-builder-item"><label htmlFor="draft-titulo">Nueva gestión</label><input id="draft-titulo" value={nuevo.titulo} onChange={(e) => setNuevo({ ...nuevo, titulo: e.target.value })} placeholder="Ej. Contratar fotógrafo" data-testid="input-new-draft-title" /></div><div className="task-builder-item"><label htmlFor="draft-categoria">Categoría</label><select id="draft-categoria" value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })} data-testid="select-new-draft-category">{CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><div className="task-builder-item"><label htmlFor="draft-horas">Estimación (h)</label><input id="draft-horas" type="number" min="0.25" step="0.25" value={nuevo.estimacion} onChange={(e) => setNuevo({ ...nuevo, estimacion: e.target.value })} data-testid="input-new-draft-estimate" /></div></div><div className="task-builder-row compact" style={{ marginTop: 11 }}><div className="task-builder-item"><label htmlFor="draft-plazo">Plazo</label><input id="draft-plazo" type="date" value={nuevo.fechaLimite} max={datos.fechaInicio} onChange={(e) => setNuevo({ ...nuevo, fechaLimite: e.target.value })} data-testid="input-new-draft-deadline" /></div><div className="task-builder-item"><label htmlFor="draft-hora">Hora límite</label><input id="draft-hora" type="time" value={nuevo.horaLimite} onChange={(e) => setNuevo({ ...nuevo, horaLimite: e.target.value })} data-testid="input-new-draft-time" /></div><div className="task-builder-item"><button type="button" className="button button-secondary" onClick={añadirTarea} data-testid="button-add-draft"><Plus size={14} /> Agregar gestión</button></div></div></div></div></section>{error && <div className="error-box" role="alert" data-testid="error-create-event">{error}</div>}<div className="form-actions"><Link href="/eventos" className="button button-ghost" data-testid="link-cancel-create">Cancelar</Link><button className="button button-primary" type="submit" data-testid="button-submit-event"><Check size={15} /> Crear evento y plan</button></div></form></div>;
}

function validarDatosEvento(datos: FormEvento, tareas: BorradorTarea[]) {
  if (!datos.nombre.trim()) return "Ponle un nombre al evento.";
  if (!datos.fechaInicio || !datos.fechaFin) return "Elige las fechas del evento.";
  if (datos.fechaFin < datos.fechaInicio) return "La fecha final no puede ser anterior al inicio.";
  if (Number(datos.duracion) <= 0 || Number(datos.capacidadDiaria) <= 0) return "La duración y el límite diario deben ser mayores que cero.";
  if (!datos.horaEvento) return "Indica la hora del evento.";
  if (!tareas.length) return "Agrega al menos una gestión al plan inicial.";
  if (tareas.some((t) => !t.titulo.trim() || !t.fechaLimite || Number(t.estimacion) <= 0)) return "Cada gestión necesita título, plazo y una estimación mayor que cero.";
  if (tareas.some((t) => t.fechaLimite > datos.fechaInicio)) return "Hay una gestión con plazo posterior al inicio del evento.";
  const acumulado = new Map<string, number>(); tareas.forEach((t) => acumulado.set(t.fechaLimite, (acumulado.get(t.fechaLimite) || 0) + Number(t.estimacion)));
  const sobrecarga = [...acumulado.entries()].find(([, horas]) => horas > Number(datos.capacidadDiaria));
  if (sobrecarga) return `El ${fechaBonita(sobrecarga[0])} acumula ${sobrecarga[1]} h y supera el límite de ${datos.capacidadDiaria} h. Mueve una gestión o reduce su estimación.`;
  return "";
}

function validarTarea(evento: Evento, candidata: Tarea, otras: Tarea[]) {
  if (!candidata.titulo.trim()) return "Ponle un título a la gestión.";
  if (!candidata.fechaLimite || !candidata.horaLimite) return "Elige fecha y hora límite.";
  if (candidata.estimacion <= 0) return "La estimación debe ser mayor que cero horas.";
  if (combinarFechaHora(candidata.fechaLimite, candidata.horaLimite) > combinarFechaHora(evento.fechaInicio, evento.horaEvento)) return `El plazo debe ser anterior al inicio del evento: ${fechaHoraBonita(evento.fechaInicio, evento.horaEvento)}.`;
  const horas = otras.filter((t) => t.estado !== "hecho" && t.fechaLimite === candidata.fechaLimite).reduce((s, t) => s + t.estimacion, 0) + (candidata.estado === "hecho" ? 0 : candidata.estimacion);
  if (horas > evento.capacidadDiaria) return `Ese día acumularías ${horas} h de trabajo frente a ${evento.capacidadDiaria} h disponibles. Cambia al próximo día viable o revisa/reduce la estimación.`;
  if (candidata.horaInicio) {
    const inicio = minutos(candidata.horaInicio); const fin = inicio + candidata.estimacion * 60;
    const choque = otras.find((t) => t.estado !== "hecho" && t.fechaLimite === candidata.fechaLimite && t.horaInicio && rangosSeCruzan(inicio, fin, minutos(t.horaInicio), minutos(t.horaInicio) + t.estimacion * 60));
    if (choque) return `Hay un choque de horario: "${choque.titulo}" se cruza con esta actividad. Cambia la hora de inicio o el día.`;
  }
  return "";
}
function minutos(hora: string) { const [h, m] = hora.split(":").map(Number); return h * 60 + m; }
function rangosSeCruzan(a: number, b: number, c: number, d: number) { return a < d && c < b; }
function siguienteDiaViable(evento: Evento, candidata: Tarea, otras: Tarea[]) {
  for (let i = 1; i < 30; i++) { const fecha = sumarDias(candidata.fechaLimite, i); if (fecha > evento.fechaInicio) break; const problema = validarTarea(evento, { ...candidata, fechaLimite: fecha }, otras); if (!problema) return fecha; }
  return "";
}

function DetalleEvento() {
  const { id } = useParams<{ id: string }>(); const { eventos, guardar } = useStore();
  const [, setLocation] = useLocation(); const evento = eventos.find((e) => e.id === id);
  const [mostrarAgregar, setMostrarAgregar] = useState(false); const [editar, setEditar] = useState(false); const [tareaEditar, setTareaEditar] = useState<Tarea | null>(null); const [mover, setMover] = useState<Tarea | null>(null);
  if (!evento) return <EmptyState titulo="Evento no encontrado" copy="Puede que haya sido eliminado o que el enlace ya no sea válido." accion={<Link href="/eventos" className="button button-secondary" data-testid="link-missing-event">Volver a eventos</Link>} />;
  const actualizarTarea = (tarea: Tarea) => { const problema = validarTarea(evento, tarea, evento.tareas.filter((t) => t.id !== tarea.id)); if (problema) { window.alert(problema); return false; } guardar(eventos.map((e) => e.id === evento.id ? { ...e, tareas: e.tareas.map((t) => t.id === tarea.id ? tarea : t) } : e), "Gestión actualizada."); return true; };
  const toggle = (tarea: Tarea) => guardar(eventos.map((e) => e.id === evento.id ? { ...e, tareas: e.tareas.map((t) => t.id === tarea.id ? { ...t, estado: t.estado === "hecho" ? "pendiente" as EstadoTarea : "hecho" as EstadoTarea } : t) } : e), tarea.estado === "hecho" ? "Gestión reabierta." : "Gestión marcada como hecha.");
  const eliminarTarea = (tarea: Tarea) => { if (!window.confirm(`¿Eliminar "${tarea.titulo}"?`)) return; guardar(eventos.map((e) => e.id === evento.id ? { ...e, tareas: e.tareas.filter((t) => t.id !== tarea.id) } : e), "Gestión eliminada."); };
  const eliminarEvento = () => { if (!window.confirm(`¿Eliminar "${evento.nombre}" y todas sus gestiones?`)) return; if (guardar(eventos.filter((e) => e.id !== evento.id), "Evento eliminado.")) setLocation("/eventos"); };
  const pendientes = evento.tareas.filter((t) => t.estado !== "hecho"); const completadas = evento.tareas.filter((t) => t.estado === "hecho"); const porcentaje = calcularPorcentaje(evento);
  return <div><Link href="/eventos" className="detail-back" data-testid="link-back-events"><ArrowLeft size={14} /> Todos los eventos</Link><div className="detail-head"><div><div className="eyebrow">{evento.tipo} · {diferenciaDias(hoyISO(), evento.fechaInicio) >= 0 ? `faltan ${diferenciaDias(hoyISO(), evento.fechaInicio)} días` : "evento pasado"}</div><h1 className="detail-title" data-testid="text-event-name">{evento.nombre}</h1><div className="detail-sub"><CalendarDays size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />{fechaHoraBonita(evento.fechaInicio, evento.horaEvento)} · {evento.duracion} h · <MapPin size={14} style={{ verticalAlign: "middle" }} /> {evento.lugar || "Lugar por definir"}</div>{evento.notas && <p className="detail-notes">{evento.notas}</p>}</div><div className="detail-score"><div className="score-number" data-testid="text-event-progress">{porcentaje}%</div><div className="score-label">{evento.tareas.filter((t) => t.estado === "hecho").length}/{evento.tareas.length} gestiones hechas</div><div className="progress-track" style={{ marginTop: 12 }}><div className="progress-fill" style={{ width: `${porcentaje}%` }} /></div></div></div><div className="detail-actions"><button className="button button-primary" onClick={() => setMostrarAgregar((v) => !v)} data-testid="button-add-task"><Plus size={15} /> {mostrarAgregar ? "Cerrar formulario" : "Agregar gestión"}</button><button className="button button-secondary" onClick={() => setEditar(true)} data-testid="button-edit-event"><Pencil size={14} /> Editar / reprogramar</button><button className="button button-danger" onClick={eliminarEvento} data-testid="button-delete-event"><Trash2 size={14} /> Eliminar evento</button></div>{mostrarAgregar && <TaskEditor evento={evento} otras={evento.tareas} onCancel={() => setMostrarAgregar(false)} onSave={(t) => { if (validarTarea(evento, t, evento.tareas)) return false; const ok = guardar(eventos.map((e) => e.id === evento.id ? { ...e, tareas: [...e.tareas, t] } : e), "Gestión agregada."); if (ok) setMostrarAgregar(false); return ok; }} />}{editar && <EventoEditorDialog evento={evento} onClose={() => setEditar(false)} onSave={(actualizado) => { const ok = guardar(eventos.map((e) => e.id === evento.id ? actualizado : e), "Evento actualizado."); if (ok) setEditar(false); }} />}{tareaEditar && <TaskEditorDialog evento={evento} tarea={tareaEditar} onClose={() => setTareaEditar(null)} onSave={(t) => { const ok = actualizarTarea(t); if (ok) setTareaEditar(null); }} />}{mover && <ReprogramarDialog evento={evento} tarea={mover} onClose={() => setMover(null)} onSave={(fecha, hora) => { const actualizado = { ...mover, fechaLimite: fecha, horaLimite: hora }; if (actualizarTarea(actualizado)) setMover(null); }} />}<div className="detail-layout"><section>{pendientes.length ? <><div className="section-head"><div className="section-title-row"><h2 className="section-title">Gestiones abiertas</h2><span className="section-count">{pendientes.length}</span></div></div><div className="task-list">{CATEGORIAS.map((cat) => { const ts = pendientes.filter((t) => t.categoria === cat.id); return ts.length ? <div className="category-block" key={cat.id}><div className="category-head">{cat.nombre}<span className="section-count">{ts.length}</span></div>{ts.map((t) => <FilaTarea key={t.id} tarea={t} eventoId={evento.id} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} onEditar={() => setTareaEditar(t)} onEliminar={() => eliminarTarea(t)} />)}</div> : null; })}</div></> : <EmptyState titulo="Plan despejado" copy="No hay gestiones pendientes. Si el alcance cambia, agrega una nueva gestión." accion={<button className="button button-secondary" onClick={() => setMostrarAgregar(true)} data-testid="button-empty-add-task"><Plus size={14} /> Agregar gestión</button>} />}{completadas.length > 0 && <><div className="section-head"><div className="section-title-row"><h2 className="section-title">Completadas</h2><span className="section-count">{completadas.length}</span></div></div><div className="task-list">{completadas.map((t) => <FilaTarea key={t.id} tarea={t} eventoId={evento.id} onToggle={() => toggle(t)} onReprogramar={() => setMover(t)} />)}</div></>}</section><aside><div className="card side-card"><div className="side-title">Capacidad diaria</div><div className="side-value">{evento.capacidadDiaria} h</div><div className="side-list"><div className="side-row"><span>Abiertas</span><strong>{pendientes.reduce((s, t) => s + t.estimacion, 0)} h</strong></div><div className="side-row"><span>Total planificado</span><strong>{evento.tareas.reduce((s, t) => s + t.estimacion, 0)} h</strong></div><div className="side-row"><span>Fecha del evento</span><strong>{fechaBonita(evento.fechaInicio)}</strong></div></div></div><div className="card side-card"><div className="side-title">Acciones rápidas</div><div className="side-list"><Link href="/hoy" className="button button-ghost" style={{ justifyContent: "flex-start" }} data-testid="link-detail-today"><Compass size={14} /> Ver en Hoy</Link><Link href="/progreso" className="button button-ghost" style={{ justifyContent: "flex-start" }} data-testid="link-detail-progress"><LayoutDashboard size={14} /> Ver progreso</Link></div></div></aside></div></div>;
}

function TaskEditor({ evento, tarea: tareaInicial, otras, onCancel, onSave }: { evento: Evento; tarea?: Tarea; otras: Tarea[]; onCancel: () => void; onSave: (tarea: Tarea) => boolean }) {
  const [tarea, setTarea] = useState<Tarea>(tareaInicial ?? { id: generarId("tsk"), titulo: "", categoria: "otro", prioridad: "media", estado: "pendiente", fechaLimite: evento.fechaInicio, horaLimite: "18:00", horaInicio: "", estimacion: 1 }); const [error, setError] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); const problema = validarTarea(evento, tarea, otras); if (problema) { setError(problema); return; } if (onSave({ ...tarea, horaInicio: tarea.horaInicio || undefined, estimacion: Number(tarea.estimacion) })) setError(""); };
  const viable = error.includes("acumularías") ? siguienteDiaViable(evento, tarea, otras) : "";
  return <form className="card edit-panel" onSubmit={submit} data-testid="form-task-editor"><div className="form-section"><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><h2 className="inline-title">{tareaInicial ? "Editar gestión" : "Nueva gestión"}</h2><p className="muted" style={{ fontSize: 11 }}>El plazo debe dejar espacio real para ejecutarla.</p></div><button type="button" onClick={onCancel} className="button button-small button-ghost button-icon" aria-label="Cerrar formulario" data-testid="button-close-task-form"><X size={14} /></button></div><div className="form-grid"><div className="field full"><label htmlFor="task-title">Qué hay que hacer *</label><input id="task-title" value={tarea.titulo} onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })} autoFocus data-testid="input-task-title" /></div><div className="field"><label htmlFor="task-category">Categoría</label><select id="task-category" value={tarea.categoria} onChange={(e) => setTarea({ ...tarea, categoria: e.target.value })} data-testid="select-task-category">{CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div><div className="field"><label htmlFor="task-priority">Prioridad</label><select id="task-priority" value={tarea.prioridad} onChange={(e) => setTarea({ ...tarea, prioridad: e.target.value as Prioridad })} data-testid="select-task-priority"><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option></select></div><div className="field"><label htmlFor="task-date">Fecha límite *</label><input id="task-date" type="date" max={evento.fechaInicio} value={tarea.fechaLimite} onChange={(e) => setTarea({ ...tarea, fechaLimite: e.target.value })} data-testid="input-task-date" /></div><div className="field"><label htmlFor="task-deadline">Hora límite *</label><input id="task-deadline" type="time" value={tarea.horaLimite} onChange={(e) => setTarea({ ...tarea, horaLimite: e.target.value })} data-testid="input-task-deadline" /></div><div className="field"><label htmlFor="task-start">Inicio programado <span className="muted">(opcional)</span></label><input id="task-start" type="time" value={tarea.horaInicio || ""} onChange={(e) => setTarea({ ...tarea, horaInicio: e.target.value })} data-testid="input-task-start" /><span className="field-hint">Se valida que no choque con otra gestión.</span></div><div className="field"><label htmlFor="task-estimate">Estimación de trabajo (horas) *</label><input id="task-estimate" type="number" min="0.25" step="0.25" value={tarea.estimacion} onChange={(e) => setTarea({ ...tarea, estimacion: Number(e.target.value) })} data-testid="input-task-estimate" /><span className="field-hint">Ej. 1.5 = una hora y media.</span></div></div>{error && <div className="error-box" role="alert" style={{ margin: "16px 0 0" }} data-testid="error-task-form">{error}{viable && <button type="button" className="button button-small button-secondary" style={{ marginLeft: 10 }} onClick={() => { setTarea({ ...tarea, fechaLimite: viable }); setError(""); }} data-testid="button-next-viable-day">Usar {fechaBonita(viable)}</button>}</div>}</div><div className="form-actions"><button type="button" className="button button-ghost" onClick={onCancel} data-testid="button-cancel-task">Cancelar</button><button type="submit" className="button button-primary" data-testid="button-save-task"><Check size={14} /> Guardar gestión</button></div></form>;
}

function TaskEditorDialog({ evento, tarea, onClose, onSave }: { evento: Evento; tarea: Tarea; onClose: () => void; onSave: (t: Tarea) => void }) {
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-edit-task" onMouseDown={(e) => e.stopPropagation()}><div className="dialog-head"><h2 id="dialog-edit-task" className="dialog-title">Editar gestión</h2><button className="button button-small button-ghost button-icon" onClick={onClose} aria-label="Cerrar" data-testid="button-close-edit-task"><X size={14} /></button></div><TaskEditor evento={evento} tarea={tarea} otras={evento.tareas.filter((t) => t.id !== tarea.id)} onCancel={onClose} onSave={(t) => { onSave(t); return true; }} /></div></div>;
}

function ReprogramarDialog({ evento, tarea, onClose, onSave }: { evento: Evento; tarea: Tarea; onClose: () => void; onSave: (fecha: string, hora: string) => void }) {
  const [fecha, setFecha] = useState(tarea.fechaLimite); const [hora, setHora] = useState(tarea.horaLimite); const [error, setError] = useState("");
  const confirmar = (e: FormEvent) => { e.preventDefault(); const problema = validarTarea(evento, { ...tarea, fechaLimite: fecha, horaLimite: hora }, evento.tareas.filter((t) => t.id !== tarea.id)); if (problema) { setError(problema); return; } onSave(fecha, hora); };
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><form className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-reschedule" onSubmit={confirmar} onMouseDown={(e) => e.stopPropagation()}><div className="dialog-head"><div><h2 id="dialog-reschedule" className="dialog-title">Mover gestión</h2><p className="muted" style={{ fontSize: 12, marginTop: 5 }}>{tarea.titulo}</p></div><button type="button" className="button button-small button-ghost button-icon" onClick={onClose} aria-label="Cerrar" data-testid="button-close-reschedule"><X size={14} /></button></div><div className="dialog-body"><p className="muted" style={{ fontSize: 12, marginBottom: 15 }}>El plazo máximo del evento es {fechaHoraBonita(evento.fechaInicio, evento.horaEvento)}. La estimación de esta gestión es {tarea.estimacion} h.</p><div className="form-grid"><div className="field"><label htmlFor="move-date">Nueva fecha</label><input id="move-date" type="date" max={evento.fechaInicio} value={fecha} onChange={(e) => setFecha(e.target.value)} data-testid="input-reschedule-date" /></div><div className="field"><label htmlFor="move-time">Nueva hora límite</label><input id="move-time" type="time" value={hora} onChange={(e) => setHora(e.target.value)} data-testid="input-reschedule-time" /></div></div>{error && <div className="error-box" role="alert" style={{ margin: "15px 0 0" }} data-testid="error-reschedule">{error}</div>}</div><div className="dialog-actions"><button type="button" className="button button-ghost" onClick={onClose} data-testid="button-cancel-reschedule">Cancelar</button><button className="button button-primary" type="submit" data-testid="button-confirm-reschedule"><ArrowRight size={14} /> Confirmar movimiento</button></div></form></div>;
}

function EventoEditorDialog({ evento, onClose, onSave }: { evento: Evento; onClose: () => void; onSave: (evento: Evento) => void }) {
  const [datos, setDatos] = useState({ nombre: evento.nombre, tipo: evento.tipo, fechaInicio: evento.fechaInicio, fechaFin: evento.fechaFin, horaEvento: evento.horaEvento, duracion: String(evento.duracion), lugar: evento.lugar, notas: evento.notas, capacidadDiaria: String(evento.capacidadDiaria) }); const [desplazar, setDesplazar] = useState(true); const [error, setError] = useState("");
  const delta = diferenciaDias(evento.fechaInicio, datos.fechaInicio); const nuevasTareas = desplazar && delta ? evento.tareas.map((t) => ({ ...t, fechaLimite: sumarDias(t.fechaLimite, delta) })) : evento.tareas;
  const submit = (e: FormEvent) => { e.preventDefault(); setError(""); if (!datos.nombre.trim() || !datos.fechaInicio || !datos.fechaFin || datos.fechaFin < datos.fechaInicio || Number(datos.duracion) <= 0 || Number(datos.capacidadDiaria) <= 0) { setError("Completa nombre, fechas y valores mayores que cero."); return; } if (nuevasTareas.some((t) => t.fechaLimite > datos.fechaInicio)) { setError("El nuevo evento quedaría antes que uno o más plazos del plan. Activa el desplazamiento o revisa las fechas."); return; } const acumulado = new Map<string, number>(); nuevasTareas.filter((t) => t.estado !== "hecho").forEach((t) => acumulado.set(t.fechaLimite, (acumulado.get(t.fechaLimite) || 0) + t.estimacion)); const sobre = [...acumulado.entries()].find(([, h]) => h > Number(datos.capacidadDiaria)); if (sobre) { setError(`El ${fechaBonita(sobre[0])} acumula ${sobre[1]} h frente al nuevo límite de ${datos.capacidadDiaria} h. Revisa el plan antes de guardar.`); return; } onSave({ ...evento, ...datos, duracion: Number(datos.duracion), capacidadDiaria: Number(datos.capacidadDiaria), tareas: nuevasTareas }); };
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}><form className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-edit-event" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}><div className="dialog-head"><div><h2 id="dialog-edit-event" className="dialog-title">Editar y reprogramar</h2><p className="muted" style={{ fontSize: 12, marginTop: 5 }}>Elige si el plan logístico se mueve con la nueva fecha.</p></div><button type="button" className="button button-small button-ghost button-icon" onClick={onClose} aria-label="Cerrar" data-testid="button-close-edit-event"><X size={14} /></button></div><div className="dialog-body"><div className="form-grid"><div className="field full"><label htmlFor="edit-event-name">Nombre</label><input id="edit-event-name" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} data-testid="input-edit-event-name" /></div><div className="field"><label htmlFor="edit-event-start">Fecha de inicio</label><input id="edit-event-start" type="date" value={datos.fechaInicio} onChange={(e) => { const inicio = e.target.value; setDatos({ ...datos, fechaInicio: inicio, fechaFin: datos.fechaFin < inicio ? inicio : datos.fechaFin }); }} data-testid="input-edit-event-start" /></div><div className="field"><label htmlFor="edit-event-end">Fecha final</label><input id="edit-event-end" type="date" min={datos.fechaInicio} value={datos.fechaFin} onChange={(e) => setDatos({ ...datos, fechaFin: e.target.value })} data-testid="input-edit-event-end" /></div><div className="field"><label htmlFor="edit-event-time">Hora del evento</label><input id="edit-event-time" type="time" value={datos.horaEvento} onChange={(e) => setDatos({ ...datos, horaEvento: e.target.value })} data-testid="input-edit-event-time" /></div><div className="field"><label htmlFor="edit-event-duration">Duración (h)</label><input id="edit-event-duration" type="number" min="0.5" step="0.5" value={datos.duracion} onChange={(e) => setDatos({ ...datos, duracion: e.target.value })} data-testid="input-edit-event-duration" /></div><div className="field"><label htmlFor="edit-event-capacity">Límite diario (h)</label><input id="edit-event-capacity" type="number" min="1" step="0.5" value={datos.capacidadDiaria} onChange={(e) => setDatos({ ...datos, capacidadDiaria: e.target.value })} data-testid="input-edit-event-capacity" /></div><div className="field"><label htmlFor="edit-event-place">Lugar</label><input id="edit-event-place" value={datos.lugar} onChange={(e) => setDatos({ ...datos, lugar: e.target.value })} data-testid="input-edit-event-place" /></div><div className="field full"><label htmlFor="edit-event-notes">Notas</label><textarea id="edit-event-notes" value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} data-testid="textarea-edit-event-notes" /></div></div><div className="warning-box" style={{ margin: "16px 0 0" }}><label className="checkbox-line"><input type="checkbox" checked={desplazar} onChange={(e) => setDesplazar(e.target.checked)} data-testid="checkbox-shift-plan" /><span><strong>Desplazar plan junto con la fecha</strong><br /><span className="muted">{delta === 0 ? "No hay desplazamiento." : `Moverá ${evento.tareas.length} plazos ${Math.abs(delta)} día${Math.abs(delta) === 1 ? "" : "s"} ${delta > 0 ? "hacia adelante" : "hacia atrás"}.`}</span></span></label></div>{error && <div className="error-box" role="alert" style={{ margin: "15px 0 0" }} data-testid="error-edit-event">{error}</div>}</div><div className="dialog-actions"><button type="button" className="button button-ghost" onClick={onClose} data-testid="button-cancel-edit-event">Cancelar</button><button type="submit" className="button button-primary" data-testid="button-save-edit-event"><Check size={14} /> Guardar cambios</button></div></form></div>;
}

function Progreso() {
  const { eventos } = useStore(); const globales = tareasGlobales(eventos); const total = globales.length; const hechas = globales.filter((t) => t.estado === "hecho").length; const abiertas = total - hechas; const porcentaje = total ? Math.round(hechas / total * 100) : 0; const horasPendientes = globales.filter((t) => t.estado !== "hecho").reduce((s, t) => s + t.estimacion, 0);
  return <div><Encabezado eyebrow="Lectura del plan" titulo="Progreso" descripcion="Una vista compacta para saber cuánto trabajo está cerrado y dónde queda presión logística." />{eventos.length === 0 ? <EmptyState titulo="Sin datos todavía" copy="Crea un evento para empezar a ver el avance real de tu operación." accion={<Link href="/crear" className="button button-primary" data-testid="button-progress-create">Crear evento</Link>} /> : <><div className="stats-grid"><div className="stat"><span className="stat-label">Avance global</span><span className="stat-value" data-testid="text-global-percentage">{porcentaje}%</span><span className="stat-note">{hechas} de {total} gestiones hechas</span></div><div className="stat"><span className="stat-label">Abiertas</span><span className="stat-value">{abiertas}</span><span className="stat-note">Requieren una próxima acción</span></div><div className="stat"><span className="stat-label">Horas abiertas</span><span className="stat-value">{horasPendientes}</span><span className="stat-note">Esfuerzo estimado</span></div><div className="stat"><span className="stat-label">Eventos</span><span className="stat-value">{eventos.length}</span><span className="stat-note">En tu espacio local</span></div></div><div className="card card-pad" style={{ marginBottom: 26 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><h2 className="section-title">Avance verificable</h2><span className="muted tabular">{hechas}/{total} · {porcentaje}%</span></div><div className="progress-track" style={{ marginTop: 15, height: 10 }}><div className="progress-fill" style={{ width: `${porcentaje}%` }} /></div></div><div className="section-head"><h2 className="section-title">Por evento</h2></div><div className="event-grid">{eventos.map((e) => <TarjetaEvento key={e.id} evento={e} />)}</div></>}</div>;
}

export default App;