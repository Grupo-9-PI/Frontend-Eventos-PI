import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  AlertCircle,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
  Sun,
  Moon,
} from "lucide-react";
import {
  Link,
  Route,
  Router as WouterRouter,
  Switch,
  useLocation,
  useParams,
} from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import NotFound from "@/pages/not-found";
import { useAuth } from "./Root";
import {
  combinarFechaHora,
  hoursToTime,
  timeToHours,
  diferenciaDias,
  fechaBonita,
  fechaHoraBonita,
  generarId,
  hoyISO,
  repositorioConfiguracion,
  repositorioEventos,
  repositorioHoy,
  sumarDias,
  type ConflictoSobrecarga,
  type Evento,
  type EstadoSubtarea,
  type GruposHoy,
  type Prioridad,
  type RespuestaHoy,
  type RespuestaResolverConflicto,
  type Resultado,
  type ResultadoReprogramacion,
  type Subtarea,
  type TareaHoy,
} from "@/lib/repositorioEventos";
import "./index.css";

type Aviso = { tipo: "success" | "error"; texto: string };
type Store = {
  eventos: Evento[];
  hoy: RespuestaHoy | null;
  cargando: boolean;
  errorCarga: string;
  aviso: Aviso | null;
  limiteDiario: number;
  refrescar: () => void;
  quitarAviso: () => void;
  actualizarLimiteDiario: (horas: number) => Promise<string | null>;
  reprogramarSubtarea: (
    id: string,
    cambios: { fechaLimite: string; horaLimite: string; estimacion: number },
  ) => Promise<ResultadoReprogramacion>;
  resolverConflictoSubtarea: (
    id: string,
    estrategia: "mover_otro_dia" | "reducir_horas",
    datos: { plazo?: string; horaLimite?: string; estimacion?: number },
  ) => Promise<Resultado<RespuestaResolverConflicto>>;
  crearEventoCompleto: (
    evento: Omit<Evento, "id" | "subtareas" | "creadoEn">,
    tareas: Omit<Subtarea, "id">[],
  ) => Promise<string | null>;
  actualizarEvento: (
    id: string,
    evento: Omit<Evento, "id" | "subtareas" | "creadoEn">,
  ) => Promise<boolean>;
  eliminarEvento: (id: string) => Promise<boolean>;
  crearSubtarea: (
    eventoId: string,
    subtarea: Omit<Subtarea, "id">,
  ) => Promise<boolean>;
  actualizarSubtarea: (
    eventoId: string,
    subtarea: Subtarea,
  ) => Promise<boolean>;
  eliminarSubtarea: (eventoId: string, subtareaId: string) => Promise<boolean>;
};
const StoreContext = createContext<Store | null>(null);
function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("El organizador necesita su proveedor de datos.");
  return store;
}

function useDatos(activo: boolean) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [hoy, setHoy] = useState<RespuestaHoy | null>(null);
  const [limiteDiario, setLimiteDiario] = useState(LIMITE_DIARIO_PREDETERMINADO);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const cargarTodo = async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true);
    const inicio = Date.now();
    const [resEventos, resHoy, resConfig] = await Promise.all([
      repositorioEventos.cargar(),
      repositorioHoy.cargar(),
      repositorioConfiguracion.cargar(),
    ]);
    const errores: string[] = [];
    if (resEventos.ok) setEventos(resEventos.data);
    else errores.push(resEventos.error);
    if (resHoy.ok) setHoy(resHoy.data);
    else errores.push(resHoy.error);
    if (resConfig.ok) setLimiteDiario(resConfig.data);
    else errores.push(resConfig.error);
    setErrorCarga(errores.length ? errores.join(" ") : "");
    if (mostrarCarga) {
      // Tiempo mínimo visible para que el esqueleto no parpadee con respuestas rapidas.
      const restante = 600 - (Date.now() - inicio);
      if (restante > 0) {
        await new Promise((resolver) => window.setTimeout(resolver, restante));
      }
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!activo) {
      setEventos([]);
      setHoy(null);
      setLimiteDiario(LIMITE_DIARIO_PREDETERMINADO);
      setErrorCarga("");
      setCargando(false);
      return;
    }
    cargarTodo();
  }, [activo]);

  useEffect(() => {
    if (!aviso) return;
    const timer = window.setTimeout(() => setAviso(null), 3800);
    return () => window.clearTimeout(timer);
  }, [aviso]);

  const notifyError = (err: string) => setAviso({ tipo: "error", texto: err });
  const notifySuccess = (msg: string) =>
    setAviso({ tipo: "success", texto: msg });

  const crearEventoCompleto = async (
    evento: Omit<Evento, "id" | "subtareas" | "creadoEn">,
    tareas: Omit<Subtarea, "id">[],
  ) => {
    const res = await repositorioEventos.crearEvento(evento);
    if (!res.ok) {
      notifyError(res.error);
      return null;
    }
    const fallidas: string[] = [];
    for (const t of tareas) {
      const creada = await repositorioEventos.crearSubtarea(res.data.id, t);
      if (!creada.ok) fallidas.push(t.titulo);
    }
    await cargarTodo(false);
    if (fallidas.length) {
      notifyError(
        `El evento se creó, pero no se pudieron guardar ${fallidas.length} gestión(es): ${fallidas.join(", ")}.`,
      );
    } else {
      notifySuccess("Evento y plan inicial guardados.");
    }
    return res.data.id;
  };
  const actualizarEvento = async (
    id: string,
    e: Omit<Evento, "id" | "subtareas" | "creadoEn">,
  ) => {
    const res = await repositorioEventos.actualizarEvento(id, e);
    if (!res.ok) {
      notifyError(res.error);
      return false;
    }
    await cargarTodo(false);
    notifySuccess("Evento actualizado.");
    return true;
  };
  const eliminarEvento = async (id: string) => {
    const res = await repositorioEventos.eliminarEvento(id);
    if (!res.ok) {
      notifyError(res.error);
      return false;
    }
    await cargarTodo(false);
    notifySuccess("Evento eliminado.");
    return true;
  };
  const crearSubtarea = async (eId: string, t: Omit<Subtarea, "id">) => {
    const res = await repositorioEventos.crearSubtarea(eId, t);
    if (!res.ok) {
      notifyError(res.error);
      return false;
    }
    await cargarTodo(false);
    notifySuccess("Gestión agregada.");
    return true;
  };
  const actualizarSubtarea = async (eId: string, t: Subtarea) => {
    const res = await repositorioEventos.actualizarSubtarea(eId, t);
    if (!res.ok) {
      notifyError(res.error);
      return false;
    }
    await cargarTodo(false);
    notifySuccess("Gestión actualizada.");
    return true;
  };
  const eliminarSubtarea = async (_eId: string, tId: string) => {
    const res = await repositorioEventos.eliminarSubtarea(tId);
    if (!res.ok) {
      notifyError(res.error);
      return false;
    }
    await cargarTodo(false);
    notifySuccess("Gestión eliminada.");
    return true;
  };
  const actualizarLimiteDiario = async (horas: number) => {
    const res = await repositorioConfiguracion.actualizar(horas);
    if (!res.ok) return res.error;
    setLimiteDiario(res.data);
    return null;
  };
  const reprogramarSubtarea = async (
    id: string,
    cambios: { fechaLimite: string; horaLimite: string; estimacion: number },
  ) => {
    const res = await repositorioEventos.reprogramar(id, cambios);
    if (res.ok) {
      await cargarTodo(false);
      notifySuccess(
        `Fecha actualizada: la gestión se movió al ${fechaHoraBonita(cambios.fechaLimite)}.`,
      );
    }
    return res;
  };
  const resolverConflictoSubtarea = async (
    id: string,
    estrategia: "mover_otro_dia" | "reducir_horas",
    datos: { plazo?: string; horaLimite?: string; estimacion?: number },
  ) => {
    const res = await repositorioEventos.resolverConflicto(id, estrategia, datos);
    if (res.ok) {
      await cargarTodo(false);
      if (res.data.resuelto) {
        notifySuccess(
          "Conflicto resuelto: el plan del día quedó dentro de tu capacidad.",
        );
      }
    }
    return res;
  };

  return {
    eventos,
    hoy,
    cargando,
    errorCarga,
    aviso,
    limiteDiario,
    refrescar: cargarTodo,
    quitarAviso: () => setAviso(null),
    actualizarLimiteDiario,
    reprogramarSubtarea,
    resolverConflictoSubtarea,
    crearEventoCompleto,
    actualizarEvento,
    eliminarEvento,
    crearSubtarea,
    actualizarSubtarea,
    eliminarSubtarea,
  };
}

function App() {
  const { loggedIn } = useAuth();
  const datos = useDatos(loggedIn);
  return (
    <StoreContext.Provider value={datos}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/login" component={LoginPage} />
            <Route path="/registro" component={RegisterPage} />
            <Route path="/recuperar" component={RecuperarPasswordPage} />
            <Route>
              <ProtectedRoute>
                <Shell />
              </ProtectedRoute>
            </Route>
          </Switch>
        </RoutedErrorBoundary>
      </WouterRouter>
    </StoreContext.Provider>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function InfoReglaPrioridad() {
  const [abiertoHover, setAbiertoHover] = useState(false);
  const [abiertoClick, setAbiertoClick] = useState(false);
  const [alinearDerecha, setAlinearDerecha] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const abierto = abiertoHover || abiertoClick;

  useEffect(() => {
    if (!abierto) return;

    if (contenedorRef.current) {
      const rect = contenedorRef.current.getBoundingClientRect();
      setAlinearDerecha(rect.left + 350 > window.innerWidth);
    }

    const handleClickFuera = (e: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(e.target as Node)
      ) {
        setAbiertoClick(false);
        setAbiertoHover(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbiertoClick(false);
        setAbiertoHover(false);
      }
    };

    document.addEventListener("mousedown", handleClickFuera);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickFuera);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [abierto]);

  return (
    <div
      ref={contenedorRef}
      onMouseEnter={() => setAbiertoHover(true)}
      onMouseLeave={() => setAbiertoHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        position: "relative",
        marginLeft: 12,
        verticalAlign: "middle",
      }}
    >
      <button
        type="button"
        onClick={() => setAbiertoClick((prev) => !prev)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="¿Cómo se ordena?"
        style={{
          background: "transparent",
          border: "none",
          padding: "4px 6px",
          borderRadius: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          cursor: "pointer",
          color: abierto ? "var(--papel)" : "var(--apagado)",
          fontSize: 12,
          fontWeight: 500,
          transition: "color 0.15s ease",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--papel)";
        }}
        onMouseLeave={(e) => {
          if (!abierto) {
            e.currentTarget.style.color = "var(--apagado)";
          }
        }}
      >
        <HelpCircle size={14} style={{ flexShrink: 0 }} />
        <span>¿Cómo se ordena?</span>
      </button>

      {abierto && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: alinearDerecha ? "auto" : 0,
            right: alinearDerecha ? 0 : "auto",
            zIndex: 1000,
            width: 340,
            maxWidth: "calc(100vw - 32px)",
            background: "#18181b",
            color: "#f3f4f6",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 8,
            padding: "14px 16px",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
            textAlign: "left",
            lineHeight: 1.5,
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: "#ffffff",
              marginBottom: 6,
              letterSpacing: "-0.01em",
            }}
          >
            Regla de prioridad
          </div>
          <div
            style={{
              margin: 0,
              fontSize: 12,
              color: "#d1d5db",
              lineHeight: 1.5,
            }}
          >
            Primero las gestiones vencidas (cuya fecha y hora límite ya pasó),
            después las que vencen hoy y al final las próximas. Dentro de cada
            grupo va arriba la fecha más cercana y, si dos coinciden, la de
            menor esfuerzo estimado.
          </div>
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { logout, usuario } = useAuth();
  const [tema, setTema] = useState(() => {
    const saved = localStorage.getItem("tema");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  });
  const { eventos, hoy, cargando } = useStore();
  const [location, setLocation] = useLocation();
  const retrasadas = hoy?.grupos.vencidas.length ?? 0;
  const activos = eventos.filter(
    (e) =>
      diferenciaDias(hoyISO(), e.fechaInicio) >= 0 ||
      e.subtareas.some((t) => t.estado !== "hecho"),
  ).length;
  const [eventoActivo, setEventoActivo] = useState("");
  const navegarEvento = (id: string) => {
    setEventoActivo(id);
    if (id) setLocation("/evento/" + id);
  };
  const nav = [
    {
      href: "/hoy",
      label: "Hoy",
      icon: Compass,
      count: retrasadas ? String(retrasadas) : undefined,
    },
    {
      href: "/eventos",
      label: "Eventos",
      icon: CalendarDays,
      count: activos ? String(activos) : undefined,
    },
    { href: "/progreso", label: "Progreso", icon: LayoutDashboard },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <Link href="/hoy" className="brand" data-testid="link-brand">
          <span className="brand-mark">EO</span>
          <span>
            <span className="brand-name">EventOps</span>
            <span className="brand-sub">mesa de control</span>
          </span>
        </Link>
        <div className="nav-label">Espacio de trabajo</div>
        <nav className="nav-group">
          {nav.map(({ href, label, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              className={"nav-link" + (location === href ? " active" : "")}
            >
              <Icon size={16} strokeWidth={1.7} />
              <span>{label}</span>
              {count && <span className="count">{count}</span>}
            </Link>
          ))}
        </nav>
        <div className="nav-label" style={{ marginTop: 28 }}>
          Acción
        </div>
        <Link href="/crear" className="nav-link">
          <Plus size={16} strokeWidth={1.7} />
          <span>Crear evento</span>
        </Link>
        <div className="sidebar-footer" style={{ border: "none" }}></div>
        <div
          style={{
            marginTop: "auto",
            paddingTop: "20px",
            borderTop: "1px solid var(--linea)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div
              style={{ fontSize: 13, fontWeight: 600, color: "var(--papel)" }}
            >
              {usuario?.nombre}
            </div>
            <div style={{ fontSize: 11, color: "var(--apagado)" }}>
              {usuario?.email}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 15,
            }}
          >
            <button
              onClick={() => {
                const t = tema === "light" ? "dark" : "light";
                document.documentElement.setAttribute("data-theme", t);
                localStorage.setItem("tema", t);
                setTema(t);
              }}
              title="Alternar modo claro/oscuro"
              style={{
                background: tema === "light" ? "#e2e8f0" : "#1e293b",
                border: "none",
                borderRadius: 20,
                width: 50,
                height: 26,
                display: "flex",
                alignItems: "center",
                padding: 3,
                cursor: "pointer",
                justifyContent: tema === "light" ? "flex-start" : "flex-end",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: tema === "light" ? "#fff" : "#fff",
                  color: tema === "light" ? "#e2e8f0" : "#1e293b",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                {tema === "light" ? (
                  <Sun size={12} color="#000" />
                ) : (
                  <Moon size={12} color="#000" />
                )}
              </div>
            </button>
          </div>
          <button
            className="button button-primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              logout();
              setLocation("/login");
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="mobile-top">
          <Link href="/hoy" className="brand">
            <span className="brand-mark">EO</span>
            <span className="brand-name">EventOps</span>
          </Link>
          <nav className="mobile-menu">
            {nav.slice(0, 3).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={location === href ? "active" : ""}
                aria-label={label}
              >
                <Icon size={16} />
              </Link>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                const t = tema === "light" ? "dark" : "light";
                document.documentElement.setAttribute("data-theme", t);
                localStorage.setItem("tema", t);
                setTema(t);
              }}
              style={{
                background: tema === "light" ? "#e2e8f0" : "#1e293b",
                border: "none",
                borderRadius: 20,
                width: 50,
                height: 26,
                display: "flex",
                alignItems: "center",
                padding: 3,
                cursor: "pointer",
                justifyContent: tema === "light" ? "flex-start" : "flex-end",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                {tema === "light" ? (
                  <Sun size={12} color="#000" />
                ) : (
                  <Moon size={12} color="#000" />
                )}
              </div>
            </button>
            <button
              className="button button-primary button-small"
              onClick={() => {
                logout();
                setLocation("/login");
              }}
            >
              Salir
            </button>
          </div>
        </header>
        <div
          style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 48px 0" }}
          className="active-picker"
        >
          <label
            htmlFor="selector-evento-activo"
            className="muted"
            style={{ fontSize: 11, marginRight: 9 }}
          >
            Evento activo
          </label>
          <select
            id="selector-evento-activo"
            value={eventoActivo}
            onChange={(e) => navegarEvento(e.target.value)}
            style={{
              width: "auto",
              minWidth: 220,
              padding: "7px 9px",
              fontSize: 12,
            }}
          >
            <option value="">Consultar eventos…</option>
            {eventos
              .filter(
                (e) =>
                  diferenciaDias(hoyISO(), e.fechaInicio) >= 0 ||
                  e.subtareas.some((t) => t.estado !== "hecho"),
              )
              .map((evento) => (
                <option key={evento.id} value={evento.id}>
                  {evento.nombre}
                </option>
              ))}
          </select>
          <InfoReglaPrioridad />
        </div>
        <main className="content">
          {cargando ? (
            <Loading />
          ) : (
            <Switch>
              <Route path="/" component={RedireccionInicio} />
              <Route path="/hoy" component={Hoy} />
              <Route path="/eventos" component={Eventos} />
              <Route path="/crear" component={CrearEvento} />
              <Route path="/evento/:id" component={DetalleEvento} />
              <Route path="/progreso" component={Progreso} />
              <Route component={NotFound} />
            </Switch>
          )}
        </main>
      </div>
      <Feedback />
    </div>
  );
}

function RedireccionInicio() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/hoy");
  }, [setLocation]);
  return <Loading />;
}
function Loading() {
  return (
    <div className="loading">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
function Feedback() {
  const { aviso, quitarAviso } = useStore();
  if (!aviso) return null;
  return (
    <div
      className="toast"
      role="status"
      style={
        aviso.tipo === "error"
          ? {
              background: "#45261f",
              borderColor: "rgba(209,81,47,.55)",
              color: "#f0b4a5",
            }
          : undefined
      }
    >
      {aviso.texto}
      <button
        onClick={quitarAviso}
        style={{
          background: "none",
          border: 0,
          color: "inherit",
          float: "right",
          padding: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function Encabezado({
  eyebrow,
  titulo,
  descripcion,
  accion,
}: {
  eyebrow?: string;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{titulo}</h1>
        {descripcion && <p className="page-description">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
function EmptyState({
  titulo,
  copy,
  accion,
}: {
  titulo: string;
  copy: string;
  accion?: ReactNode;
}) {
  return (
    <div className="empty">
      <ListChecks className="empty-icon" size={25} />
      <div className="empty-title">{titulo}</div>
      <p className="empty-copy">{copy}</p>
      {accion}
    </div>
  );
}
function calcularPorcentaje(evento: Evento) {
  return evento.subtareas.length
    ? Math.round(
        (evento.subtareas.filter((t) => t.estado === "hecho").length /
          evento.subtareas.length) *
          100,
      )
    : 0;
}
function estaVencida(tarea: { fechaLimite: string; horaLimite: string }) {
  return combinarFechaHora(tarea.fechaLimite, tarea.horaLimite) < Date.now();
}
function estadoFecha(tarea: { fechaLimite: string; horaLimite: string }) {
  if (estaVencida(tarea)) return "overdue";
  return diferenciaDias(hoyISO(), tarea.fechaLimite) === 0 ? "today" : "";
}
function textoPlazo(tarea: Subtarea) {
  if (estaVencida(tarea)) {
    const dias = diferenciaDias(hoyISO(), tarea.fechaLimite);
    return dias === 0
      ? "Vencida hoy · " + tarea.horaLimite
      : "Retrasada · " + fechaHoraBonita(tarea.fechaLimite, tarea.horaLimite);
  }
  return diferenciaDias(hoyISO(), tarea.fechaLimite) === 0
    ? "Hoy · " + tarea.horaLimite
    : fechaHoraBonita(tarea.fechaLimite, tarea.horaLimite);
}
function FilaTarea({
  tarea,
  mostrarEvento,
  onToggle,
  onReprogramar,
  onEditar,
  onEliminar,
}: {
  tarea: Subtarea & { eventoNombre?: string };
  mostrarEvento?: boolean;
  onToggle: () => void;
  onReprogramar: () => void;
  onEditar?: () => void;
  onEliminar?: () => void;
}) {
  const fecha = estadoFecha(tarea);
  return (
    <div className={"task-row " + fecha}>
      <input
        className="task-check"
        type="checkbox"
        checked={tarea.estado === "hecho"}
        onChange={onToggle}
      />
      <div className="task-main">
        <div
          className={"task-title" + (tarea.estado === "hecho" ? " done" : "")}
        >
          {tarea.titulo}
        </div>
        <div className="task-meta">
          <span>
            {mostrarEvento && <strong>{tarea.eventoNombre} · </strong>}
            {textoPlazo(tarea)}
          </span>
          <span>{hoursToTime(tarea.estimacion)} horas estimadas</span>
          {tarea.horaInicio && <span>Inicio {tarea.horaInicio}</span>}
          {tarea.estado === "en_progreso" && (
            <span className="tag tag-urgent">En curso</span>
          )}
          {tarea.estado === "hecho" && (
            <span className="tag tag-done">Hecha</span>
          )}
        </div>
      </div>
      <div className="task-actions">
        {onEditar && (
          <button
            className="button button-small button-ghost button-icon"
            onClick={onEditar}
          >
            <Pencil size={13} />
          </button>
        )}
        <button
          className="button button-small button-secondary"
          onClick={onReprogramar}
        >
          <Clock3 size={13} /> Mover
        </button>
        {onEliminar && (
          <button
            className="button button-small button-danger button-icon"
            onClick={onEliminar}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

const LIMITE_DIARIO_PREDETERMINADO = 6;
const PRESUPUESTO_EVENTO_PREDETERMINADO = 6;

function clavePresupuestoEvento(usuarioId: number | null, eventoId: string) {
  return `eventops:presupuesto-trabajo:${usuarioId ?? "anonimo"}:${eventoId}`;
}

function totalHorasEvento(evento: Evento) {
  return Number(
    evento.subtareas
      .reduce((total, tarea) => total + tarea.estimacion, 0)
      .toFixed(2),
  );
}

function leerPresupuestoEvento(evento: Evento, usuarioId: number | null) {
  const minimoPlanificado = totalHorasEvento(evento);
  const porDefecto = Math.max(
    PRESUPUESTO_EVENTO_PREDETERMINADO,
    minimoPlanificado,
  );
  try {
    const guardado = localStorage.getItem(
      clavePresupuestoEvento(usuarioId, evento.id),
    );
    const numero = Number(guardado);
    if (guardado !== null && Number.isFinite(numero) && numero > 0)
      return numero;
    // Los planes previos al presupuesto reciben un valor local que nunca invalida sus gestiones existentes.
    localStorage.setItem(
      clavePresupuestoEvento(usuarioId, evento.id),
      String(porDefecto),
    );
  } catch {
    // Si el navegador bloquea localStorage, la vista sigue usando un presupuesto seguro derivado del plan.
  }
  return porDefecto;
}

function guardarPresupuestoEvento(
  usuarioId: number | null,
  eventoId: string,
  horas: number,
) {
  try {
    localStorage.setItem(
      clavePresupuestoEvento(usuarioId, eventoId),
      String(horas),
    );
    return true;
  } catch {
    return false;
  }
}

function puedeGuardarPresupuestoEvento(usuarioId: number | null) {
  const clave = `eventops:prueba-almacenamiento:${usuarioId ?? "anonimo"}`;
  try {
    const anterior = localStorage.getItem(clave);
    localStorage.setItem(clave, "ok");
    if (anterior === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, anterior);
    return true;
  } catch {
    return false;
  }
}

function formatoHoras(horas: number) {
  return Number(horas.toFixed(2)).toLocaleString("es-CO", {
    maximumFractionDigits: 2,
  });
}

function validarCapacidadesTarea(
  eventos: Evento[],
  eventoId: string,
  candidata: Subtarea,
  usuarioId: number | null,
  limiteDiario: number,
  tareaExistenteId?: string,
) {
  if (!puedeGuardarPresupuestoEvento(usuarioId)) {
    return "Este navegador no permite validar ni guardar el presupuesto local del evento. Habilita el almacenamiento local e inténtalo de nuevo.";
  }
  const evento = eventos.find((e) => e.id === eventoId);
  if (!evento) return "No se encontró el evento para validar sus capacidades.";
  const presupuesto = leerPresupuestoEvento(evento, usuarioId);
  const totalActual = totalHorasEvento(evento);
  const anterior = tareaExistenteId
    ? evento.subtareas.find((t) => t.id === tareaExistenteId)
    : undefined;
  const totalEvento = Number(
    (totalActual - (anterior?.estimacion ?? 0) + candidata.estimacion).toFixed(
      2,
    ),
  );
  const totalDia = sumarHorasAbiertas(
    eventos,
    candidata.fechaLimite,
    tareaExistenteId ? { eventoId, tareaId: tareaExistenteId } : undefined,
    candidata.estado === "hecho" ? 0 : candidata.estimacion,
  );
  const mensajes: string[] = [];
  if (totalEvento > presupuesto) {
    mensajes.push(
      `El evento quedaría en ${formatoHoras(totalEvento)} h de ${formatoHoras(presupuesto)} h de presupuesto total (exceso ${formatoHoras(totalEvento - presupuesto)} h).`,
    );
  }
  if (totalDia > limiteDiario) {
    mensajes.push(
      `El ${fechaBonita(candidata.fechaLimite, true)} quedaría en ${formatoHoras(totalDia)} h de ${limiteDiario} h de capacidad diaria (exceso ${formatoHoras(totalDia - limiteDiario)} h).`,
    );
  }
  return mensajes.length ? mensajes.join(" ") : "";
}

function sumarHorasAbiertas(
  eventos: Evento[],
  fecha: string,
  excluir?: { eventoId: string; tareaId: string },
  horasDeTareaMovida = 0,
) {
  const otrasHoras = eventos.reduce(
    (sumaEventos, evento) =>
      sumaEventos +
      evento.subtareas.reduce((sumaTareas, tarea) => {
        if (
          tarea.estado === "hecho" ||
          tarea.fechaLimite !== fecha ||
          (excluir?.eventoId === evento.id && excluir.tareaId === tarea.id)
        )
          return sumaTareas;
        return sumaTareas + tarea.estimacion;
      }, 0),
    0,
  );
  return Number((otrasHoras + horasDeTareaMovida).toFixed(2));
}

function CapacidadDiariaHoy({
  eventos,
  fecha,
}: {
  eventos: Evento[];
  fecha: string;
}) {
  const { limiteDiario, actualizarLimiteDiario } = useStore();
  const [borrador, setBorrador] = useState(String(limiteDiario));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const carga = sumarHorasAbiertas(eventos, fecha);

  useEffect(() => {
    setBorrador(String(limiteDiario));
  }, [limiteDiario]);

  const guardarLimite = async (event: FormEvent) => {
    event.preventDefault();
    const numero = Number(borrador);
    if (!/^\d+$/.test(borrador.trim()) || numero < 1 || numero > 16) {
      setError("El límite debe ser un número entero entre 1 y 16 horas.");
      setGuardado(false);
      return;
    }
    setGuardando(true);
    const errorGuardado = await actualizarLimiteDiario(numero);
    setGuardando(false);
    if (errorGuardado) {
      setError(errorGuardado);
      setGuardado(false);
      return;
    }
    setError("");
    setGuardado(true);
  };

  return (
    <section
      className="daily-capacity-card card"
      aria-labelledby="daily-capacity-title"
    >
      <div className="daily-capacity-copy">
        <div className="eyebrow">CAPACIDAD DEL ORGANIZADOR</div>
        <h2 id="daily-capacity-title">Límite de trabajo diario</h2>
        <p>
          Define cuántas horas de gestiones abiertas quieres planificar por día.
        </p>
        <div
          className={`daily-capacity-total${carga > limiteDiario ? " over" : ""}`}
          data-testid="daily-capacity-total"
          aria-live="polite"
        >
          <strong>{formatoHoras(carga)} h</strong> planificadas hoy de{" "}
          <strong>{formatoHoras(limiteDiario)} h</strong>
          {carga > limiteDiario && (
            <span>
              Se supera el límite por {formatoHoras(carga - limiteDiario)} h.
            </span>
          )}
        </div>
      </div>
      <form className="daily-capacity-form" onSubmit={guardarLimite} noValidate>
        <div className="field">
          <label htmlFor="daily-capacity-input">Horas máximas por día</label>
          <div className="daily-capacity-input">
            <input
              id="daily-capacity-input"
              data-testid="daily-capacity-input"
              type="number"
              min={1}
              max={16}
              step={1}
              value={borrador}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? "daily-capacity-error" : "daily-capacity-help"
              }
              onChange={(event) => {
                setBorrador(event.target.value);
                setGuardado(false);
                if (error) setError("");
              }}
            />
            <span>horas</span>
          </div>
          <small id="daily-capacity-help">
            Número entero de 1 a 16. Se guarda en tu cuenta y aplica a todas
            tus gestiones.
          </small>
          {error && (
            <div
              id="daily-capacity-error"
              className="field-error"
              role="alert"
              data-testid="daily-capacity-error"
            >
              {error}
            </div>
          )}
        </div>
        <div className="daily-capacity-actions">
          <button
            className="button button-secondary button-small"
            type="submit"
            data-testid="save-daily-capacity"
            disabled={guardando}
          >
            {guardando ? "Guardando…" : "Guardar límite"}
          </button>
          {guardado && !error && (
            <span role="status" className="daily-capacity-saved">
              Capacidad actualizada
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Hoy() {
  const { eventos, hoy, errorCarga, refrescar, actualizarSubtarea } =
    useStore();
  const [reprogramar, setReprogramar] = useState<{
    evento: Evento;
    tarea: Subtarea;
  } | null>(null);

  const grupos: GruposHoy = hoy?.grupos ?? {
    vencidas: [],
    para_hoy: [],
    proximas: [],
  };
  const total = hoy?.total ?? 0;

  const cambiarEstado = (tarea: TareaHoy) => {
    actualizarSubtarea(tarea.eventoId, {
      ...tarea,
      estado: tarea.estado === "hecho" ? "pendiente" : "hecho",
    });
  };

  const bloque = (titulo: string, lista: TareaHoy[], vacio: string) => (
    <section className="hoy-section">
      <div className="section-head">
        <div className="section-title-row">
          <h2 className="section-title">{titulo}</h2>
          <span className="section-count">{lista.length}</span>
        </div>
        {titulo === "Vencidas" && lista.length > 0 && (
          <span className="tag tag-overdue">Requieren decisión</span>
        )}
      </div>
      {lista.length ? (
        <div className="task-list">
          {lista.map((t) => (
            <FilaTarea
              key={t.id}
              tarea={t}
              mostrarEvento
              onToggle={() => cambiarEstado(t)}
              onReprogramar={() => {
                const e = eventos.find((ev) => ev.id === t.eventoId);
                if (e) setReprogramar({ evento: e, tarea: t });
              }}
            />
          ))}
        </div>
      ) : (
        <div className="card card-pad muted" style={{ fontSize: 12 }}>
          {vacio}
        </div>
      )}
    </section>
  );

  if (errorCarga) {
    return (
      <div>
        <Encabezado
          eyebrow="Panel de control"
          titulo="Hoy"
          descripcion="No pudimos cargar la información."
        />
        <div className="empty" role="alert">
          <AlertCircle className="empty-icon" size={25} />
          <div className="empty-title">
            Algo salió mal al cargar tus gestiones
          </div>
          <p className="empty-copy">{errorCarga}</p>
          <button className="button button-primary" onClick={refrescar}>
            <RotateCcw size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Encabezado
        eyebrow="Panel de control"
        titulo="Hoy"
        descripcion={
          total
            ? `${total} ${total === 1 ? "gestión abierta" : "gestiones abiertas"}.`
            : "El plan está despejado."
        }
        accion={
          <Link href="/crear" className="button button-primary">
            <Plus size={15} /> Crear evento
          </Link>
        }
      />
      <CapacidadDiariaHoy eventos={eventos} fecha={hoyISO()} />
      {eventos.length === 0 ? (
        <EmptyState
          titulo="Todavía no hay eventos"
          copy="Crea tu primer evento para empezar a organizar sus gestiones."
          accion={
            <Link href="/crear" className="button button-primary">
              Crear evento
            </Link>
          }
        />
      ) : total === 0 ? (
        <EmptyState
          titulo="No hay gestiones pendientes"
          copy="Todas las gestiones están hechas. Puedes revisar tus eventos o crear uno nuevo."
          accion={
            <Link href="/eventos" className="button button-secondary">
              Ver eventos
            </Link>
          }
        />
      ) : (
        <>
          {bloque("Vencidas", grupos.vencidas, "No hay gestiones vencidas.")}
          {bloque("Para hoy", grupos.para_hoy, "Nada vence hoy.")}
          {bloque("Próximas", grupos.proximas, "No hay próximas gestiones.")}
        </>
      )}
      {reprogramar && (
        <ReprogramarDialog
          evento={reprogramar.evento}
          tarea={reprogramar.tarea}
          onClose={() => setReprogramar(null)}
        />
      )}
    </div>
  );
}

function Eventos() {
  const { eventos } = useStore();
  const [filtro, setFiltro] = useState("activos");
  const lista = eventos
    .filter((e) => {
      if (filtro === "todos") return true;
      const isActivo =
        diferenciaDias(hoyISO(), e.fechaInicio) >= 0 ||
        e.subtareas.some((t) => t.estado !== "hecho");
      const isPasado =
        diferenciaDias(hoyISO(), e.fechaInicio) < 0 &&
        e.subtareas.every((t) => t.estado === "hecho");
      if (filtro === "activos") return isActivo;
      if (filtro === "pasados") return isPasado;
      if (filtro === "cancelados") return false;
      if (filtro === "retrasados") return false;
      return true;
    })
    .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  return (
    <div>
      <Encabezado
        eyebrow="Agenda"
        titulo="Eventos"
        descripcion="Consulta el mapa completo."
        accion={
          <Link href="/crear" className="button button-primary">
            <Plus size={15} /> Nuevo evento
          </Link>
        }
      />
      <div className="filter-row" style={{ marginBottom: 18 }}>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="activos">Activos</option>
          <option value="pasados">Pasados</option>
          <option value="cancelados">Cancelados</option>
          <option value="retrasados">Retrasados</option>
          <option value="todos">Todos los eventos</option>
        </select>
        <span className="muted" style={{ fontSize: 12 }}>
          {lista.length} visible
        </span>
      </div>
      {eventos.length === 0 ? (
        <EmptyState
          titulo="El tablero está vacío"
          copy="Crea un evento."
          accion={
            <Link href="/crear" className="button button-primary">
              <Plus size={15} /> Crear evento
            </Link>
          }
        />
      ) : lista.length === 0 ? (
        <EmptyState
          titulo="No hay eventos activos"
          copy="Puedes consultar todos los eventos o crear uno nuevo."
          accion={
            <button
              className="button button-secondary"
              onClick={() => setFiltro("todos")}
            >
              Ver todos
            </button>
          }
        />
      ) : (
        <div className="event-grid">
          {lista.map((evento) => (
            <TarjetaEvento key={evento.id} evento={evento} />
          ))}
        </div>
      )}
    </div>
  );
}
function TarjetaEvento({ evento }: { evento: Evento }) {
  const porcentaje = calcularPorcentaje(evento);
  const pendientes = evento.subtareas.filter(
    (t) => t.estado !== "hecho",
  ).length;
  return (
    <Link href={"/evento/" + evento.id} className="card event-card">
      <div className="event-card-top">
        <div>
          <h2 className="event-name">{evento.nombre}</h2>
        </div>
        <ChevronRight size={17} color="#777" />
      </div>
      <div className="event-info">
        <span>
          <CalendarDays
            size={13}
            style={{ verticalAlign: "middle", marginRight: 6 }}
          />
          {fechaHoraBonita(evento.fechaInicio, evento.horaEvento)}
        </span>
        <span>
          <MapPin
            size={13}
            style={{ verticalAlign: "middle", marginRight: 6 }}
          />
          {evento.lugar || "Lugar por definir"}
        </span>
      </div>
      <div className="event-footer">
        <div className="progress-wrap">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: porcentaje + "%" }}
            />
          </div>
          <span className="progress-text">{porcentaje}%</span>
        </div>
        <span className="muted" style={{ fontSize: 11 }}>
          {pendientes} abiertas
        </span>
      </div>
    </Link>
  );
}

type FormEvento = {
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  horaEvento: string;
  duracion: string;
  presupuestoTrabajo: string;
  lugar: string;
  notas: string;
};
type BorradorTarea = {
  id: string;
  titulo: string;
  categoria: string;
  prioridad: Prioridad;
  fechaLimite: string;
  horaLimite: string;
  horaInicio: string;
  estimacion: string;
};
const formEventoInicial = (): FormEvento => ({
  nombre: "",
  tipo: "Lanzamiento",
  fechaInicio: sumarDias(hoyISO(), 14),
  fechaFin: sumarDias(hoyISO(), 14),
  horaEvento: "19:00",
  duracion: "04:00",
  presupuestoTrabajo: "",
  lugar: "",
  notas: "",
});
const borradorInicial = (): BorradorTarea => ({
  id: generarId("draft"),
  titulo: "",
  categoria: "salon",
  prioridad: "media",
  fechaLimite: sumarDias(hoyISO(), 7),
  horaLimite: "18:00",
  horaInicio: "",
  estimacion: "01:00",
});
function CrearEvento() {
  const [mostrarPlan, setMostrarPlan] = useState(false);
  const { crearEventoCompleto, eventos, limiteDiario } = useStore();
  const { usuario } = useAuth();
  const [, setLocation] = useLocation();
  const [datos, setDatos] = useState<FormEvento>(formEventoInicial);
  const [tareas, setTareas] = useState<BorradorTarea[]>([]);
  const [nuevo, setNuevo] = useState<BorradorTarea>(borradorInicial);
  const [errorNuevo, setErrorNuevo] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  useEffect(() => {
    setTareas((actuales) =>
      actuales.map((t) => ({
        ...t,
        fechaLimite: t.fechaLimite || datos.fechaInicio,
      })),
    );
  }, [datos.fechaInicio]);
  const setCampo = (campo: keyof FormEvento, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setError((errs) => ({ ...errs, [campo]: "" }));
  };
  const añadirTarea = () => {
    const errs: Record<string, string> = {};
    if (!nuevo.titulo.trim()) errs.titulo = "Obligatorio.";
    if (!nuevo.estimacion.trim() || nuevo.estimacion === "00:00")
      errs.estimacion = "Obligatorio.";
    if (Object.keys(errs).length > 0) {
      setErrorNuevo(errs);
      return;
    }
    setErrorNuevo({});
    setTareas((ts) => [...ts, { ...nuevo, id: generarId("draft") }]);
    setNuevo(borradorInicial());
  };

  const aplicarPlanPredefinido = (tipoPlan: string) => {
    if (!tipoPlan) return;
    const plantillas: Record<string, any[]> = {
      conferencia: [
        {
          titulo: "Preparar presentación",
          categoria: "otro",
          prioridad: "alta",
          fechaLimite: datos.fechaInicio,
          horaLimite: "10:00",
          horaInicio: "",
          estimacion: "02:00",
        },
        {
          titulo: "Confirmar salón",
          categoria: "salon",
          prioridad: "alta",
          fechaLimite: datos.fechaInicio,
          horaLimite: "12:00",
          horaInicio: "",
          estimacion: "00:30",
        },
      ],
      fiesta: [
        {
          titulo: "Comprar decoración",
          categoria: "otro",
          prioridad: "media",
          fechaLimite: datos.fechaInicio,
          horaLimite: "15:00",
          horaInicio: "",
          estimacion: "01:00",
        },
        {
          titulo: "Confirmar catering",
          categoria: "catering",
          prioridad: "alta",
          fechaLimite: datos.fechaInicio,
          horaLimite: "12:00",
          horaInicio: "",
          estimacion: "00:30",
        },
      ],
      boda: [
        {
          titulo: "Fotografía",
          categoria: "otro",
          prioridad: "alta",
          fechaLimite: datos.fechaInicio,
          horaLimite: "10:00",
          horaInicio: "",
          estimacion: "02:00",
        },
      ],
      reunion: [
        {
          titulo: "Hacer orden del día",
          categoria: "otro",
          prioridad: "media",
          fechaLimite: datos.fechaInicio,
          horaLimite: "09:00",
          horaInicio: "",
          estimacion: "01:00",
        },
      ],
    };
    const tareasNuevas = (plantillas[tipoPlan] || []).map((t) => ({
      ...t,
      id: generarId("draft"),
    }));
    setTareas(tareasNuevas);
  };

  const intentarSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError({});

    if (mostrarPlan && !tareas.length && nuevo.titulo.trim()) {
      const errs: Record<string, string> = {};
      if (!nuevo.titulo.trim()) errs.titulo = "Obligatorio.";
      if (!nuevo.estimacion.trim() || nuevo.estimacion === "00:00")
        errs.estimacion = "Obligatorio.";
      if (Object.keys(errs).length > 0) {
        setErrorNuevo(errs);
      } else {
        setTareas((ts) => [...ts, { ...nuevo, id: generarId("draft") }]);
        setNuevo(borradorInicial());
        setErrorNuevo({});
      }
    }

    const validacion = validarDatosEvento(datos, tareas, mostrarPlan);
    const presupuesto = Number(datos.presupuestoTrabajo);
    if (!Number.isFinite(presupuesto) || presupuesto <= 0) {
      validacion.presupuestoTrabajo =
        "Indica un presupuesto de trabajo mayor que 0 horas.";
    }
    if (mostrarPlan && tareas.length) {
      const totalPlan = tareas.reduce(
        (suma, t) => suma + timeToHours(t.estimacion),
        0,
      );
      if (totalPlan > presupuesto) {
        validacion.general = `El plan inicial suma ${formatoHoras(totalPlan)} h y el presupuesto del evento es ${formatoHoras(presupuesto)} h; excede por ${formatoHoras(totalPlan - presupuesto)} h.`;
      }
      const porFecha = tareas.reduce<Record<string, number>>((acum, tarea) => {
        acum[tarea.fechaLimite] =
          (acum[tarea.fechaLimite] ?? 0) + timeToHours(tarea.estimacion);
        return acum;
      }, {});
      const conflictosDia = Object.entries(porFecha)
        .map(([fecha, horas]) => ({
          fecha,
          horas: sumarHorasAbiertas(eventos, fecha) + horas,
        }))
        .filter((dia) => dia.horas > limiteDiario);
      if (conflictosDia.length) {
        const detalle = conflictosDia
          .map(
            (dia) =>
              `${fechaBonita(dia.fecha, true)}: ${formatoHoras(dia.horas)} h / ${limiteDiario} h (exceso ${formatoHoras(dia.horas - limiteDiario)} h)`,
          )
          .join("; ");
        validacion.general = `${validacion.general ? `${validacion.general} ` : ""}El plan también supera la capacidad diaria: ${detalle}.`;
      }
    }
    if (!puedeGuardarPresupuestoEvento(usuario?.id ?? null)) {
      validacion.presupuestoTrabajo =
        "Este navegador no permite guardar el presupuesto local. Habilita el almacenamiento local antes de crear el evento.";
    }

    if (mostrarPlan && !tareas.length && Object.keys(errorNuevo).length === 0) {
      setErrorNuevo({ titulo: "Obligatorio", estimacion: "Obligatorio" });
    }

    if (Object.keys(validacion).length > 0) {
      setError(validacion);
      return;
    }
    setMostrarConfirmacion(true);
  };

  const confirmarSubmit = async () => {
    setMostrarConfirmacion(false);
    const eventoPayload = {
      nombre: datos.nombre.trim(),
      tipo: datos.tipo,
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      horaEvento: datos.horaEvento,
      duracion: timeToHours(datos.duracion),
      // presupuestoTrabajo vive solo en el almacenamiento local; nunca se manda al API ni se confunde con duración.
      lugar: datos.lugar.trim(),
      notas: datos.notas.trim(),
      capacidadDiaria: 24,
    };
    const tareasPayload = tareas.map((t) => ({
      titulo: t.titulo.trim(),
      categoria: t.categoria,
      prioridad: t.prioridad,
      estado: "pendiente" as EstadoSubtarea,
      fechaLimite: t.fechaLimite,
      horaLimite: t.horaLimite,
      horaInicio: t.horaInicio || undefined,
      estimacion: timeToHours(t.estimacion),
    }));
    const id = await crearEventoCompleto(eventoPayload, tareasPayload);
    if (id) {
      const guardado = guardarPresupuestoEvento(
        usuario?.id ?? null,
        id,
        Number(datos.presupuestoTrabajo),
      );
      if (!guardado) {
        // La API ya guardó el evento. Si el almacenamiento local está bloqueado, se informa desde el detalle mediante su valor derivado.
      }
      setLocation("/evento/" + id);
    }
  };

  return (
    <div>
      <Encabezado eyebrow="Nuevo plan" titulo="Crear evento" />
      <form onSubmit={intentarSubmit} className="card form-card" noValidate>
        <section className="form-section">
          <h2 className="form-section-title">Identidad del evento</h2>
          <div className="form-grid">
            <div className="field full">
              <label>
                Nombre <span className="req">*</span>
              </label>
              {error.nombre && (
                <div className="field-error">{error.nombre}</div>
              )}
              <input
                className={error.nombre ? "error" : ""}
                value={datos.nombre}
                onChange={(e) => setCampo("nombre", e.target.value)}
              />
            </div>
            <div className="field">
              <label>Tipo</label>
              {error.tipo && <div className="field-error">{error.tipo}</div>}
              <select
                className={error.tipo ? "error" : ""}
                value={
                  [
                    "Lanzamiento",
                    "Fiesta",
                    "Taller",
                    "Reunión",
                    "Conferencia",
                    "",
                  ].includes(datos.tipo)
                    ? datos.tipo
                    : "Otro"
                }
                onChange={(e) => setCampo("tipo", e.target.value)}
              >
                <option value="Lanzamiento">Lanzamiento</option>
                <option value="Fiesta">Fiesta</option>
                <option value="Taller">Taller</option>
                <option value="Reunión">Reunión</option>
                <option value="Conferencia">Conferencia</option>
                <option value="Otro">Otro...</option>
              </select>
            </div>
            <div className="field">
              <label>
                Lugar <span className="req">*</span>
              </label>
              {error.lugar && <div className="field-error">{error.lugar}</div>}
              <input
                className={error.lugar ? "error" : ""}
                value={datos.lugar}
                onChange={(e) => setCampo("lugar", e.target.value)}
              />
            </div>
            {(![
              "Lanzamiento",
              "Fiesta",
              "Taller",
              "Reunión",
              "Conferencia",
              "",
            ].includes(datos.tipo) ||
              datos.tipo === "Otro") && (
              <div className="field full">
                <input
                  placeholder="Escribe el tipo personalizado..."
                  value={datos.tipo === "Otro" ? "" : datos.tipo}
                  onChange={(e) => setCampo("tipo", e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label>
                Inicio <span className="req">*</span>
              </label>
              {error.fechaInicio && (
                <div className="field-error">{error.fechaInicio}</div>
              )}
              <input
                type="date"
                className={error.fechaInicio ? "error" : ""}
                value={datos.fechaInicio}
                onChange={(e) => setCampo("fechaInicio", e.target.value)}
              />
            </div>
            <div className="field">
              <label>
                Fin <span className="req">*</span>
              </label>
              {error.fechaFin && (
                <div className="field-error">{error.fechaFin}</div>
              )}
              <input
                type="date"
                className={error.fechaFin ? "error" : ""}
                value={datos.fechaFin}
                onChange={(e) => setCampo("fechaFin", e.target.value)}
              />
            </div>
            <div className="field">
              <label>
                Hora <span className="req">*</span>
              </label>
              {error.horaEvento && (
                <div className="field-error">{error.horaEvento}</div>
              )}
              <input
                type="time"
                className={error.horaEvento ? "error" : ""}
                value={datos.horaEvento}
                onChange={(e) => setCampo("horaEvento", e.target.value)}
              />
            </div>
            <div className="field">
              <label>
                Duración (horas) <span className="req">*</span>
              </label>
              {error.duracion && (
                <div className="field-error">{error.duracion}</div>
              )}
              <input
                type="text"
                pattern="[0-9]{2}:[0-9]{2}"
                placeholder="00:00"
                maxLength={5}
                className={error.duracion ? "error" : ""}
                value={datos.duracion}
                onChange={(e) => setCampo("duracion", e.target.value)}
                aria-label="Duración del evento en horas y minutos"
              />
            </div>
            <div className="field">
              <label htmlFor="presupuesto-trabajo-evento">
                Presupuesto de trabajo <span className="req">*</span>
              </label>
              {error.presupuestoTrabajo && (
                <div className="field-error" role="alert">
                  {error.presupuestoTrabajo}
                </div>
              )}
              <div className="daily-capacity-input">
                <input
                  id="presupuesto-trabajo-evento"
                  data-testid="event-work-budget-input"
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={datos.presupuestoTrabajo}
                  aria-invalid={Boolean(error.presupuestoTrabajo)}
                  onChange={(e) =>
                    setCampo("presupuestoTrabajo", e.target.value)
                  }
                />
                <span>horas de gestiones</span>
              </div>
              <small className="field-hint">
                Esfuerzo total permitido para todas las gestiones, incluidas las
                completadas. No es la duración real del evento; se guarda solo
                en este navegador.
              </small>
            </div>
            <div className="field full">
              <label>Notas</label>
              <textarea
                value={datos.notas}
                onChange={(e) => setCampo("notas", e.target.value)}
              />
            </div>
          </div>
        </section>
        {!mostrarPlan ? (
          <section
            className="form-section"
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "var(--panel-alt)",
              borderRadius: "var(--radio-lg)",
              margin: "21px",
              border: "1px solid var(--linea)",
            }}
          >
            <button
              type="button"
              className="button button-primary"
              onClick={() => setMostrarPlan(true)}
            >
              + Agregar un plan inicial de gestiones (Opcional)
            </button>
          </section>
        ) : (
          <section className="form-section">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                className="form-section-title"
                style={{ borderBottom: "none", paddingBottom: 0, margin: 0 }}
              >
                Plan inicial
              </h2>
              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <button
                  type="button"
                  className="button button-ghost button-small"
                  onClick={() => setMostrarPlan(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={añadirTarea}
                >
                  <Plus size={14} /> Agregar plan inicial
                </button>
              </div>
            </div>
            <div className="task-builder">
              <div style={{ marginBottom: "15px" }}>
                <select
                  onChange={(e) => aplicarPlanPredefinido(e.target.value)}
                  defaultValue=""
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--linea)",
                    background: "var(--panel-alt)",
                    color: "var(--text)",
                  }}
                >
                  <option value="" disabled>
                    Cargar plantilla rápida...
                  </option>
                  <option value="conferencia">Plan Conferencia</option>
                  <option value="fiesta">Plan Fiesta</option>
                  <option value="boda">Plan Boda</option>
                  <option value="reunion">Plan Reunión</option>
                </select>
              </div>
              {tareas.map((t, index) => (
                <div
                  className="card card-pad"
                  style={{
                    border: "1px solid var(--linea-fuerte)",
                    background: "var(--panel)",
                    marginBottom: 10,
                    position: "relative",
                  }}
                  key={t.id}
                >
                  <button
                    type="button"
                    className="button button-small button-danger button-icon"
                    style={{ position: "absolute", top: 10, right: 10 }}
                    onClick={() =>
                      setTareas((ts) => ts.filter((x) => x.id !== t.id))
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                  <div
                    className="form-grid"
                    style={{ gridTemplateColumns: "1fr 1fr", marginTop: 15 }}
                  >
                    <div className="field">
                      <label>
                        Gestión {index + 1} <span className="req">*</span>
                      </label>
                      <input
                        value={t.titulo}
                        onChange={(e) =>
                          setTareas((ts) =>
                            ts.map((x) =>
                              x.id === t.id
                                ? { ...x, titulo: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="field">
                      <label>
                        Estimación (horas) <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        pattern="[0-9]{2}:[0-9]{2}"
                        placeholder="00:00"
                        maxLength={5}
                        value={t.estimacion}
                        onChange={(e) =>
                          setTareas((ts) =>
                            ts.map((x) =>
                              x.id === t.id
                                ? { ...x, estimacion: e.target.value }
                                : x,
                            ),
                          )
                        }
                        aria-label="Estimación de la gestión en horas y minutos"
                      />
                    </div>
                    <div className="field">
                      <label>Plazo</label>
                      <input
                        type="date"
                        data-testid="initial-plan-deadline"
                        value={t.fechaLimite}
                        onChange={(e) =>
                          setTareas((ts) =>
                            ts.map((x) =>
                              x.id === t.id
                                ? { ...x, fechaLimite: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Hora</label>
                      <input
                        type="time"
                        value={t.horaLimite}
                        onChange={(e) =>
                          setTareas((ts) =>
                            ts.map((x) =>
                              x.id === t.id
                                ? { ...x, horaLimite: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div
                className="card card-pad"
                style={{
                  border: "1px solid var(--primary)",
                  background: "var(--panel-alt)",
                }}
              >
                <div
                  className="form-grid"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <div className="field">
                    <label>
                      Nueva gestión <span className="req">*</span>
                    </label>
                    {errorNuevo.titulo && (
                      <div className="field-error">{errorNuevo.titulo}</div>
                    )}
                    <input
                      className={errorNuevo.titulo ? "error" : ""}
                      value={nuevo.titulo}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, titulo: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>
                      Estimación (horas) <span className="req">*</span>
                    </label>
                    {errorNuevo.estimacion && (
                      <div className="field-error">{errorNuevo.estimacion}</div>
                    )}
                    <input
                      type="text"
                      pattern="[0-9]{2}:[0-9]{2}"
                      placeholder="00:00"
                      maxLength={5}
                      className={errorNuevo.estimacion ? "error" : ""}
                      value={nuevo.estimacion}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, estimacion: e.target.value })
                      }
                      aria-label="Estimación de la gestión en horas y minutos"
                    />
                  </div>
                  <div className="field">
                    <label>Plazo</label>
                    <input
                      type="date"
                      value={nuevo.fechaLimite}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, fechaLimite: e.target.value })
                      }
                    />
                    <small className="field-hint">
                      La fecha organiza el trabajo de la gestión y puede ser
                      distinta de las fechas reales del evento.
                    </small>
                  </div>
                  <div className="field">
                    <label>Hora</label>
                    <input
                      type="time"
                      value={nuevo.horaLimite}
                      onChange={(e) =>
                        setNuevo({ ...nuevo, horaLimite: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
        {error.general && <div className="error-box">{error.general}</div>}
        <div className="form-actions">
          <Link href="/eventos" className="button button-ghost">
            Cancelar
          </Link>
          <button className="button button-primary" type="submit">
            <Check size={15} /> Crear evento y plan
          </button>
        </div>
      </form>
      {mostrarConfirmacion && (
        <ConfirmDialog
          titulo="¿Crear evento y plan?"
          mensaje="¿Confirmas la creación de este evento y su plan de gestiones?"
          onClose={() => setMostrarConfirmacion(false)}
          onConfirm={confirmarSubmit}
          confirmText="Aceptar"
          isDanger={false}
        />
      )}
    </div>
  );
}

function validarDatosEvento(
  datos: FormEvento,
  tareas: BorradorTarea[],
  mostrarPlan: boolean,
) {
  const e: Record<string, string> = {};
  if (!datos.nombre.trim()) e.nombre = "El nombre es obligatorio.";
  if (!datos.lugar.trim()) e.lugar = "El lugar es obligatorio.";
  if (!datos.fechaInicio || !datos.fechaFin) {
    if (!datos.fechaInicio) e.fechaInicio = "Elige una fecha.";
    if (!datos.fechaFin) e.fechaFin = "Elige una fecha.";
  } else if (datos.fechaFin < datos.fechaInicio) e.fechaFin = "Inválida.";
  if (timeToHours(datos.duracion) <= 0)
    e.duracion = "Indica una duración mayor a 0.";
  if (
    !Number.isFinite(Number(datos.presupuestoTrabajo)) ||
    Number(datos.presupuestoTrabajo) <= 0
  )
    e.presupuestoTrabajo =
      "Indica un presupuesto de trabajo mayor que 0 horas.";

  if (!datos.horaEvento) e.horaEvento = "Obligatoria.";
  if (mostrarPlan && !tareas.length)
    e.general =
      "Agrega al menos una gestión. Haz clic en '+ Agregar plan inicial' o cancela la creación del plan.";
  return e;
}

function validarTarea(candidata: Subtarea) {
  const e: Record<string, string> = {};
  if (!candidata.titulo.trim()) e.titulo = "El título es obligatorio.";
  if (!candidata.fechaLimite) e.fechaLimite = "Elige fecha.";
  if (!candidata.horaLimite) e.horaLimite = "Elige hora.";
  if (candidata.estimacion <= 0) e.estimacion = "Mayor que 0.";
  // El plazo organiza trabajo logístico; puede estar antes o después de las fechas reales del evento.
  return e;
}

function PresupuestoEvento({
  evento,
  usuarioId,
}: {
  evento: Evento;
  usuarioId: number | null;
}) {
  const actual = leerPresupuestoEvento(evento, usuarioId);
  const [borrador, setBorrador] = useState(String(actual));
  const [presupuesto, setPresupuesto] = useState(actual);
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const total = totalHorasEvento(evento);
  const guardar = (event: FormEvent) => {
    event.preventDefault();
    const nuevo = Number(borrador);
    if (!Number.isFinite(nuevo) || nuevo <= 0) {
      setError("El presupuesto debe ser mayor que 0 horas.");
      return;
    }
    if (nuevo < total) {
      setError(
        `El evento ya suma ${formatoHoras(total)} h en sus gestiones (incluidas las completadas). El presupuesto mínimo es ${formatoHoras(total)} h.`,
      );
      return;
    }
    if (!guardarPresupuestoEvento(usuarioId, evento.id, nuevo)) {
      setError("No se pudo guardar el presupuesto en este navegador.");
      return;
    }
    setPresupuesto(nuevo);
    setBorrador(String(nuevo));
    setError("");
    setGuardado(true);
  };
  return (
    <section
      className="daily-capacity-card card"
      aria-labelledby="event-work-budget-title"
      data-testid="event-work-budget-panel"
    >
      <div className="daily-capacity-copy">
        <div className="eyebrow">PRESUPUESTO LOCAL DEL EVENTO</div>
        <h2 id="event-work-budget-title">Horas de trabajo planificadas</h2>
        <p>
          Cuenta todas las gestiones del evento, incluidas las completadas. Es
          independiente de la duración real del evento. Este valor solo se
          guarda en este navegador.
        </p>
        <div
          className={`daily-capacity-total${total > presupuesto ? " over" : ""}`}
          data-testid="event-work-budget-total"
          aria-live="polite"
        >
          <strong>{formatoHoras(total)} h</strong> de{" "}
          <strong>{formatoHoras(presupuesto)} h</strong>
          {total > presupuesto && (
            <span>Exceso de {formatoHoras(total - presupuesto)} h.</span>
          )}
        </div>
      </div>
      <form className="daily-capacity-form" onSubmit={guardar} noValidate>
        <div className="field">
          <label htmlFor="event-work-budget-edit">
            Presupuesto total de trabajo
          </label>
          <div className="daily-capacity-input">
            <input
              id="event-work-budget-edit"
              data-testid="event-work-budget-edit"
              type="number"
              min="0.25"
              step="0.25"
              value={borrador}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? "event-work-budget-error" : "event-work-budget-help"
              }
              onChange={(event) => {
                setBorrador(event.target.value);
                setGuardado(false);
                setError("");
              }}
            />
            <span>horas</span>
          </div>
          <small id="event-work-budget-help">
            No modifica las fechas ni las horas reales del evento.
          </small>
          {error && (
            <div
              id="event-work-budget-error"
              className="field-error"
              role="alert"
              data-testid="event-work-budget-error"
            >
              {error}
            </div>
          )}
        </div>
        <div className="daily-capacity-actions">
          <button
            type="submit"
            className="button button-secondary button-small"
            data-testid="save-event-work-budget"
          >
            Guardar presupuesto
          </button>
          {guardado && (
            <span role="status" className="daily-capacity-saved">
              Presupuesto guardado en este navegador
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function DetalleEvento() {
  const { id } = useParams<{ id: string }>();
  const {
    eventos,
    limiteDiario,
    actualizarSubtarea,
    eliminarSubtarea,
    eliminarEvento,
    crearSubtarea,
  } = useStore();
  const [, setLocation] = useLocation();
  const { usuario } = useAuth();
  const evento = eventos.find((e) => e.id === id);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [tareaEditar, setTareaEditar] = useState<Subtarea | null>(null);
  const [mover, setMover] = useState<Subtarea | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState<{
    tipo: "evento" | "tarea";
    id: string;
    nombre: string;
  } | null>(null);

  if (!evento)
    return (
      <EmptyState
        titulo="Evento no encontrado"
        copy="Puede que haya sido eliminado."
        accion={
          <Link href="/eventos" className="button button-secondary">
            Volver a eventos
          </Link>
        }
      />
    );

  const toggle = async (tarea: Subtarea) =>
    await actualizarSubtarea(evento.id, {
      ...tarea,
      estado: tarea.estado === "hecho" ? "pendiente" : "hecho",
    });
  const eliminar = async (tarea: Subtarea) => {
    setConfirmarEliminar({ tipo: "tarea", id: tarea.id, nombre: tarea.titulo });
  };
  const eliminarEv = async () => {
    setConfirmarEliminar({
      tipo: "evento",
      id: evento.id,
      nombre: evento.nombre,
    });
  };

  const procesarEliminacion = async () => {
    if (!confirmarEliminar) return;
    if (confirmarEliminar.tipo === "evento") {
      if (await eliminarEvento(confirmarEliminar.id)) setLocation("/eventos");
    } else {
      await eliminarSubtarea(evento.id, confirmarEliminar.id);
      setConfirmarEliminar(null);
    }
  };

  const pendientes = evento.subtareas.filter((t) => t.estado !== "hecho");
  const completadas = evento.subtareas.filter((t) => t.estado === "hecho");
  const porcentaje = calcularPorcentaje(evento);
  return (
    <div>
      <Link href="/eventos" className="detail-back">
        <ArrowLeft size={14} /> Todos los eventos
      </Link>
      <div className="detail-head">
        <div>
          <h1 className="detail-title">{evento.nombre}</h1>
        </div>
        <div className="detail-score">
          <div className="score-number">{porcentaje}%</div>
        </div>
      </div>
      <PresupuestoEvento
        key={`${usuario?.id ?? "anonimo"}:${evento.id}`}
        evento={evento}
        usuarioId={usuario?.id ?? null}
      />
      <div className="detail-actions">
        <button
          className="button button-primary"
          onClick={() => setMostrarAgregar((v) => !v)}
        >
          <Plus size={15} />{" "}
          {mostrarAgregar ? "Cerrar formulario" : "Agregar gestión"}
        </button>
        <button className="button button-danger" onClick={eliminarEv}>
          <Trash2 size={14} /> Eliminar evento
        </button>
      </div>
      {confirmarEliminar && (
        <ConfirmDialog
          titulo={
            confirmarEliminar.tipo === "evento"
              ? "¿Eliminar evento?"
              : "¿Eliminar gestión?"
          }
          mensaje={
            "Esta acción eliminará " +
            (confirmarEliminar.tipo === "evento"
              ? "el evento y todas sus gestiones"
              : "la gestión y toda su información") +
            ". No se puede deshacer."
          }
          onClose={() => setConfirmarEliminar(null)}
          onConfirm={procesarEliminacion}
        />
      )}
      {tareaEditar && (
        <TaskEditorDialog
          evento={evento}
          tarea={tareaEditar}
          onClose={() => setTareaEditar(null)}
          onSave={async (t) => {
            const problema = validarCapacidadesTarea(
              eventos,
              evento.id,
              t as Subtarea,
              usuario?.id ?? null,
              limiteDiario,
              tareaEditar.id,
            );
            if (problema) return problema;
            if (await actualizarSubtarea(evento.id, t)) setTareaEditar(null);
            return false;
          }}
        />
      )}
      {mover && (
        <ReprogramarDialog
          evento={evento}
          tarea={mover}
          onClose={() => setMover(null)}
        />
      )}
      <div className="detail-layout">
        <section>
          {mostrarAgregar && (
            <div style={{ marginBottom: 22 }}>
              <TaskEditor
                evento={evento}
                onCancel={() => setMostrarAgregar(false)}
                onSave={async (t) => {
                  const e = validarTarea(t as Subtarea);
                  if (e && Object.keys(e).length > 0) return false;
                  const problema = validarCapacidadesTarea(
                    eventos,
                    evento.id,
                    t as Subtarea,
                    usuario?.id ?? null,
                    limiteDiario,
                  );
                  if (problema) return problema;
                  if (await crearSubtarea(evento.id, t))
                    setMostrarAgregar(false);
                  return true;
                }}
              />
            </div>
          )}
          {pendientes.length ? (
            <div className="task-list">
              {pendientes.map((t) => (
                <FilaTarea
                  key={t.id}
                  tarea={t}
                  onToggle={() => toggle(t)}
                  onReprogramar={() => setMover(t)}
                  onEditar={() => setTareaEditar(t)}
                  onEliminar={() => eliminar(t)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              titulo="Plan despejado"
              copy="No hay gestiones pendientes."
            />
          )}
          {completadas.length > 0 && (
            <div className="task-list">
              {completadas.map((t) => (
                <FilaTarea
                  key={t.id}
                  tarea={t}
                  onToggle={() => toggle(t)}
                  onReprogramar={() => setMover(t)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TaskEditor({
  evento,
  tarea: tareaInicial,
  onCancel,
  onSave,
}: {
  evento: Evento;
  tarea?: Subtarea;
  onCancel: () => void;
  onSave: (tarea: Omit<Subtarea, "id">) => Promise<boolean | string>;
}) {
  const [tarea, setTarea] = useState(
    tareaInicial
      ? { ...tareaInicial, estimacion: hoursToTime(tareaInicial.estimacion) }
      : {
          titulo: "",
          categoria: "otro",
          prioridad: "media" as Prioridad,
          estado: "pendiente" as EstadoSubtarea,
          fechaLimite: evento.fechaInicio,
          horaLimite: "18:00",
          horaInicio: "",
          estimacion: "01:00",
        },
  );
  const [error, setError] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validarTarea(tarea as any as Subtarea);
    if (Object.keys(errs).length > 0) {
      setError(errs);
      return;
    }
    const resultado = await onSave({
      ...tarea,
      estimacion: timeToHours(tarea.estimacion as string),
    });
    if (typeof resultado === "string") setError({ general: resultado });
  };
  return (
    <form className="card card-pad" onSubmit={submit}>
      <div
        className="form-grid"
        style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}
      >
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>
            Qué hay que hacer <span className="req">*</span>
          </label>
          {error.titulo && <div className="field-error">{error.titulo}</div>}
          <input
            className={error.titulo ? "error" : ""}
            value={tarea.titulo}
            onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })}
            autoFocus
          />
        </div>
        <div className="field">
          <label>
            Fecha límite <span className="req">*</span>
          </label>
          {error.fechaLimite && (
            <div className="field-error">{error.fechaLimite}</div>
          )}
          <input
            type="date"
            className={error.fechaLimite ? "error" : ""}
            data-testid="task-deadline-input"
            value={tarea.fechaLimite}
            onChange={(e) =>
              setTarea({ ...tarea, fechaLimite: e.target.value })
            }
          />
        </div>
        <div className="field">
          <label>
            Hora límite <span className="req">*</span>
          </label>
          {error.horaLimite && (
            <div className="field-error">{error.horaLimite}</div>
          )}
          <input
            type="time"
            className={error.horaLimite ? "error" : ""}
            value={tarea.horaLimite}
            onChange={(e) => setTarea({ ...tarea, horaLimite: e.target.value })}
          />
        </div>
        <div className="field">
          <label>
            Estimación (horas) <span className="req">*</span>
          </label>
          {error.estimacion && (
            <div className="field-error">{error.estimacion}</div>
          )}
          <input
            type="text"
            pattern="[0-9]{2}:[0-9]{2}"
            placeholder="00:00"
            maxLength={5}
            className={error.estimacion ? "error" : ""}
            value={tarea.estimacion}
            onChange={(e) => setTarea({ ...tarea, estimacion: e.target.value })}
            aria-label="Estimación de la gestión en horas y minutos"
          />
        </div>
      </div>
      {error.general && <div className="error-box">{error.general}</div>}
      <div className="form-actions">
        <button
          type="button"
          className="button button-ghost"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button type="submit" className="button button-primary">
          Guardar gestión
        </button>
      </div>
    </form>
  );
}

function TaskEditorDialog({
  evento,
  tarea,
  onClose,
  onSave,
}: {
  evento: Evento;
  tarea?: Subtarea;
  onClose: () => void;
  onSave: (t: any) => Promise<void | boolean | string>;
}) {
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        style={{ width: "min(560px, 100%)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <TaskEditor
          evento={evento}
          tarea={tarea}
          onCancel={onClose}
          onSave={async (t) => {
            const resultado = await onSave(tarea ? { ...t, id: tarea.id } : t);
            return typeof resultado === "string"
              ? resultado
              : resultado === false
                ? false
                : true;
          }}
        />
      </div>
    </div>
  );
}

function ConfirmDialog({
  titulo,
  mensaje,
  onClose,
  onConfirm,
  confirmText = "Eliminar",
  isDanger = true,
}: {
  titulo: string;
  mensaje: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  isDanger?: boolean;
}) {
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog"
        style={{ padding: "32px 28px", maxWidth: 420, borderRadius: 12 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dialog-body" style={{ textAlign: "center" }}>
          <h3
            style={{
              fontSize: "20px",
              marginBottom: "12px",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            {titulo}
          </h3>
          <p
            style={{
              color: "#b0b0b0",
              fontSize: "14px",
              marginBottom: "32px",
              lineHeight: 1.6,
            }}
          >
            {mensaje}
          </p>
        </div>
        <div
          className="form-actions"
          style={{
            marginTop: 0,
            display: "flex",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            className="button"
            style={{
              flex: 1,
              padding: "11px",
              background: "transparent",
              border: "1px solid #555",
              color: "#e0e0e0",
              fontWeight: 500,
              borderRadius: 8,
            }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button"
            style={{
              flex: 1,
              padding: "11px",
              background: isDanger ? "#d33833" : "var(--azul)",
              border: `1px solid ${isDanger ? "#d33833" : "var(--azul)"}`,
              color: "#fff",
              fontWeight: 500,
              borderRadius: 8,
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

type ConflictoDialogo =
  | { tipo: "capacidad"; datos: ConflictoSobrecarga }
  | { tipo: "presupuesto"; totalEvento: number; presupuesto: number };

function ReprogramarDialog({
  evento,
  tarea,
  onClose,
}: {
  evento: Evento;
  tarea: Subtarea;
  onClose: () => void;
}) {
  const { reprogramarSubtarea, resolverConflictoSubtarea } = useStore();
  const { usuario } = useAuth();
  const [fecha, setFecha] = useState(tarea.fechaLimite);
  const [hora, setHora] = useState(tarea.horaLimite);
  const [estimacion, setEstimacion] = useState(String(tarea.estimacion));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [conflicto, setConflicto] = useState<ConflictoDialogo | null>(null);
  const [avisoPersistencia, setAvisoPersistencia] = useState("");
  const [estimacionConflicto, setEstimacionConflicto] = useState<number | null>(
    null,
  );
  const conflictoRef = useRef<HTMLDivElement>(null);
  const presupuestoEvento = leerPresupuestoEvento(evento, usuario?.id ?? null);
  const estimacionNumerica = Number(estimacion);

  // Guardia secundario local: el presupuesto de trabajo del evento.
  const excesoPresupuesto = (horas: number) => {
    const totalEvento = Number(
      (totalHorasEvento(evento) - tarea.estimacion + horas).toFixed(2),
    );
    return totalEvento > presupuestoEvento
      ? { totalEvento, presupuesto: presupuestoEvento }
      : null;
  };

  const intentarGuardar = async (fechaPropuesta: string, horas: number) => {
    const problema = validarTarea({
      ...tarea,
      fechaLimite: fechaPropuesta,
      horaLimite: hora,
      estimacion: horas,
    });
    if (Object.keys(problema).length > 0) {
      setError(Object.values(problema).join(" "));
      return;
    }
    if (!puedeGuardarPresupuestoEvento(usuario?.id ?? null)) {
      setError(
        "Este navegador no permite validar ni guardar el presupuesto local del evento. Habilita el almacenamiento local e inténtalo de nuevo.",
      );
      return;
    }
    const presupuestoExcedido = excesoPresupuesto(horas);
    if (presupuestoExcedido) {
      setError("");
      setAvisoPersistencia("");
      setConflicto({ tipo: "presupuesto", ...presupuestoExcedido });
      return;
    }
    setGuardando(true);
    setError("");
    const res = await reprogramarSubtarea(tarea.id, {
      fechaLimite: fechaPropuesta,
      horaLimite: hora,
      estimacion: horas,
    });
    setGuardando(false);
    if (res.ok) {
      onClose();
      return;
    }
    if (res.tipo === "conflicto") {
      setAvisoPersistencia("");
      setEstimacionConflicto(horas);
      setConflicto({ tipo: "capacidad", datos: res.conflicto });
      return;
    }
    setError(res.error);
  };

  const confirmar = (e: FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(estimacionNumerica) || estimacionNumerica <= 0) {
      setError("La estimación debe ser mayor que 0 horas.");
      return;
    }
    void intentarGuardar(fecha, estimacionNumerica);
  };

  const cerrarConflicto = () => {
    setConflicto(null);
    setAvisoPersistencia("");
  };

  const moverAFechaSugerida = async (fechaSugerida: string) => {
    setGuardando(true);
    setError("");
    const res = await resolverConflictoSubtarea(tarea.id, "mover_otro_dia", {
      plazo: fechaSugerida,
      horaLimite: hora,
    });
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data.resuelto) {
      onClose();
      return;
    }
    setFecha(fechaSugerida);
    setEstimacionConflicto(estimacionNumerica);
    setAvisoPersistencia(
      `El cambio se guardó, pero ese día sigue sobrecargado: quedan ${formatoHoras(res.data.horasExceso)} h por encima de tu límite.`,
    );
    setConflicto({
      tipo: "capacidad",
      datos: {
        fecha: fechaSugerida,
        limiteHoras: res.data.limiteHoras,
        horasActuales: 0,
        horasNuevaGestion: estimacionNumerica,
        horasTotalesProyectadas: res.data.horasTotalesProyectadas,
        horasExceso: res.data.horasExceso,
        estrategiasDisponibles: ["mover_otro_dia", "reducir_horas"],
        fechasSugeridas: res.data.fechasSugeridas,
        mensaje: res.data.mensaje,
      },
    });
  };

  const aplicarReduccion = async () => {
    if (!Number.isFinite(estimacionNumerica) || estimacionNumerica <= 0) {
      setError("La estimación debe ser mayor que 0 horas.");
      return;
    }
    const presupuestoExcedido = excesoPresupuesto(estimacionNumerica);
    if (presupuestoExcedido) {
      setAvisoPersistencia("");
      setConflicto({ tipo: "presupuesto", ...presupuestoExcedido });
      return;
    }
    setGuardando(true);
    setError("");
    const res = await resolverConflictoSubtarea(tarea.id, "reducir_horas", {
      estimacion: estimacionNumerica,
    });
    setGuardando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data.resuelto) {
      onClose();
      return;
    }
    setEstimacionConflicto(estimacionNumerica);
    setAvisoPersistencia(
      `Las horas se guardaron, pero el día sigue sobrecargado: quedan ${formatoHoras(res.data.horasExceso)} h por encima de tu límite.`,
    );
    setConflicto({
      tipo: "capacidad",
      datos: {
        fecha,
        limiteHoras: res.data.limiteHoras,
        horasActuales: 0,
        horasNuevaGestion: estimacionNumerica,
        horasTotalesProyectadas: res.data.horasTotalesProyectadas,
        horasExceso: res.data.horasExceso,
        estrategiasDisponibles: ["mover_otro_dia", "reducir_horas"],
        fechasSugeridas: res.data.fechasSugeridas,
        mensaje: res.data.mensaje,
      },
    });
  };

  useEffect(() => {
    if (!conflicto) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    conflictoRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setConflicto(null);
        setAvisoPersistencia("");
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [Boolean(conflicto)]);

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <form
        className="dialog"
        onSubmit={confirmar}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="dialog-body">
          <div className="dialog-title">
            <h2>Reprogramar gestión</h2>
            <p>{tarea.titulo}</p>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="reprogramar-fecha">Nuevo plazo</label>
              <input
                id="reprogramar-fecha"
                type="date"
                value={fecha}
                data-testid="reprogramar-fecha"
                onChange={(e) => {
                  setFecha(e.target.value);
                  setConflicto(null);
                  setAvisoPersistencia("");
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="reprogramar-hora">Nueva hora</label>
              <input
                id="reprogramar-hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>
          <div className="field reprogramar-estimacion-field">
            <label htmlFor="reprogramar-estimacion">Esfuerzo estimado</label>
            <div className="daily-capacity-input">
              <input
                id="reprogramar-estimacion"
                data-testid="reprogramar-estimacion"
                type="number"
                min="0.25"
                step="0.25"
                value={estimacion}
                onChange={(e) => {
                  setEstimacion(e.target.value);
                  setConflicto(null);
                  setAvisoPersistencia("");
                }}
              />
              <span>horas</span>
            </div>
          </div>
          {avisoPersistencia && (
            <div className="warning-box" role="status">
              {avisoPersistencia}
            </div>
          )}
          {error && <div className="error-box">{error}</div>}
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="button button-primary"
            disabled={guardando}
          >
            {guardando ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </form>
      {conflicto && (
        <div
          className="capacity-conflict-backdrop"
          onMouseDown={(event) => event.stopPropagation()}
          data-testid="capacity-conflict-backdrop"
        >
          <section
            ref={conflictoRef}
            className="capacity-conflict-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="capacity-conflict-title"
            aria-describedby="capacity-conflict-description"
            tabIndex={-1}
            data-testid="capacity-conflict-dialog"
          >
            {conflicto.tipo === "capacidad" ? (
              <>
                <div className="capacity-conflict-heading">
                  <div>
                    <div className="eyebrow">CAPACIDAD DIARIA</div>
                    <h2 id="capacity-conflict-title">
                      La reprogramación supera tu límite diario
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={cerrarConflicto}
                    aria-label="Cerrar aviso de capacidad"
                    data-testid="close-capacity-conflict"
                  >
                    Cerrar
                  </button>
                </div>
                <p id="capacity-conflict-description" aria-live="polite">
                  Para el {fechaHoraBonita(conflicto.datos.fecha)} quedarías con{" "}
                  <strong>
                    {formatoHoras(conflicto.datos.horasTotalesProyectadas)} h
                    planificadas
                  </strong>{" "}
                  (límite {formatoHoras(conflicto.datos.limiteHoras)} h)
                  {conflicto.datos.horasExceso > 0 &&
                    `, un exceso de ${formatoHoras(conflicto.datos.horasExceso)} h`}
                  .
                  {conflicto.datos.horasActuales > 0 &&
                    ` Otras gestiones abiertas de ese día suman ${formatoHoras(conflicto.datos.horasActuales)} h.`}
                </p>
                {avisoPersistencia && (
                  <div className="warning-box" role="status">
                    {avisoPersistencia}
                  </div>
                )}
                {error && (
                  <div className="error-box" role="alert">
                    {error}
                  </div>
                )}
                <div className="capacity-conflict-options">
                  {conflicto.datos.fechasSugeridas.length ? (
                    conflicto.datos.fechasSugeridas.map((sugerida) => (
                      <div
                        className="capacity-conflict-option"
                        key={sugerida.fecha}
                      >
                        <div>
                          <strong>Mover a un día con capacidad</strong>
                          <span>
                            {fechaHoraBonita(sugerida.fecha)} ·{" "}
                            {formatoHoras(sugerida.horasTotalesProyectadas)} h de{" "}
                            {formatoHoras(conflicto.datos.limiteHoras)} h
                          </span>
                        </div>
                        <button
                          type="button"
                          className="button button-secondary button-small"
                          onClick={() => void moverAFechaSugerida(sugerida.fecha)}
                          disabled={guardando}
                          data-testid={`use-suggested-reschedule-date-${sugerida.fecha}`}
                        >
                          Usar esta fecha
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>
                      No encontramos un día libre en los próximos 90 días. Elige
                      otra fecha manualmente.
                    </p>
                  )}
                  <div className="capacity-conflict-option">
                    <div>
                      <strong>Reducir la estimación</strong>
                      <span>El total se actualiza al cambiar las horas.</span>
                    </div>
                    <div className="capacity-conflict-reduce">
                      <label htmlFor="reprogramar-estimacion-conflicto">
                        Nueva estimación
                      </label>
                      <input
                        id="reprogramar-estimacion-conflicto"
                        data-testid="reprogramar-estimacion-conflicto"
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={estimacion}
                        onChange={(e) => setEstimacion(e.target.value)}
                        aria-describedby="capacity-conflict-description"
                      />
                      <span>h</span>
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => void aplicarReduccion()}
                        disabled={
                          guardando ||
                          !Number.isFinite(estimacionNumerica) ||
                          estimacionNumerica <= 0 ||
                          estimacionNumerica === estimacionConflicto
                        }
                        data-testid="apply-reduced-estimation"
                      >
                        Aplicar horas
                      </button>
                    </div>
                  </div>
                </div>
                <div className="capacity-conflict-actions">
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={cerrarConflicto}
                  >
                    Revisar fecha
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="capacity-conflict-heading">
                  <div>
                    <div className="eyebrow">PRESUPUESTO DEL EVENTO</div>
                    <h2 id="capacity-conflict-title">
                      La reprogramación supera el presupuesto del evento
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={cerrarConflicto}
                    aria-label="Cerrar aviso de presupuesto"
                    data-testid="close-capacity-conflict"
                  >
                    Cerrar
                  </button>
                </div>
                <p id="capacity-conflict-description" aria-live="polite">
                  El evento quedaría en{" "}
                  <strong>
                    {formatoHoras(conflicto.totalEvento)} h planificadas
                  </strong>{" "}
                  frente a un presupuesto de{" "}
                  <strong>{formatoHoras(conflicto.presupuesto)} h</strong> (exceso
                  de{" "}
                  {formatoHoras(conflicto.totalEvento - conflicto.presupuesto)} h).
                </p>
                {error && (
                  <div className="error-box" role="alert">
                    {error}
                  </div>
                )}
                <div className="capacity-conflict-options">
                  <div className="capacity-conflict-option">
                    <div>
                      <strong>Reducir la estimación</strong>
                      <span>
                        Ajusta las horas para que el plan del evento quepa en su
                        presupuesto.
                      </span>
                    </div>
                    <div className="capacity-conflict-reduce">
                      <label htmlFor="reprogramar-estimacion-conflicto">
                        Nueva estimación
                      </label>
                      <input
                        id="reprogramar-estimacion-conflicto"
                        data-testid="reprogramar-estimacion-conflicto"
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={estimacion}
                        onChange={(e) => setEstimacion(e.target.value)}
                        aria-describedby="capacity-conflict-description"
                      />
                      <span>h</span>
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() =>
                          void intentarGuardar(fecha, estimacionNumerica)
                        }
                        disabled={
                          guardando ||
                          !Number.isFinite(estimacionNumerica) ||
                          estimacionNumerica <= 0
                        }
                        data-testid="apply-reduced-estimation"
                      >
                        Aplicar horas
                      </button>
                    </div>
                  </div>
                </div>
                <div className="capacity-conflict-actions">
                  <button
                    type="button"
                    className="button button-ghost button-small"
                    onClick={cerrarConflicto}
                  >
                    Revisar fecha
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Progreso() {
  const { eventos } = useStore();
  if (!eventos.length)
    return (
      <div>
        <Encabezado eyebrow="Progreso" titulo="Métricas" />
        <EmptyState titulo="Sin datos" copy="Aún no hay eventos registrados." />
      </div>
    );

  const totalEventos = eventos.length;
  const eventosCompletados = eventos.filter(
    (e) =>
      e.subtareas.length > 0 && e.subtareas.every((t) => t.estado === "hecho"),
  ).length;
  const eventosActivos = totalEventos - eventosCompletados;

  const todasTareas = eventos.flatMap((e) => e.subtareas);
  const totalTareas = todasTareas.length;
  const tareasCompletadas = todasTareas.filter(
    (t) => t.estado === "hecho",
  ).length;

  const porcentajeGlobal =
    totalTareas === 0 ? 0 : Math.round((tareasCompletadas / totalTareas) * 100);

  return (
    <div>
      <Encabezado eyebrow="Progreso" titulo="Métricas globales" />
      <div className="detail-layout" style={{ marginTop: "32px" }}>
        <section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
              marginBottom: "40px",
            }}
          >
            <div
              className="card card-pad"
              style={{
                background: "rgba(111,174,134,0.06)",
                borderColor: "rgba(111,174,134,0.2)",
              }}
            >
              <div
                style={{
                  color: "var(--salvia)",
                  fontSize: "12px",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
                Progreso Global
              </div>
              <div
                style={{
                  fontSize: "42px",
                  color: "var(--salvia)",
                  fontWeight: 300,
                }}
              >
                {porcentajeGlobal}%
              </div>
            </div>
            <div className="card card-pad">
              <div
                style={{
                  color: "var(--apagado)",
                  fontSize: "12px",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                Eventos Activos
              </div>
              <div style={{ fontSize: "42px", color: "#fff", fontWeight: 300 }}>
                {eventosActivos}{" "}
                <span style={{ fontSize: "16px", color: "#555" }}>
                  / {totalEventos}
                </span>
              </div>
            </div>
            <div className="card card-pad">
              <div
                style={{
                  color: "var(--apagado)",
                  fontSize: "12px",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                Gestiones Completadas
              </div>
              <div style={{ fontSize: "42px", color: "#fff", fontWeight: 300 }}>
                {tareasCompletadas}{" "}
                <span style={{ fontSize: "16px", color: "#555" }}>
                  / {totalTareas}
                </span>
              </div>
            </div>
          </div>
          <h3
            style={{
              fontSize: "18px",
              marginBottom: "16px",
              fontWeight: 500,
              color: "#e0e0e0",
            }}
          >
            Desglose por Evento
          </h3>
          <div className="task-list">
            {eventos.map((e) => {
              const p = calcularPorcentaje(e);
              return (
                <Link
                  href={"/evento/" + e.id}
                  key={e.id}
                  className="task-row"
                  style={{
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    padding: "16px 20px",
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 500,
                        marginBottom: "6px",
                        color: "#fff",
                      }}
                    >
                      {e.nombre}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--apagado)" }}>
                      {e.subtareas.filter((t) => t.estado === "hecho").length}{" "}
                      de {e.subtareas.length} gestiones completadas
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "24px",
                      color: p === 100 ? "var(--salvia)" : "#e0e0e0",
                      fontWeight: 300,
                    }}
                  >
                    {p}%
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;

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
  const { login, loggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mantener, setMantener] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");

  useEffect(() => {
    if (loggedIn) setLocation("/hoy");
  }, [loggedIn, setLocation]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErrorLogin("");
    const resultado = await login(correo.trim(), password, mantener);
    setEnviando(false);
    if (resultado.ok) setLocation("/hoy");
    else setErrorLogin(resultado.error);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--tinta)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "var(--azul)",
              color: "var(--papel)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--fuente-titulo)",
            }}
          >
            EO
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--papel)",
              marginBottom: 8,
              fontFamily: "var(--fuente-titulo)",
            }}
          >
            Bienvenido de nuevo
          </h1>
          <p style={{ color: "var(--apagado)", fontSize: 14 }}>
            Inicia sesión para gestionar tus eventos
          </p>
        </div>
        <div
          className="card"
          style={{
            padding: "30px",
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            background: "var(--panel)",
          }}
        >
          <form
            onSubmit={enviar}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            <div className="field">
              <label style={{ color: "var(--papel)" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <label style={{ color: "var(--papel)" }}>Contraseña</label>
                <span
                  onClick={() => setLocation("/recuperar")}
                  style={{
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--azul-claro)",
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </span>
              </div>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    paddingRight: "40px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    color: "var(--papel)",
                    opacity: 0.6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  {mostrarPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontSize: 13,
                color: "var(--papel)",
              }}
            >
              <input
                type="checkbox"
                checked={mantener}
                onChange={(e) => setMantener(e.target.checked)}
                style={{ width: 16, height: 16, margin: 0 }}
              />{" "}
              Mantener sesión iniciada
            </label>
            {errorLogin && (
              <div className="form-error" role="alert">
                {errorLogin}
              </div>
            )}
            <button
              type="submit"
              className="button button-primary"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: 14,
                marginTop: 10,
              }}
              disabled={enviando}
            >
              {enviando ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <span style={{ fontSize: 13, color: "var(--apagado)" }}>
              ¿No tienes una cuenta?{" "}
            </span>
            <button
              type="button"
              onClick={() => setLocation("/registro")}
              style={{
                background: "none",
                border: "none",
                color: "var(--azul-claro)",
                fontSize: 13,
                fontWeight: "bold",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Crear cuenta nueva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { registrar, loggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState("");

  useEffect(() => {
    if (loggedIn) setLocation("/hoy");
  }, [loggedIn, setLocation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorRegistro("Las contraseñas no coinciden.");
      return;
    }
    setEnviando(true);
    setErrorRegistro("");
    const resultado = await registrar(nombre.trim(), email.trim(), password);
    setEnviando(false);
    if (resultado.ok) setLocation("/hoy");
    else setErrorRegistro(resultado.error);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--tinta)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--papel)",
              marginBottom: 10,
              fontFamily: "var(--fuente-titulo)",
            }}
          >
            Crear Cuenta
          </h1>
          <p style={{ color: "var(--apagado)", fontSize: 14 }}>
            Únete a Organizador de Eventos
          </p>
        </div>
        <div
          className="card"
          style={{
            padding: "30px",
            borderRadius: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            background: "var(--panel)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 15 }}
          >
            <div className="field">
              <label style={{ color: "var(--papel)" }}>Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div className="field">
              <label style={{ color: "var(--papel)" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="field">
              <label style={{ color: "var(--papel)" }}>Contraseña</label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    paddingRight: "40px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    color: "var(--papel)",
                    opacity: 0.6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  {mostrarPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="field">
              <label style={{ color: "var(--papel)" }}>
                Confirmar contraseña
              </label>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <input
                  type={mostrarPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    paddingRight: "40px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "none",
                    border: "none",
                    color: "var(--papel)",
                    opacity: 0.6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  {mostrarPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {errorRegistro && (
              <div className="form-error" role="alert">
                {errorRegistro}
              </div>
            )}
            <button
              type="submit"
              className="button button-primary"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: 14,
                marginTop: 10,
              }}
              disabled={enviando}
            >
              {enviando ? "Creando cuenta…" : "Registrarse"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <span style={{ fontSize: 13, color: "var(--apagado)" }}>
              ¿Ya tienes una cuenta?{" "}
            </span>
            <button
              type="button"
              onClick={() => setLocation("/login")}
              style={{
                background: "none",
                border: "none",
                color: "var(--azul-claro)",
                fontSize: 13,
                fontWeight: "bold",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Inicia sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecuperarPasswordPage() {
  const [, setLocation] = useLocation();
  const [correo, setCorreo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.includes("@")) {
      setError("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    setError("");
    setEnviado(true);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--tinta)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: "40px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "var(--azul)",
              color: "var(--papel)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "var(--fuente-titulo)",
            }}
          >
            EO
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--papel)",
              marginBottom: 8,
              fontFamily: "var(--fuente-titulo)",
            }}
          >
            Recuperar Contraseña
          </h1>
          <p style={{ color: "var(--apagado)", fontSize: 14 }}>
            Escribe el correo de tu cuenta para solicitar el restablecimiento.
          </p>
        </div>

        <div
          style={{ background: "var(--panel)", padding: 32, borderRadius: 12 }}
        >
          {enviado ? (
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "var(--salvia)",
                  fontSize: 14,
                  marginBottom: 20,
                  background: "rgba(5, 150, 105, 0.1)",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid var(--salvia)",
                }}
              >
                Por ahora la recuperación automática por correo no está
                disponible. Pídele al administrador del sistema que restablezca
                tu contraseña.
              </p>
              <button
                onClick={() => setLocation("/login")}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--azul-claro)",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div
                className="field"
                style={{ marginBottom: 20, textAlign: "left" }}
              >
                <label
                  style={{
                    color: "var(--papel)",
                    display: "block",
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                    setError("");
                  }}
                  placeholder="tu@correo.com"
                  style={{
                    width: "100%",
                    border: error
                      ? "1px solid var(--oxido)"
                      : "1px solid var(--linea-fuerte)",
                    background: "var(--input-bg)",
                    color: "var(--papel)",
                    padding: "10px 12px",
                    borderRadius: 6,
                    outline: error ? "none" : "",
                  }}
                />
                {error && (
                  <span
                    style={{
                      color: "var(--oxido)",
                      fontSize: 12,
                      marginTop: 4,
                      display: "block",
                      textAlign: "left",
                    }}
                  >
                    {error}
                  </span>
                )}
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--azul-claro)",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 16,
                }}
              >
                Enviar enlace de recuperación
              </button>

              <div style={{ textAlign: "center" }}>
                <span
                  onClick={() => setLocation("/login")}
                  style={{
                    cursor: "pointer",
                    fontSize: 14,
                    color: "var(--azul-claro)",
                    fontWeight: 500,
                  }}
                >
                  ← Volver al inicio de sesión
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
