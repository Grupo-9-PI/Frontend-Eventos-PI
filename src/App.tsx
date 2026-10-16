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
  Settings,
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
import { api, mensajeDeError } from "@/services/api";
import { useAuth } from "./Root";
import {
  combinarFechaHora,
  esHorasValidas,
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
  type EventoPayload,
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
    cambios: {
      fechaLimite: string;
      horaInicio: string;
      estimacion: number;
      motivoMovimiento?: string;
    },
  ) => Promise<ResultadoReprogramacion>;
  resolverConflictoSubtarea: (
    id: string,
    estrategia: "mover_otro_dia" | "reducir_horas",
    datos: { plazo?: string; horaLimite?: string; estimacion?: number },
  ) => Promise<Resultado<RespuestaResolverConflicto>>;
  crearEventoCompleto: (
    evento: EventoPayload,
    tareas: Omit<Subtarea, "id">[],
  ) => Promise<string | null>;
  actualizarEvento: (id: string, evento: EventoPayload) => Promise<boolean>;
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

  /**
   * Refleja el cambio de una gestión en memoria, antes de que responda el
   * servidor: /hoy descuenta la carga urgente al instante y las barras de
   * progreso se mueven sin recargar la página. Si la petición falla, el
   * `cargarTodo(false)` del error deja el estado real otra vez.
   */
  const reflejarEnMemoria = (
    id: string,
    cambios: Partial<Subtarea>,
    visibleEnHoy: boolean,
  ) => {
    setEventos((lista) =>
      lista.map((evento) => ({
        ...evento,
        subtareas: evento.subtareas.map((t) =>
          t.id === id ? { ...t, ...cambios } : t,
        ),
      })),
    );
    setHoy((respuesta) => {
      if (!respuesta) return respuesta;
      const ajustar = (lista: TareaHoy[]) => {
        if (!visibleEnHoy) return lista.filter((t) => t.id !== id);
        if (!lista.some((t) => t.id === id)) return lista;
        return lista.map((t) => (t.id === id ? { ...t, ...cambios } : t));
      };
      const grupos: GruposHoy = {
        vencidas: ajustar(respuesta.grupos.vencidas),
        para_hoy: ajustar(respuesta.grupos.para_hoy),
        proximas: ajustar(respuesta.grupos.proximas),
      };
      return {
        ...respuesta,
        grupos,
        total:
          grupos.vencidas.length + grupos.para_hoy.length + grupos.proximas.length,
      };
    });
  };

  /** Microcopy de confirmación según la acción que acaba de hacer el organizador. */
  const microcopyEstado = (t: Subtarea, hechos: number, total: number) => {
    if (t.estado !== "hecho")
      return `Gestión reabierta: «${t.titulo}» vuelve a la carga de hoy.`;
    const plural = hechos === 1 ? "1 gestión ejecutada" : `${hechos} gestiones ejecutadas`;
    return total > 1
      ? `Gestión completada: «${t.titulo}». ${plural} de ${total}.`
      : `Gestión completada: «${t.titulo}».`;
  };

  const crearEventoCompleto = async (
    evento: EventoPayload,
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
        `El evento se creó, pero ${fallidas.length} de tus gestiones no se pudieron guardar: ${fallidas.join(", ")}.`,
      );
    } else {
      notifySuccess(
        tareas.length
          ? `Evento creado con ${tareas.length} ${tareas.length === 1 ? "gestión" : "gestiones"} en el plan.`
          : "Evento creado.",
      );
    }
    return res.data.id;
  };
  const actualizarEvento = async (id: string, e: EventoPayload) => {
    const res = await repositorioEventos.actualizarEvento(id, e);
    if (!res.ok) {
      notifyError(res.error);
      return false;
    }
    await cargarTodo(false);
    notifySuccess(`Evento actualizado: «${res.data.nombre}».`);
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
    notifySuccess(`Gestión agregada al plan: «${t.titulo.trim()}».`);
    return true;
  };

  const actualizarSubtarea = async (eId: string, t: Subtarea) => {
    // Reacción inmediata: /hoy descuenta la carga urgente sin recargar.
    reflejarEnMemoria(t.id, { estado: t.estado }, esVisibleEnHoy(t.estado));
    const res = await repositorioEventos.actualizarSubtarea(eId, t);
    if (!res.ok) {
      notifyError(res.error);
      await cargarTodo(false);
      return false;
    }
    const todas = eventos
      .flatMap((e) => e.subtareas)
      .map((x) => (x.id === t.id ? t : x));
    await cargarTodo(false);
    notifySuccess(
      microcopyEstado(
        t,
        todas.filter((x) => x.estado === "hecho").length,
        todas.length,
      ),
    );
    return true;
  };

  const eliminarSubtarea = async (_eId: string, tId: string) => {
    const res = await repositorioEventos.eliminarSubtarea(tId);
    if (!res.ok) {
      notifyError(res.error);
      return false;
    }
    await cargarTodo(false);
    notifySuccess("Gestión eliminada del plan.");
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
    cambios: {
      fechaLimite: string;
      horaInicio: string;
      estimacion: number;
      motivoMovimiento?: string;
    },
  ) => {
    const res = await repositorioEventos.reprogramar(id, cambios);
    if (res.ok) {
      await cargarTodo(false);
      notifySuccess(
        `Gestión movida al ${fechaHoraBonita(cambios.fechaLimite, cambios.horaInicio || undefined)}.`,
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
            <Route path="/restablecer" component={RestablecerPasswordPage} />
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
  const activos = eventos.filter(estaActivo).length;
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
    { href: "/opciones", label: "Opciones", icon: Settings },
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
              .filter(estaActivo)
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
              <Route path="/opciones" component={Opciones} />
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
  const esError = aviso.tipo === "error";
  return (
    <div
      className={"toast" + (esError ? " toast-error" : "")}
      // Un error se anuncia de inmediato; la confirmación espera su turno.
      role={esError ? "alert" : "status"}
      aria-live={esError ? "assertive" : "polite"}
      data-testid="toast"
    >
      <span>{aviso.texto}</span>
      <button
        onClick={quitarAviso}
        aria-label="Cerrar aviso"
        title="Cerrar aviso"
        className="toast-close"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Mensaje de validación pegado a su campo, con id para aria-describedby. */
function ErrorCampo({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <div className="field-error" id={id}>
      {children}
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
/** Una gestión ejecutada deja de contar como carga urgente de hoy. */
function esVisibleEnHoy(estado: EstadoSubtarea) {
  return estado !== "hecho";
}
/** Réplica de `estado_agenda` del servidor, para no depender del round-trip. */
function estaActivo(evento: Evento) {
  return (
    evento.estadoAgenda === "activo" ||
    evento.estadoAgenda === "retrasado" ||
    diferenciaDias(hoyISO(), evento.fechaInicio) >= 0 ||
    evento.subtareas.some((t) => t.estado !== "hecho")
  );
}

/**
 * Barra de progreso del evento: % exacto de gestured ejecutadas sobre el total
 * más el conteo en texto. Se conecta al estado de las tareas, así que refleja
 * en vivo cualquier cambio de estado.
 */
function BarraProgresoEvento({
  evento,
  compacta = false,
}: {
  evento: Evento;
  compacta?: boolean;
}) {
  const total = evento.subtareas.length;
  const ejecutadas = evento.subtareas.filter((t) => t.estado === "hecho").length;
  const abiertas = total - ejecutadas;
  const porcentaje = calcularPorcentaje(evento);

  return (
    <div
      className={"progress-block" + (compacta ? " compacta" : "")}
      data-testid="progress-block"
    >
      {!compacta && (
        <div className="progress-head">
          <span className="progress-caption">Avance del plan</span>
          <span
            className="progress-percent tabular"
            data-testid="progress-percentage"
          >
            {porcentaje}%
          </span>
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Gestiones ejecutadas de ${evento.nombre}`}
        data-testid="progress-bar"
      >
        <div className="progress-fill" style={{ width: porcentaje + "%" }} />
      </div>
      <div className="progress-legend tabular" data-testid="progress-count">
        <span aria-live="polite">
          {ejecutadas} de {total}{" "}
          {total === 1 ? "gestión ejecutada" : "gestiones ejecutadas"}
          {abiertas > 0 &&
            ` · ${abiertas} abierta${abiertas === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
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
  const hecha = tarea.estado === "hecho";
  const motivo = tarea.motivoMovimiento?.trim();
  const categoria = CATEGORIAS_GESTION.find(
    (c) => c.valor === tarea.categoria,
  )?.etiqueta;
  return (
    <div className={"task-row " + fecha + (hecha ? " done" : "")}>
      <input
        className="task-check"
        type="checkbox"
        checked={hecha}
        onChange={onToggle}
        aria-label={
          hecha
            ? `Marcar «${tarea.titulo}» como pendiente`
            : `Marcar «${tarea.titulo}» como hecha`
        }
        data-testid={`task-check-${tarea.id}`}
      />
      <div className="task-main">
        <div className={"task-title" + (hecha ? " done" : "")}>
          {tarea.titulo}
        </div>
        <div className="task-meta">
          <span>
            {mostrarEvento && <strong>{tarea.eventoNombre} · </strong>}
            {textoPlazo(tarea)}
          </span>
          <span>{hoursToTime(tarea.estimacion)} horas estimadas</span>
          {categoria && <span className="tag">{categoria}</span>}
          {tarea.horaInicio && <span>Inicio {tarea.horaInicio}</span>}
          {tarea.estado === "en_progreso" && (
            <span className="tag tag-urgent">En curso</span>
          )}
          {hecha && <span className="tag tag-done">Hecha</span>}
        </div>
        {motivo && (
          <div className="task-note" data-testid={`task-note-${tarea.id}`}>
            <div>
              <span className="task-note-label">Motivo del movimiento</span>
              <p>{motivo}</p>
            </div>
          </div>
        )}
      </div>
      <div className="task-actions">
        {onEditar && (
          <button
            className="button button-small button-ghost button-icon"
            onClick={onEditar}
            title="Editar gestión"
            aria-label={`Editar «${tarea.titulo}»`}
          >
            <Pencil size={13} />
          </button>
        )}
        <button
          className="button button-small button-secondary"
          onClick={onReprogramar}
          data-testid={`mover-${tarea.id}`}
          title="Mover gestión"
        >
          <Clock3 size={13} /> Mover
        </button>
        {hecha && (
          <button
            className="button button-small button-ghost"
            onClick={onToggle}
            data-testid={`reabrir-${tarea.id}`}
            title="Marcar como pendiente"
          >
            Reabrir
          </button>
        )}
        {onEliminar && (
          <button
            className="button button-small button-danger button-icon"
            onClick={onEliminar}
            title="Eliminar gestión"
            aria-label={`Eliminar «${tarea.titulo}»`}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

const LIMITE_DIARIO_PREDETERMINADO = 6;

function formatoHoras(horas: number) {
  return Number(horas.toFixed(2)).toLocaleString("es-CO", {
    maximumFractionDigits: 2,
  });
}

function validarCapacidadesTarea(
  eventos: Evento[],
  eventoId: string,
  candidata: Subtarea,
  limiteDiario: number,
  tareaExistenteId?: string,
) {
  const evento = eventos.find((e) => e.id === eventoId);
  if (!evento) return "No se encontró el evento para validar sus capacidades.";
  const totalDia = sumarHorasAbiertas(
    eventos,
    candidata.fechaLimite,
    tareaExistenteId ? { eventoId, tareaId: tareaExistenteId } : undefined,
    candidata.estado === "hecho" ? 0 : candidata.estimacion,
  );
  if (totalDia > limiteDiario) {
    return `El ${fechaBonita(candidata.fechaLimite, true)} quedaría en ${formatoHoras(totalDia)} h de ${limiteDiario} h de capacidad diaria (exceso ${formatoHoras(totalDia - limiteDiario)} h).`;
  }
  return "";
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
          evento.cancelado ||
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

// ---------------------------------------------------------------------------
// Controles compartidos: un solo formato de horas, un solo selector de duración
// y un solo mensaje de capacidad, reutilizados por todos los formularios.
// ---------------------------------------------------------------------------

/**
 * Rango del límite diario que acepta el servidor
 * (ConfiguracionOrganizadorSerializer: 1 a 16 h; cuentas nuevas quedan en 6 h).
 */
const LIMITE_DIARIO_MAXIMO = 16;
/** Cantidad mínima que aceptan los formularios: media hora. */
const CANTIDAD_MINIMA_HORAS = 0.5;
/** Salto de minutos que ofrecen los menús de cantidad (HH:MM). */
const PASO_MINUTOS = 5;

/**
 * Mensaje único de capacidad: «X h planificadas [hoy|de trabajo planificado]
 * de Y h», con el exceso cuando se pasa del límite.
 */
function IndicadorHoras({
  horas,
  limite,
  alcance,
  testId,
}: {
  horas: number;
  limite: number;
  /** "hoy" para la carga del día; "evento" para el total del evento. */
  alcance: "hoy" | "evento";
  testId?: string;
}) {
  const exceso = horas - limite;
  return (
    <div
      className={
        "horas-chip" + (exceso > 0 ? " over" : "") + (alcance === "hoy" ? " en-cabecera" : "")
      }
      data-testid={testId}
      aria-live="polite"
    >
      <Clock3 size={13} className="horas-chip-icon" aria-hidden="true" />
      <span className="horas-chip-texto">
        <strong>{formatoHoras(horas)} h</strong>{" "}
        {alcance === "hoy"
          ? "planificadas hoy"
          : "de trabajo planificado"}{" "}
        de <strong>{formatoHoras(limite)} h</strong>
      </span>
      {exceso > 0 && (
        <span className="horas-chip-exceso">
          Te pasas por {formatoHoras(exceso)} h
        </span>
      )}
    </div>
  );
}

/** Horas del menú de cantidad: de 00 al tope (nunca pierde el valor actual). */
function opcionesDeHoras(maximo: number): string[] {
  const tope = Math.max(0, Math.ceil(maximo));
  return Array.from({ length: tope + 1 }, (_, h) => String(h).padStart(2, "0"));
}

/** Minutos del menú de cantidad, en saltos de `PASO_MINUTOS`. */
function opcionesDeMinutos(): string[] {
  const total = Math.floor(60 / PASO_MINUTOS);
  return Array.from({ length: total }, (_, i) =>
    String(i * PASO_MINUTOS).padStart(2, "0"),
  );
}

/** "HH:MM" sin huecos a partir de un texto libre: "4:5" → ["04", "05"]. */
function dividirHoras(texto: string): [string, string] {
  const [hh = "", mm = ""] = (texto || "").split(":");
  const hora = hh.replace(/\D/g, "").padStart(2, "0").slice(-2);
  const minuto = mm.replace(/\D/g, "").padStart(2, "0").slice(0, 2);
  return [hora || "00", minuto || "00"];
}

/** Añade un valor a las opciones si aún no está, para nunca perder el actual. */
function incluirOpcion(opciones: string[], valor: string): string[] {
  return opciones.includes(valor) ? opciones : [...opciones, valor].sort();
}

/** "30 minutos" / "2 horas" a partir de una cantidad en horas. */
function textoCantidadHoras(horas: number): string {
  const minutos = Math.round(horas * 60);
  if (minutos % 60 === 0) {
    const h = minutos / 60;
    return `${h} ${h === 1 ? "hora" : "horas"}`;
  }
  return `${minutos} minutos`;
}

/**
 * Campo de cantidad de tiempo (HH:MM) con menús de horas y minutos, iguales al
 * selector de hora pero sin AM/PM: son horas y minutos acumulados, no una hora
 * del día. El tope sale del límite diario programado por el organizador.
 */
function CampoHoras({
  id,
  valor,
  onChange,
  error,
  testId,
  etiqueta = "Horas estimadas",
  requerido = true,
  maximoHoras,
  alcance = "diario",
  sinAyuda = false,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  error?: string;
  testId?: string;
  etiqueta?: string;
  requerido?: boolean;
  maximoHoras: number;
  /** "evento": el tope es la duración total del evento; "diario": el límite del organizador. */
  alcance?: "diario" | "evento";
  sinAyuda?: boolean;
}) {
  const ayudaId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const [hh, mm] = dividirHoras(valor);
  const horas = incluirOpcion(opcionesDeHoras(maximoHoras), hh);
  const minutos = incluirOpcion(opcionesDeMinutos(), mm);
  const descritoPor = error ? errorId : sinAyuda ? undefined : ayudaId;
  const cambiar = (nuevaHora: string, nuevoMinuto: string) =>
    onChange(`${nuevaHora}:${nuevoMinuto}`);
  return (
    <div className="field">
      <label htmlFor={`${id}-horas`}>
        {etiqueta} {requerido && <span className="req">*</span>}
      </label>
      {error && <ErrorCampo id={errorId}>{error}</ErrorCampo>}
      <div
        className="horas-menu"
        data-testid={testId}
        role="group"
        aria-label={etiqueta}
      >
        <select
          id={`${id}-horas`}
          aria-label={`${etiqueta}: horas`}
          value={hh}
          className={error ? "error" : ""}
          aria-invalid={Boolean(error)}
          aria-describedby={descritoPor}
          onChange={(e) => cambiar(e.target.value, mm)}
        >
          {horas.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span className="horas-menu-sep" aria-hidden="true">
          :
        </span>
        <select
          aria-label={`${etiqueta}: minutos`}
          value={mm}
          className={error ? "error" : ""}
          aria-invalid={Boolean(error)}
          aria-describedby={descritoPor}
          onChange={(e) => cambiar(hh, e.target.value)}
        >
          {minutos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="horas-menu-unidad" aria-hidden="true">
          h
        </span>
      </div>
      {!sinAyuda && (
        <small className="field-hint" id={ayudaId}>
          Horas y minutos (HH:MM). Mínimo{" "}
          {textoCantidadHoras(CANTIDAD_MINIMA_HORAS)}; máximo{" "}
          {formatoHoras(Math.max(maximoHoras, CANTIDAD_MINIMA_HORAS))} h
          {alcance === "evento"
            ? " (la duración del evento)."
            : " según tu límite diario."}
        </small>
      )}
    </div>
  );
}

/**
 * Duración del evento: la misma cantidad HH:MM que las estimaciones, con el
 * tope del límite diario programado.
 */
function CampoDuracion({
  id,
  valor,
  onChange,
  error,
  limiteDiario,
  testId,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  error?: string;
  limiteDiario: number;
  testId?: string;
}) {
  const maximo = Math.max(limiteDiario, timeToHours(valor));
  return (
    <CampoHoras
      id={id}
      valor={valor}
      onChange={onChange}
      error={error}
      testId={testId}
      etiqueta="Duración"
      maximoHoras={maximo}
    />
  );
}

function ConfiguracionCapacidadDiaria({
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
    // El servidor acepta de 1 a 16 h: el cliente usa el mismo rango.
    if (!/^\d+$/.test(borrador.trim()) || numero < 1 || numero > LIMITE_DIARIO_MAXIMO) {
      setError(
        `El límite diario debe ser un número entero entre 1 y ${LIMITE_DIARIO_MAXIMO} horas.`,
      );
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
        <div className="eyebrow">OPCIONES DE LA CUENTA</div>
        <h2 id="daily-capacity-title">Límite diario de trabajo</h2>
        <p>
          Define cuántas horas de gestiones puedes planificar por día. El sistema
          usa este límite para avisarte cuando mover una gestión produciría una
          sobrecarga.
        </p>
        <IndicadorHoras
          horas={carga}
          limite={limiteDiario}
          alcance="hoy"
          testId="daily-capacity-total"
        />
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
              max={LIMITE_DIARIO_MAXIMO}
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
            Número entero de 1 a {LIMITE_DIARIO_MAXIMO}. Se guarda en tu cuenta y
            aplica a todas tus gestiones.
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
              Límite guardado: {formatoHoras(Number(borrador))} h al día.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Opciones() {
  const { eventos } = useStore();
  return (
    <div className="form-page">
      <Encabezado
        eyebrow="Cuenta"
        titulo="Opciones"
        descripcion="Ajustes que aplican a todas tus gestiones."
      />
      <ConfiguracionCapacidadDiaria eventos={eventos} fecha={hoyISO()} />
    </div>
  );
}

function Hoy() {
  const {
    eventos,
    hoy,
    errorCarga,
    refrescar,
    actualizarSubtarea,
    limiteDiario,
  } = useStore();
  const [reprogramar, setReprogramar] = useState<TareaHoy | null>(null);

  const grupos: GruposHoy = hoy?.grupos ?? {
    vencidas: [],
    para_hoy: [],
    proximas: [],
  };
  const total = hoy?.total ?? 0;
  const cargaHoy = sumarHorasAbiertas(eventos, hoyISO());

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
              onReprogramar={() => setReprogramar(t)}
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
          <button
            className="button button-primary"
            onClick={() => refrescar()}
          >
            <RotateCcw size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  const descripcionHoy =
    total > 0
      ? `${total} ${total === 1 ? "gestión urgente" : "gestiones urgentes"}.`
      : "El plan está despejado.";

  return (
    <div>
      <Encabezado
        eyebrow="Panel de control"
        titulo="Hoy"
        descripcion={descripcionHoy}
        accion={
          <Link href="/crear" className="button button-primary">
            <Plus size={15} /> Crear evento
          </Link>
        }
      />
      <div className="hoy-resumen">
        <IndicadorHoras
          horas={cargaHoy}
          limite={limiteDiario}
          alcance="hoy"
          testId="hoy-horas-planificadas"
        />
      </div>
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
      ) : (
        <>
          {total === 0 && (
            <EmptyState
              titulo="No hay gestiones pendientes"
              copy="Todo lo que vencía hoy está hecho. Puedes revisar tus eventos o crear uno nuevo."
              accion={
                <Link href="/eventos" className="button button-secondary">
                  Ver eventos
                </Link>
              }
            />
          )}
          {total > 0 && (
            <>
              {bloque("Vencidas", grupos.vencidas, "No hay gestiones vencidas.")}
              {bloque("Para hoy", grupos.para_hoy, "Nada vence hoy.")}
              {bloque("Próximas", grupos.proximas, "No hay próximas gestiones.")}
            </>
          )}
        </>
      )}
      {reprogramar && (
        <ReprogramarDialog
          tarea={reprogramar}
          evento={eventos.find((e) => e.id === reprogramar.eventoId)}
          onClose={() => setReprogramar(null)}
        />
      )}
    </div>
  );
}

/** Filtros de /eventos. Cada uno corresponde a un `estado_agenda` del servidor. */
const FILTROS_EVENTO: { valor: string; etiqueta: string; vacio: string }[] = [
  { valor: "activos", etiqueta: "Activos y retrasados", vacio: "No tienes eventos activos ni retrasados." },
  { valor: "pasados", etiqueta: "Pasados", vacio: "No tienes eventos terminados." },
  { valor: "todos", etiqueta: "Todos", vacio: "No tienes eventos." },
];

function coincideConFiltro(evento: Evento, filtro: string) {
  if (filtro === "todos") return true;
  if (filtro === "activos") return estaActivo(evento);
  return evento.estadoAgenda === filtro;
}

function Eventos() {
  const { eventos } = useStore();
  const [filtro, setFiltro] = useState("activos");
  const filtroActual = FILTROS_EVENTO.find((f) => f.valor === filtro)!;
  const lista = eventos
    .filter((e) => coincideConFiltro(e, filtro))
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
        <label htmlFor="filtro-eventos" className="muted" style={{ fontSize: 12 }}>
          Filtro
        </label>
        <select
          id="filtro-eventos"
          value={filtro}
          data-testid="filtro-eventos"
          onChange={(e) => setFiltro(e.target.value)}
        >
          {FILTROS_EVENTO.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.etiqueta}
            </option>
          ))}
        </select>
        <span className="muted" style={{ fontSize: 12 }}>
          {lista.length === 1 ? "1 evento visible" : `${lista.length} eventos visibles`}
        </span>
      </div>
      {eventos.length === 0 ? (
        <EmptyState
          titulo="El tablero está vacío"
          copy="Crea tu primer evento para empezar."
          accion={
            <Link href="/crear" className="button button-primary">
              <Plus size={15} /> Crear evento
            </Link>
          }
        />
      ) : lista.length === 0 ? (
        <EmptyState
          titulo={filtroActual.etiqueta}
          copy={filtroActual.vacio}
          accion={
            filtro !== "todos" ? (
              <button
                className="button button-secondary"
                onClick={() => setFiltro("todos")}
              >
                Ver todos los eventos
              </button>
            ) : (
              <Link href="/crear" className="button button-primary">
                <Plus size={15} /> Crear evento
              </Link>
            )
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
          {evento.estadoAgenda === "retrasado" && (
            <span className="tag tag-overdue">Retrasado</span>
          )}
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
  lugar: string;
  notas: string;
};
type BorradorTarea = {
  id: string;
  titulo: string;
  categoria: string;
  prioridad: Prioridad;
  fechaLimite: string;
  horaInicio: string;
  estimacion: string;
};
/** Errores por campo de una gestión del plan inicial. */
type ErrorTarea = Record<string, string>;

const CATEGORIAS_GESTION = [
  { valor: "otro", etiqueta: "Otro" },
  { valor: "salon", etiqueta: "Salón" },
  { valor: "invitaciones", etiqueta: "Invitaciones" },
  { valor: "catering", etiqueta: "Catering" },
  { valor: "proveedores", etiqueta: "Proveedores" },
];

const formEventoInicial = (): FormEvento => ({
  nombre: "",
  tipo: "Lanzamiento",
  fechaInicio: sumarDias(hoyISO(), 14),
  fechaFin: sumarDias(hoyISO(), 14),
  horaEvento: "19:00",
  duracion: "04:00",
  lugar: "",
  notas: "",
});
const borradorInicial = (fechaLimite: string): BorradorTarea => ({
  id: generarId("draft"),
  titulo: "",
  categoria: "otro",
  prioridad: "media",
  fechaLimite,
  horaInicio: "09:00",
  estimacion: "01:00",
});

/** Comprueba el borrador de una gestión del plan inicial. */
function validarBorrador(borrador: BorradorTarea, maximoHoras: number): ErrorTarea {
  const e: ErrorTarea = {};
  if (!borrador.titulo.trim()) e.titulo = "Escribe el nombre de la gestión.";
  if (!esHorasValidas(borrador.estimacion, maximoHoras, CANTIDAD_MINIMA_HORAS)) {
    e.estimacion = `Indica una estimación entre 30 minutos y ${formatoHoras(maximoHoras)} h.`;
  }
  if (!borrador.fechaLimite) e.fechaLimite = "Elige la fecha límite.";
  if (!borrador.horaInicio) e.horaInicio = "Elige la hora de comienzo.";
  return e;
}

/**
 * El plazo de una gestión vive dentro de las fechas del evento: es la misma
 * regla que aplica el servidor al crear o editar una gestión.
 */
function validarPlazo(
  fechaLimite: string,
  fechaInicio: string,
  fechaFin = "",
): string {
  if (fechaLimite && fechaInicio && fechaLimite < fechaInicio) {
    return `No puede ser anterior al inicio del evento (${fechaBonita(
      fechaInicio,
      true,
    )}).`;
  }
  if (fechaLimite && fechaFin && fechaLimite > fechaFin) {
    return `No puede ser posterior al fin del evento (${fechaBonita(
      fechaFin,
      true,
    )}).`;
  }
  return "";
}
function CrearEvento() {
  const [mostrarPlan, setMostrarPlan] = useState(false);
  const { crearEventoCompleto, eventos, limiteDiario } = useStore();
  const [, setLocation] = useLocation();
  const [datos, setDatos] = useState<FormEvento>(formEventoInicial);
  const [tareas, setTareas] = useState<BorradorTarea[]>([]);
  const [nuevo, setNuevo] = useState<BorradorTarea>(() =>
    borradorInicial(formEventoInicial().fechaInicio),
  );
  const [errorNuevo, setErrorNuevo] = useState<ErrorTarea>({});
  const [errorTareas, setErrorTareas] = useState<Record<string, ErrorTarea>>({});
  const [error, setError] = useState<Record<string, string>>({});
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  /** Última fecha de inicio vista, para mover el plan con el evento. */
  const inicioAnteriorRef = useRef(datos.fechaInicio);

  /**
   * Al mover las fechas del evento, el plan se mueve con él (mismo delta de
   * días) para que la validación trabaje con lo último que escribió el
   * organizador; los plazos nunca quedan después del inicio.
   */
  useEffect(() => {
    const anterior = inicioAnteriorRef.current;
    inicioAnteriorRef.current = datos.fechaInicio;
    if (!anterior || !datos.fechaInicio) return;
    const delta = diferenciaDias(anterior, datos.fechaInicio);
    if (delta === 0) return;
    setDatos((d) =>
      d.fechaFin && d.fechaFin < d.fechaInicio
        ? { ...d, fechaFin: d.fechaInicio }
        : d,
    );
    const reubicar = (fecha: string) => {
      if (!fecha) return datos.fechaInicio;
      const nueva = sumarDias(fecha, delta);
      if (nueva < datos.fechaInicio) return datos.fechaInicio;
      if (datos.fechaFin && nueva > datos.fechaFin) return datos.fechaFin;
      return nueva;
    };
    setTareas((actuales) =>
      actuales.map((t) => ({ ...t, fechaLimite: reubicar(t.fechaLimite) })),
    );
    setNuevo((n) => ({ ...n, fechaLimite: reubicar(n.fechaLimite) }));
    // La reubicación cambia los avisos del plan: los anteriores quedan obsoletos.
    setError((errs) => {
      const restantes = Object.entries(errs).filter(
        ([campo]) => !campo.startsWith("plan:") && campo !== "general",
      );
      return restantes.length ? Object.fromEntries(restantes) : {};
    });
  }, [datos.fechaInicio]);

  // Si cambia el fin del evento, las fechas del plan no quedan por fuera.
  useEffect(() => {
    if (!datos.fechaFin) return;
    const fijar = (fecha: string) =>
      fecha && fecha > datos.fechaFin ? datos.fechaFin : fecha;
    setTareas((actuales) =>
      actuales.map((t) => ({ ...t, fechaLimite: fijar(t.fechaLimite) })),
    );
    setNuevo((n) => ({ ...n, fechaLimite: fijar(n.fechaLimite) }));
    setError((errs) => {
      const restantes = Object.entries(errs).filter(
        ([campo]) => !campo.startsWith("plan:") && campo !== "general",
      );
      return restantes.length ? Object.fromEntries(restantes) : {};
    });
  }, [datos.fechaFin]);

  const setCampo = (campo: keyof FormEvento, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setError((errs) => ({ ...errs, [campo]: "" }));
    // Cambió la información del evento: los avisos del plan se recalculan.
    limpiarAvisosDelPlan();
  };

  /** Al tocar el plan, los avisos del último intento de envío dejan de aplicar. */
  const limpiarAvisosDelPlan = () => {
    setError((errs) => {
      const restantes = Object.entries(errs).filter(
        ([campo]) => !campo.startsWith("plan:") && campo !== "general",
      );
      return restantes.length ? Object.fromEntries(restantes) : {};
    });
  };

  // Al corregir el campo, su mensaje desaparece; al mover el inicio del evento
  // los plazos se recolocan y el aviso de plazo deja de aplicar.
  const actualizarTarea = (id: string, cambios: Partial<BorradorTarea>) => {
    const lista = tareas.map((t) => (t.id === id ? { ...t, ...cambios } : t));
    setTareas(lista);
    setErrorTareas((errs) => ({ ...errs, [id]: { ...errs[id] } }));
    refrescarAvisoTotal(lista);
  };

  const quitarTarea = (id: string) => {
    const lista = tareas.filter((t) => t.id !== id);
    setTareas(lista);
    setErrorTareas(({ [id]: _quitada, ...resto }) => resto);
    refrescarAvisoTotal(lista);
  };

  /**
   * «Quitar plan» descarta el plan completo: vacía las gestiones del borrador
   * (para que no viajen al servidor al crear el evento) en lugar de solo
   * ocultar la sección.
   */
  const quitarPlan = () => {
    setTareas([]);
    setNuevo(borradorInicial(datos.fechaInicio));
    setErrorTareas({});
    setErrorNuevo({});
    limpiarAvisosDelPlan();
    setMostrarPlan(false);
  };

  const errorDeTarea = (id: string, campo: string) => errorTareas[id]?.[campo] ?? "";

  /**
   * La estimación de una gestión depende de la duración total del evento (no
   * del límite diario), sin quedar por debajo del valor ya escrito.
   */
  const maximoEstimacion = (valor: string) =>
    Math.max(timeToHours(datos.duracion), timeToHours(valor));

  /**
   * El plan completo tampoco puede sumar más horas que la duración del evento:
   * cubre las plantillas y cualquier combinación escrita a mano.
   */
  const avisoTotalDelPlan = (lista: BorradorTarea[]) => {
    const duracion = timeToHours(datos.duracion);
    const total = lista.reduce((suma, t) => suma + timeToHours(t.estimacion), 0);
    if (duracion <= 0 || total <= duracion + 0.001) return "";
    return `El plan suma ${formatoHoras(total)} h de gestiones y el evento dura ${formatoHoras(
      duracion,
    )} h: ajusta alguna estimación o la duración del evento.`;
  };

  /** Limpia los avisos del plan y deja el del total recalculado con la lista dada. */
  const refrescarAvisoTotal = (lista: BorradorTarea[]) => {
    setError((errs) => {
      const restantes = Object.fromEntries(
        Object.entries(errs).filter(
          ([campo]) => !campo.startsWith("plan:") && campo !== "general",
        ),
      );
      const aviso = avisoTotalDelPlan(lista);
      return aviso ? { ...restantes, general: aviso } : restantes;
    });
  };

  /** Limpia la tarjeta de nueva gestión y deja el plan como estaba al abrirlo. */
  const limpiarNueva = () => {
    setNuevo(borradorInicial(datos.fechaInicio));
    setErrorNuevo({});
    limpiarAvisosDelPlan();
  };

  const añadirTarea = () => {
    const errs = validarBorrador(nuevo, maximoEstimacion(nuevo.estimacion));
    const plazo = validarPlazo(nuevo.fechaLimite, datos.fechaInicio, datos.fechaFin);
    if (plazo) errs.fechaLimite = plazo;
    if (Object.keys(errs).length > 0) {
      setErrorNuevo(errs);
      return;
    }
    setErrorNuevo({});
    const lista = [...tareas, { ...nuevo, id: generarId("draft") }];
    setTareas(lista);
    setNuevo(borradorInicial(datos.fechaInicio));
    refrescarAvisoTotal(lista);
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
          horaInicio: "10:00",
          estimacion: "02:00",
        },
        {
          titulo: "Confirmar salón",
          categoria: "salon",
          prioridad: "alta",
          fechaLimite: datos.fechaInicio,
          horaInicio: "12:00",
          estimacion: "00:30",
        },
      ],
      fiesta: [
        {
          titulo: "Comprar decoración",
          categoria: "otro",
          prioridad: "media",
          fechaLimite: datos.fechaInicio,
          horaInicio: "15:00",
          estimacion: "01:00",
        },
        {
          titulo: "Confirmar catering",
          categoria: "catering",
          prioridad: "alta",
          fechaLimite: datos.fechaInicio,
          horaInicio: "12:00",
          estimacion: "00:30",
        },
      ],
      boda: [
        {
          titulo: "Fotografía",
          categoria: "otro",
          prioridad: "alta",
          fechaLimite: datos.fechaInicio,
          horaInicio: "10:00",
          estimacion: "02:00",
        },
      ],
      reunion: [
        {
          titulo: "Hacer orden del día",
          categoria: "otro",
          prioridad: "media",
          fechaLimite: datos.fechaInicio,
          horaInicio: "09:00",
          estimacion: "01:00",
        },
      ],
    };
    const tareasNuevas = (plantillas[tipoPlan] || []).map((t) => ({
      ...t,
      id: generarId("draft"),
    }));
    setTareas(tareasNuevas);
    setErrorTareas({});
    // Si la plantilla no cabe en el evento, avisa de inmediato.
    refrescarAvisoTotal(tareasNuevas);
  };

  const intentarSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError({});

    // La tarjeta de nueva gestión se toma al crear el evento aunque no se haya
    // pulsado «Agregar al plan»: basta con que tenga nombre.
    let tareasFinales = tareas;
    const borradorConNombre = mostrarPlan && nuevo.titulo.trim().length > 0;
    if (borradorConNombre) {
      const errs = validarBorrador(nuevo, maximoEstimacion(nuevo.estimacion));
      const plazo = validarPlazo(nuevo.fechaLimite, datos.fechaInicio, datos.fechaFin);
      if (plazo) errs.fechaLimite = plazo;
      if (Object.keys(errs).length > 0) {
        // Alerta: a la nueva gestión le falta algún dato requerido.
        setErrorNuevo(errs);
        setError(validarDatosEvento(datos, limiteDiario));
        return;
      }
      tareasFinales = [...tareas, { ...nuevo, id: generarId("draft") }];
      setTareas(tareasFinales);
      setNuevo(borradorInicial(datos.fechaInicio));
      setErrorNuevo({});
    }

    // Se puede crear el evento sin gestiones: nada obliga a usar «Quitar plan».
    const validacion = validarDatosEvento(datos, limiteDiario);

    // La fecha de inicio del evento no puede quedar antes de hoy; si es hoy,
    // la hora de inicio todavía debe estar por llegar.
    if (datos.fechaInicio && datos.fechaInicio < hoyISO()) {
      validacion.fechaInicio = "La fecha de inicio no puede ser anterior a hoy.";
    } else if (datos.fechaInicio === hoyISO() && datos.horaEvento) {
      const ahora = new Date();
      const hhmm = `${String(ahora.getHours()).padStart(2, "0")}:${String(
        ahora.getMinutes(),
      ).padStart(2, "0")}`;
      if (datos.horaEvento < hhmm) {
        validacion.horaEvento =
          "El evento ya empezó hoy a esa hora: elige una hora más tarde o una fecha posterior.";
      }
    }
    // Los plazos del plan se validan contra la fecha de inicio del evento.
    if (mostrarPlan) {
      tareasFinales.forEach((t) => {
        const problema = validarPlazo(
          t.fechaLimite,
          datos.fechaInicio,
          datos.fechaFin,
        );
        if (problema) {
          validacion[`plan:${t.id}`] =
            `Gestión ${tareasFinales.indexOf(t) + 1}: ${problema}`;
        }
      });
    }

    if (mostrarPlan && tareasFinales.length) {
      const porFecha = tareasFinales.reduce<Record<string, number>>((acum, tarea) => {
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
              `${fechaBonita(dia.fecha, true)}: ${formatoHoras(dia.horas)} h de ${formatoHoras(limiteDiario)} h (te pasas por ${formatoHoras(dia.horas - limiteDiario)} h)`,
          )
          .join("; ");
        validacion.general = `El plan supera tu límite diario de ${formatoHoras(
          limiteDiario,
        )} h en ${detalle}.`;
      }
    }

    // El plan completo tampoco puede sumar más que la duración del evento.
    if (tareasFinales.length) {
      const avisoTotal = avisoTotalDelPlan(tareasFinales);
      if (avisoTotal) {
        validacion.general = validacion.general
          ? `${validacion.general} ${avisoTotal}`
          : avisoTotal;
      }
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
      tipo: datos.tipo.trim() || "Otro",
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      horaEvento: datos.horaEvento,
      duracion: timeToHours(datos.duracion),
      lugar: datos.lugar.trim(),
      notas: datos.notas.trim(),
      // El límite diario real del organizador, no un valor fijo.
      capacidadDiaria: limiteDiario,
      cancelado: false,
    };
    const tareasPayload = tareas.map((t) => ({
      titulo: t.titulo.trim(),
      categoria: t.categoria,
      prioridad: t.prioridad,
      estado: "pendiente" as EstadoSubtarea,
      fechaLimite: t.fechaLimite,
      // La hora límite la calcula el servidor (comienzo + estimación).
      horaLimite: "",
      horaInicio: t.horaInicio || undefined,
      estimacion: timeToHours(t.estimacion),
      motivoMovimiento: "",
    }));
    const id = await crearEventoCompleto(eventoPayload, tareasPayload);
    if (id) {
      setLocation("/evento/" + id);
    }
  };

  return (
    <div className="form-page">
      <Encabezado eyebrow="Nuevo plan" titulo="Crear evento" />
      <form onSubmit={intentarSubmit} className="card form-card" noValidate>
        <section className="form-section">
          <h2 className="form-section-title">Identidad del evento</h2>
          <p className="form-section-note">
            Los campos con * son obligatorios.
          </p>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="evento-nombre">
                Nombre <span className="req">*</span>
              </label>
              {error.nombre && (
                <ErrorCampo id="evento-nombre-error">{error.nombre}</ErrorCampo>
              )}
              <input
                id="evento-nombre"
                className={error.nombre ? "error" : ""}
                value={datos.nombre}
                autoComplete="off"
                aria-invalid={Boolean(error.nombre)}
                aria-describedby={error.nombre ? "evento-nombre-error" : undefined}
                onChange={(e) => setCampo("nombre", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="evento-tipo">Tipo</label>
              {error.tipo && <ErrorCampo id="evento-tipo-error">{error.tipo}</ErrorCampo>}
              <select
                id="evento-tipo"
                className={error.tipo ? "error" : ""}
                aria-invalid={Boolean(error.tipo)}
                value={TIPOS_EVENTO.includes(datos.tipo) ? datos.tipo : "Otro"}
                onChange={(e) =>
                  setCampo("tipo", e.target.value === "Otro" ? "" : e.target.value)
                }
              >
                {TIPOS_EVENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
                <option value="Otro">Otro…</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="evento-lugar">
                Lugar <span className="req">*</span>
              </label>
              {error.lugar && (
                <ErrorCampo id="evento-lugar-error">{error.lugar}</ErrorCampo>
              )}
              <input
                id="evento-lugar"
                className={error.lugar ? "error" : ""}
                value={datos.lugar}
                autoComplete="off"
                aria-invalid={Boolean(error.lugar)}
                aria-describedby={error.lugar ? "evento-lugar-error" : undefined}
                onChange={(e) => setCampo("lugar", e.target.value)}
              />
            </div>
            {!TIPOS_EVENTO.includes(datos.tipo) && (
              <div className="field full">
                <label htmlFor="evento-tipo-personalizado">
                  Escribe el tipo del evento
                </label>
                {error.tipo && <ErrorCampo id="evento-tipo-error">{error.tipo}</ErrorCampo>}
                <input
                  id="evento-tipo-personalizado"
                  className={error.tipo ? "error" : ""}
                  placeholder="Por ejemplo: Aniversario"
                  value={datos.tipo}
                  aria-invalid={Boolean(error.tipo)}
                  aria-describedby={error.tipo ? "evento-tipo-error" : undefined}
                  onChange={(e) => setCampo("tipo", e.target.value)}
                />
              </div>
            )}
            <div className="field full">
              <div className="form-grid form-grid-dates">
                <div className="field">
                  <label htmlFor="evento-inicio">
                    Fecha de inicio <span className="req">*</span>
                  </label>
                  {error.fechaInicio && (
                    <ErrorCampo id="evento-inicio-error">
                      {error.fechaInicio}
                    </ErrorCampo>
                  )}
                  <input
                    id="evento-inicio"
                    type="date"
                    min={hoyISO()}
                    className={error.fechaInicio ? "error" : ""}
                    value={datos.fechaInicio}
                    aria-invalid={Boolean(error.fechaInicio)}
                    aria-describedby={
                      error.fechaInicio ? "evento-inicio-error" : undefined
                    }
                    onChange={(e) => setCampo("fechaInicio", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="evento-fin">
                    Fecha de fin <span className="req">*</span>
                  </label>
                  {error.fechaFin && (
                    <ErrorCampo id="evento-fin-error">{error.fechaFin}</ErrorCampo>
                  )}
                  <input
                    id="evento-fin"
                    type="date"
                    min={datos.fechaInicio || undefined}
                    className={error.fechaFin ? "error" : ""}
                    value={datos.fechaFin}
                    aria-invalid={Boolean(error.fechaFin)}
                    aria-describedby={
                      error.fechaFin ? "evento-fin-error" : "evento-fin-ayuda"
                    }
                    onChange={(e) => setCampo("fechaFin", e.target.value)}
                  />
                  <small className="field-hint" id="evento-fin-ayuda">
                    No puede ser anterior al inicio.
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="evento-hora">
                    Hora de inicio <span className="req">*</span>
                  </label>
                  {error.horaEvento && (
                    <ErrorCampo id="evento-hora-error">{error.horaEvento}</ErrorCampo>
                  )}
                  <input
                    id="evento-hora"
                    type="time"
                    className={error.horaEvento ? "error" : ""}
                    value={datos.horaEvento}
                    aria-invalid={Boolean(error.horaEvento)}
                    aria-describedby={
                      error.horaEvento ? "evento-hora-error" : undefined
                    }
                    onChange={(e) => setCampo("horaEvento", e.target.value)}
                  />
                </div>
                <CampoDuracion
                  id="evento-duracion"
                  testId="evento-duracion"
                  valor={datos.duracion}
                  error={error.duracion}
                  limiteDiario={limiteDiario}
                  onChange={(valor) => setCampo("duracion", valor)}
                />
              </div>
            </div>
            <div className="field full">
              <label htmlFor="evento-notas">Notas de producción</label>
              <textarea
                id="evento-notas"
                value={datos.notas}
                placeholder="Accesos, equipos, contactos clave…"
                onChange={(e) => setCampo("notas", e.target.value)}
              />
            </div>
          </div>
        </section>
        {!mostrarPlan ? (
          <section className="form-section plan-invitar">
            <div>
              <div className="plan-card-num">Opcional</div>
              <h2 className="form-section-title">Plan inicial de gestiones</h2>
              <p className="form-section-note">
                Añade las primeras tareas del evento. Puedes empezar desde una
                plantilla o escribirlas una a una.
              </p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setMostrarPlan(true)}
              data-testid="activar-plan"
            >
              <Plus size={14} /> Agregar plan inicial
            </button>
          </section>
        ) : (
          <section className="form-section">
            <div className="plan-head">
              <div>
                <h2 className="form-section-title plan-title">
                  Plan inicial
                  <span className="plan-total">
                    {tareas.length}{" "}
                    {tareas.length === 1 ? "gestión" : "gestiones"}
                  </span>
                </h2>
                <p className="form-section-note">
                  Las fechas de las gestiones van{" "}
                  <strong>dentro del evento</strong>: del{" "}
                  {fechaBonita(datos.fechaInicio, true)} al{" "}
                  {fechaBonita(datos.fechaFin, true)}. La hora límite se calcula
                  sola (comienzo + estimación) y el plan no puede sumar más de{" "}
                  {formatoHoras(timeToHours(datos.duracion))} h. También puedes
                  crear el evento sin gestiones.
                </p>
              </div>
              <div className="plan-head-acciones">
                <button
                  type="button"
                  className="button button-ghost button-small"
                  onClick={quitarPlan}
                  title="Descarta todas las gestiones del plan inicial"
                  data-testid="quitar-plan"
                >
                  Quitar plan
                </button>
              </div>
            </div>

            <div className="plan-plantillas">
              <label htmlFor="plan-plantilla">Plantillas rápidas</label>
              <select
                id="plan-plantilla"
                value=""
                onChange={(e) => aplicarPlanPredefinido(e.target.value)}
              >
                <option value="">Cargar una plantilla…</option>
                <option value="conferencia">Plan Conferencia</option>
                <option value="fiesta">Plan Fiesta</option>
                <option value="boda">Plan Boda</option>
                <option value="reunion">Plan Reunión</option>
              </select>
              <small className="field-hint">
                Al cargar una plantilla se reemplazan las gestiones del plan.
              </small>
            </div>

            {tareas.length > 0 && (
              <ul className="plan-lista">
                {tareas.map((t, index) => (
                  <li className="plan-card" key={t.id}>
                    <div className="plan-card-head">
                      <span className="plan-card-num">Gestión {index + 1}</span>
                      <button
                        type="button"
                        className="button button-small button-ghost button-icon"
                        onClick={() => quitarTarea(t.id)}
                        title={`Quitar la gestión ${index + 1}`}
                        aria-label={`Quitar «${t.titulo || `la gestión ${index + 1}`}» del plan`}
                        data-testid={`quitar-plan-${index + 1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="field">
                      <label htmlFor={`plan-${t.id}-titulo`}>
                        Nombre <span className="req">*</span>
                      </label>
                      {errorDeTarea(t.id, "titulo") && (
                        <ErrorCampo id={`plan-${t.id}-titulo-error`}>
                          {errorDeTarea(t.id, "titulo")}
                        </ErrorCampo>
                      )}
                      <input
                        id={`plan-${t.id}-titulo`}
                        value={t.titulo}
                        className={errorDeTarea(t.id, "titulo") ? "error" : ""}
                        aria-invalid={Boolean(errorDeTarea(t.id, "titulo"))}
                        aria-describedby={
                          errorDeTarea(t.id, "titulo")
                            ? `plan-${t.id}-titulo-error`
                            : undefined
                        }
                        onChange={(e) =>
                          actualizarTarea(t.id, { titulo: e.target.value })
                        }
                      />
                    </div>
                    <div className="plan-grid">
                      <CampoHoras
                        id={`plan-${t.id}-estimacion`}
                        valor={t.estimacion}
                        error={errorDeTarea(t.id, "estimacion")}
                        maximoHoras={maximoEstimacion(t.estimacion)}
                        alcance="evento"
                        onChange={(valor) =>
                          actualizarTarea(t.id, { estimacion: valor })
                        }
                      />
                      <div className="field">
                        <label htmlFor={`plan-${t.id}-fecha`}>
                          Fecha límite <span className="req">*</span>
                        </label>
                        {errorDeTarea(t.id, "fechaLimite") && (
                          <ErrorCampo id={`plan-${t.id}-fecha-error`}>
                            {errorDeTarea(t.id, "fechaLimite")}
                          </ErrorCampo>
                        )}
                        <input
                          id={`plan-${t.id}-fecha`}
                          type="date"
                          min={datos.fechaInicio || undefined}
                          max={datos.fechaFin || undefined}
                          data-testid="initial-plan-deadline"
                          value={t.fechaLimite}
                          className={errorDeTarea(t.id, "fechaLimite") ? "error" : ""}
                          aria-invalid={Boolean(errorDeTarea(t.id, "fechaLimite"))}
                          aria-describedby={
                            errorDeTarea(t.id, "fechaLimite")
                              ? `plan-${t.id}-fecha-error`
                              : `plan-${t.id}-fecha-ayuda`
                          }
                          onChange={(e) =>
                            actualizarTarea(t.id, { fechaLimite: e.target.value })
                          }
                        />
                        <small className="field-hint" id={`plan-${t.id}-fecha-ayuda`}>
                          Entre {fechaBonita(datos.fechaInicio, true)} y{" "}
                          {fechaBonita(datos.fechaFin, true)}.
                        </small>
                      </div>
                      <div className="field">
                        <label htmlFor={`plan-${t.id}-hora`}>
                          Hora de comienzo <span className="req">*</span>
                        </label>
                        {errorDeTarea(t.id, "horaInicio") && (
                          <ErrorCampo id={`plan-${t.id}-hora-error`}>
                            {errorDeTarea(t.id, "horaInicio")}
                          </ErrorCampo>
                        )}
                        <input
                          id={`plan-${t.id}-hora`}
                          type="time"
                          value={t.horaInicio}
                          className={errorDeTarea(t.id, "horaInicio") ? "error" : ""}
                          aria-invalid={Boolean(errorDeTarea(t.id, "horaInicio"))}
                          aria-describedby={
                            errorDeTarea(t.id, "horaInicio")
                              ? `plan-${t.id}-hora-error`
                              : undefined
                          }
                          onChange={(e) =>
                            actualizarTarea(t.id, { horaInicio: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    {error[`plan:${t.id}`] && (
                      <div className="field-error" role="alert">
                        {error[`plan:${t.id}`]}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="plan-nueva">
              <div className="plan-card-head">
                <span className="plan-card-num">
                  Nueva gestión
                  {tareas.length > 0 && ` ${tareas.length + 1}`}
                </span>
                <button
                  type="button"
                  className="button button-small button-ghost button-icon"
                  onClick={limpiarNueva}
                  title="Limpiar la nueva gestión"
                  aria-label="Limpiar la nueva gestión"
                  data-testid="limpiar-nueva-gestion"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="field">
                <label htmlFor="plan-nuevo-titulo">
                  Nombre <span className="req">*</span>
                </label>
                {errorNuevo.titulo && (
                  <ErrorCampo id="plan-nuevo-titulo-error">
                    {errorNuevo.titulo}
                  </ErrorCampo>
                )}
                <input
                  id="plan-nuevo-titulo"
                  className={errorNuevo.titulo ? "error" : ""}
                  value={nuevo.titulo}
                  aria-invalid={Boolean(errorNuevo.titulo)}
                  aria-describedby={
                    errorNuevo.titulo ? "plan-nuevo-titulo-error" : undefined
                  }
                  onChange={(e) => {
                    setNuevo({ ...nuevo, titulo: e.target.value });
                    setErrorNuevo((errs) => ({ ...errs, titulo: "" }));
                    limpiarAvisosDelPlan();
                  }}
                />
              </div>
              <div className="plan-grid">
                <CampoHoras
                  id="plan-nuevo-estimacion"
                  valor={nuevo.estimacion}
                  error={errorNuevo.estimacion}
                  maximoHoras={maximoEstimacion(nuevo.estimacion)}
                  alcance="evento"
                  onChange={(valor) => {
                    setNuevo({ ...nuevo, estimacion: valor });
                    setErrorNuevo((errs) => ({ ...errs, estimacion: "" }));
                    limpiarAvisosDelPlan();
                  }}
                />
                <div className="field">
                  <label htmlFor="plan-nuevo-fecha">
                    Fecha límite <span className="req">*</span>
                  </label>
                  {errorNuevo.fechaLimite && (
                    <ErrorCampo id="plan-nuevo-fecha-error">
                      {errorNuevo.fechaLimite}
                    </ErrorCampo>
                  )}
                  <input
                    id="plan-nuevo-fecha"
                    type="date"
                    min={datos.fechaInicio || undefined}
                    max={datos.fechaFin || undefined}
                    data-testid="plan-nuevo-deadline"
                    value={nuevo.fechaLimite}
                    className={errorNuevo.fechaLimite ? "error" : ""}
                    aria-invalid={Boolean(errorNuevo.fechaLimite)}
                    aria-describedby={
                      errorNuevo.fechaLimite
                        ? "plan-nuevo-fecha-error"
                        : "plan-nuevo-fecha-ayuda"
                    }
                    onChange={(e) => {
                      setNuevo({ ...nuevo, fechaLimite: e.target.value });
                      setErrorNuevo((errs) => ({ ...errs, fechaLimite: "" }));
                      limpiarAvisosDelPlan();
                    }}
                  />
                  <small className="field-hint" id="plan-nuevo-fecha-ayuda">
                    Entre {fechaBonita(datos.fechaInicio, true)} y{" "}
                    {fechaBonita(datos.fechaFin, true)}: fechas del evento.
                  </small>
                </div>
                <div className="field">
                  <label htmlFor="plan-nuevo-hora">
                    Hora de comienzo <span className="req">*</span>
                  </label>
                  {errorNuevo.horaInicio && (
                    <ErrorCampo id="plan-nuevo-hora-error">
                      {errorNuevo.horaInicio}
                    </ErrorCampo>
                  )}
                  <input
                    id="plan-nuevo-hora"
                    type="time"
                    value={nuevo.horaInicio}
                    className={errorNuevo.horaInicio ? "error" : ""}
                    aria-invalid={Boolean(errorNuevo.horaInicio)}
                    aria-describedby={
                      errorNuevo.horaInicio ? "plan-nuevo-hora-error" : undefined
                    }
                    onChange={(e) => {
                      setNuevo({ ...nuevo, horaInicio: e.target.value });
                      setErrorNuevo((errs) => ({ ...errs, horaInicio: "" }));
                      limpiarAvisosDelPlan();
                    }}
                  />
                </div>
              </div>
              <div className="plan-nueva-acciones">
                <button
                  type="button"
                  className="button button-secondary button-small"
                  onClick={añadirTarea}
                  data-testid="anadir-plan"
                >
                  <Plus size={14} /> Agregar al plan
                </button>
              </div>
            </div>
          </section>
        )}
        {error.general && (
          <div className="error-box" role="alert">
            {error.general}
          </div>
        )}
        <div className="form-actions">
          <Link href="/eventos" className="button button-ghost">
            Cancelar
          </Link>
          <button className="button button-primary" type="submit">
            <Check size={15} /> Crear evento
          </button>
        </div>
      </form>
      {mostrarConfirmacion && (
        <ConfirmDialog
          titulo="¿Crear el evento?"
          mensaje={
            tareas.length
              ? `Se creará «${datos.nombre.trim()}» con ${tareas.length} ${
                  tareas.length === 1 ? "gestión" : "gestiones"
                } en su plan.`
              : `Se creará «${datos.nombre.trim()}» sin plan de gestiones.`
          }
          onClose={() => setMostrarConfirmacion(false)}
          onConfirm={confirmarSubmit}
          confirmText="Aceptar"
          isDanger={false}
        />
      )}
    </div>
  );
}

/** Reglas del formulario general de evento, compartidas por crear y editar. */
function validarDatosEvento(
  datos: FormEvento,
  limiteDiario: number,
  duracionOriginal = 0,
) {
  const e: Record<string, string> = {};
  if (!datos.nombre.trim()) e.nombre = "Escribe el nombre del evento.";
  if (!datos.lugar.trim()) e.lugar = "Indica dónde se hará el evento.";
  if (!datos.fechaInicio) e.fechaInicio = "Elige la fecha de inicio.";
  if (!datos.fechaFin) e.fechaFin = "Elige la fecha de fin.";
  if (datos.fechaInicio && datos.fechaFin && datos.fechaFin < datos.fechaInicio) {
    e.fechaFin = "La fecha de fin no puede ser anterior a la de inicio.";
  }
  if (!datos.horaEvento) e.horaEvento = "Indica la hora de inicio del evento.";
  // La duración del evento se alinea con el límite diario programado.
  const maximoDuracion = Math.max(limiteDiario, duracionOriginal);
  if (!esHorasValidas(datos.duracion, maximoDuracion, CANTIDAD_MINIMA_HORAS)) {
    e.duracion = `Elige una duración entre 30 minutos y ${formatoHoras(maximoDuracion)} h.`;
  }
  if (!datos.tipo.trim()) e.tipo = "Elige o escribe el tipo de evento.";
  return e;
}

/** Reglas de una gestión, con el plazo acotado a las fechas del evento. */
function validarTarea(
  candidata: Subtarea,
  fechaInicio?: string,
  maximoHoras: number = LIMITE_DIARIO_MAXIMO,
  fechaFin?: string,
) {
  const e: Record<string, string> = {};
  if (!candidata.titulo.trim()) e.titulo = "Escribe el nombre de la gestión.";
  if (!candidata.fechaLimite) e.fechaLimite = "Elige la fecha límite.";
  const plazo = validarPlazo(candidata.fechaLimite, fechaInicio ?? "", fechaFin ?? "");
  if (plazo) e.fechaLimite = plazo;
  if (!candidata.horaInicio) e.horaInicio = "Elige la hora de comienzo.";
  if (
    !esHorasValidas(
      hoursToTime(candidata.estimacion),
      maximoHoras,
      CANTIDAD_MINIMA_HORAS,
    )
  ) {
    e.estimacion = `Indica una estimación entre 30 minutos y ${formatoHoras(maximoHoras)} h.`;
  }
  return e;
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
    actualizarEvento,
  } = useStore();
  const [, setLocation] = useLocation();
  const evento = eventos.find((e) => e.id === id);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [tareaEditar, setTareaEditar] = useState<Subtarea | null>(null);
  const [mover, setMover] = useState<Subtarea | null>(null);
  const [editarEvento, setEditarEvento] = useState(false);
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

  // La lista no se reordena al completar: la fila conserva su sitio y solo
  // cambia su estado visual, para que la casilla no salte de posición.
  const gestionadas = evento.subtareas;
  const abiertas = gestionadas.filter((t) => t.estado !== "hecho");
  const completadas = gestionadas.filter((t) => t.estado === "hecho");
  const porcentaje = calcularPorcentaje(evento);
  return (
    <div>
      <Link href="/eventos" className="detail-back">
        <ArrowLeft size={14} /> Todos los eventos
      </Link>
      <div className="detail-head">
        <div>
          <h1 className="detail-title">{evento.nombre}</h1>
          <div className="detail-subtitulo">
            <span className="detail-meta">
              {abiertas.length}{" "}
              {abiertas.length === 1
                ? "gestión abierta"
                : "gestiones abiertas"}
              {completadas.length > 0 && ` · ${completadas.length} hecha${
                completadas.length === 1 ? "" : "s"
              }`}
            </span>
          </div>
        </div>
        <div className="detail-score">
          <div className="score-number">{porcentaje}%</div>
          <div className="score-label">del plan ejecutado</div>
        </div>
      </div>
      <div className="detail-resumen">
        <IndicadorHoras
          horas={evento.horasPlanificadas}
          limite={limiteDiario}
          alcance="evento"
          testId="evento-horas-planificadas"
        />
      </div>
      <section
        className="card card-pad detail-progress"
        aria-label="Progreso del evento"
      >
        <BarraProgresoEvento evento={evento} />
      </section>
      <div className="detail-actions">
        <button
          className="button button-primary"
          onClick={() => setMostrarAgregar((v) => !v)}
        >
          <Plus size={15} />{" "}
          {mostrarAgregar ? "Cerrar formulario" : "Agregar gestión"}
        </button>
        <button
          className="button button-secondary"
          onClick={() => setEditarEvento(true)}
        >
          <Pencil size={14} /> Editar evento
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
              limiteDiario,
              tareaEditar.id,
            );
            if (problema) return problema;
            if (await actualizarSubtarea(evento.id, t)) setTareaEditar(null);
            return false;
          }}
        />
      )}
      {editarEvento && (
        <EventoEditorDialog
          evento={evento}
          onClose={() => setEditarEvento(false)}
          onSave={(payload) => actualizarEvento(evento.id, payload)}
        />
      )}
      {mover && (
        <ReprogramarDialog
          tarea={mover}
          evento={evento}
          onClose={() => setMover(null)}
        />
      )}
      <div className="detail-layout">
        <section>
          {mostrarAgregar && (
            <div className="detail-form">
              <TaskEditor
                evento={evento}
                onCancel={() => setMostrarAgregar(false)}
                onSave={async (t) => {
                  const e = validarTarea(
                    t as Subtarea,
                    evento.fechaInicio,
                    evento.duracion,
                    evento.fechaFin,
                  );
                  if (Object.keys(e).length > 0) return false;
                  const problema = validarCapacidadesTarea(
                    eventos,
                    evento.id,
                    t as Subtarea,
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
          {gestionadas.length ? (
            <div className="task-list">
              {gestionadas.map((t) => (
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
              copy="Este evento todavía no tiene gestiones. Agrega la primera para empezar."
            />
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
          horaInicio: "09:00",
          horaLimite: "",
          estimacion: "01:00",
        },
  );
  const [error, setError] = useState<Record<string, string>>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError({});
    // El borrador guarda las horas como texto; la validación las necesita en número.
    const horas = timeToHours(tarea.estimacion as string);
    const errs = validarTarea(
      { ...tarea, estimacion: horas } as unknown as Subtarea,
      evento.fechaInicio,
      Math.max(evento.duracion, tareaInicial?.estimacion ?? 0),
      evento.fechaFin,
    );
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
    <form className="card card-pad task-editor" onSubmit={submit} noValidate>
      <div className="task-editor-grid">
        <div className="field full">
          <label htmlFor="gestion-titulo">
            Nombre <span className="req">*</span>
          </label>
          {error.titulo && (
            <ErrorCampo id="gestion-titulo-error">{error.titulo}</ErrorCampo>
          )}
          <input
            id="gestion-titulo"
            className={error.titulo ? "error" : ""}
            value={tarea.titulo}
            autoComplete="off"
            aria-invalid={Boolean(error.titulo)}
            aria-describedby={error.titulo ? "gestion-titulo-error" : undefined}
            onChange={(e) => setTarea({ ...tarea, titulo: e.target.value })}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="gestion-fecha">
            Fecha límite <span className="req">*</span>
          </label>
          {error.fechaLimite && (
            <ErrorCampo id="gestion-fecha-error">{error.fechaLimite}</ErrorCampo>
          )}
          <input
            id="gestion-fecha"
            type="date"
            className={error.fechaLimite ? "error" : ""}
            data-testid="task-deadline-input"
            min={evento.fechaInicio}
            max={evento.fechaFin}
            value={tarea.fechaLimite}
            aria-invalid={Boolean(error.fechaLimite)}
            aria-describedby={
              error.fechaLimite ? "gestion-fecha-error" : "gestion-fecha-ayuda"
            }
            onChange={(e) =>
              setTarea({ ...tarea, fechaLimite: e.target.value })
            }
          />
          <small className="field-hint" id="gestion-fecha-ayuda">
            Entre {fechaBonita(evento.fechaInicio, true)} y{" "}
            {fechaBonita(evento.fechaFin, true)}: fechas del evento.
          </small>
        </div>
        <div className="field">
          <label htmlFor="gestion-hora">
            Hora de comienzo <span className="req">*</span>
          </label>
          {error.horaInicio && (
            <ErrorCampo id="gestion-hora-error">{error.horaInicio}</ErrorCampo>
          )}
          <input
            id="gestion-hora"
            type="time"
            className={error.horaInicio ? "error" : ""}
            value={tarea.horaInicio}
            aria-invalid={Boolean(error.horaInicio)}
            aria-describedby={error.horaInicio ? "gestion-hora-error" : undefined}
            onChange={(e) => setTarea({ ...tarea, horaInicio: e.target.value })}
          />
        </div>
        <CampoHoras
          id="gestion-estimacion"
          testId="task-estimacion"
          valor={tarea.estimacion as string}
          error={error.estimacion}
          maximoHoras={Math.max(
            evento.duracion,
            timeToHours(tarea.estimacion as string),
          )}
          alcance="evento"
          onChange={(valor) => setTarea({ ...tarea, estimacion: valor })}
        />
        <div className="field">
          <label htmlFor="gestion-categoria">Categoría</label>
          <select
            id="gestion-categoria"
            value={tarea.categoria}
            onChange={(e) => setTarea({ ...tarea, categoria: e.target.value })}
          >
            {CATEGORIAS_GESTION.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error.general && (
        <div className="error-box" role="alert">
          {error.general}
        </div>
      )}
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

const TIPOS_EVENTO = [
  "Lanzamiento",
  "Fiesta",
  "Taller",
  "Reunión",
  "Conferencia",
];

function EventoEditorDialog({
  evento,
  onClose,
  onSave,
}: {
  evento: Evento;
  onClose: () => void;
  onSave: (payload: EventoPayload) => Promise<boolean>;
}) {
  const { limiteDiario } = useStore();
  const [datos, setDatos] = useState<FormEvento>(() => ({
    nombre: evento.nombre,
    tipo: evento.tipo,
    fechaInicio: evento.fechaInicio,
    fechaFin: evento.fechaFin,
    horaEvento: evento.horaEvento,
    duracion: hoursToTime(evento.duracion),
    lugar: evento.lugar,
    notas: evento.notas,
  }));
  const [error, setError] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const setCampo = (campo: keyof FormEvento, valor: string) => {
    // Mover el inicio arrastra el fin para no dejar una fecha inválida.
    setDatos((d) => {
      const siguiente = { ...d, [campo]: valor };
      if (campo === "fechaInicio" && siguiente.fechaFin < valor) {
        return { ...siguiente, fechaFin: valor };
      }
      return siguiente;
    });
    setError((errs) => ({ ...errs, [campo]: "" }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError({});
    const validacion = validarDatosEvento(
      datos,
      limiteDiario,
      evento.duracion,
    );
    if (Object.keys(validacion).length > 0) {
      setError(validacion);
      return;
    }
    setGuardando(true);
    const ok = await onSave({
      nombre: datos.nombre.trim(),
      tipo: datos.tipo.trim() || "Otro",
      fechaInicio: datos.fechaInicio,
      fechaFin: datos.fechaFin,
      horaEvento: datos.horaEvento,
      duracion: timeToHours(datos.duracion),
      lugar: datos.lugar.trim(),
      notas: datos.notas.trim(),
      capacidadDiaria: evento.capacidadDiaria,
      cancelado: evento.cancelado,
    });
    setGuardando(false);
    if (ok) onClose();
  };

  const tipoPersonalizado = !TIPOS_EVENTO.includes(datos.tipo);
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <form
        className="dialog dialog-evento"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        noValidate
      >
        <div className="dialog-body">
          <div className="dialog-title">
            <h2>Editar evento</h2>
            <p>Actualiza los datos generales; las gestiones no se modifican.</p>
          </div>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="editar-nombre">
                Nombre <span className="req">*</span>
              </label>
              {error.nombre && (
                <ErrorCampo id="editar-nombre-error">{error.nombre}</ErrorCampo>
              )}
              <input
                id="editar-nombre"
                className={error.nombre ? "error" : ""}
                value={datos.nombre}
                aria-invalid={Boolean(error.nombre)}
                aria-describedby={error.nombre ? "editar-nombre-error" : undefined}
                onChange={(e) => setCampo("nombre", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="editar-tipo">Tipo</label>
              <select
                id="editar-tipo"
                value={tipoPersonalizado ? "Otro" : datos.tipo}
                onChange={(e) =>
                  setCampo(
                    "tipo",
                    e.target.value === "Otro" ? "" : e.target.value,
                  )
                }
              >
                {TIPOS_EVENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
                <option value="Otro">Otro…</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="editar-lugar">
                Lugar <span className="req">*</span>
              </label>
              {error.lugar && (
                <ErrorCampo id="editar-lugar-error">{error.lugar}</ErrorCampo>
              )}
              <input
                id="editar-lugar"
                className={error.lugar ? "error" : ""}
                value={datos.lugar}
                aria-invalid={Boolean(error.lugar)}
                aria-describedby={error.lugar ? "editar-lugar-error" : undefined}
                onChange={(e) => setCampo("lugar", e.target.value)}
              />
            </div>
            {tipoPersonalizado && (
              <div className="field full">
                <label htmlFor="editar-tipo-personalizado">
                  Escribe el tipo del evento
                </label>
                {error.tipo && (
                  <ErrorCampo id="editar-tipo-error">{error.tipo}</ErrorCampo>
                )}
                <input
                  id="editar-tipo-personalizado"
                  className={error.tipo ? "error" : ""}
                  placeholder="Por ejemplo: Aniversario"
                  value={datos.tipo}
                  aria-invalid={Boolean(error.tipo)}
                  aria-describedby={error.tipo ? "editar-tipo-error" : undefined}
                  onChange={(e) => setCampo("tipo", e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="editar-inicio">
                Fecha de inicio <span className="req">*</span>
              </label>
              {error.fechaInicio && (
                <ErrorCampo id="editar-inicio-error">
                  {error.fechaInicio}
                </ErrorCampo>
              )}
              <input
                id="editar-inicio"
                type="date"
                className={error.fechaInicio ? "error" : ""}
                value={datos.fechaInicio}
                aria-invalid={Boolean(error.fechaInicio)}
                aria-describedby={
                  error.fechaInicio ? "editar-inicio-error" : undefined
                }
                onChange={(e) => setCampo("fechaInicio", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="editar-fin">
                Fecha de fin <span className="req">*</span>
              </label>
              {error.fechaFin && (
                <ErrorCampo id="editar-fin-error">{error.fechaFin}</ErrorCampo>
              )}
              <input
                id="editar-fin"
                type="date"
                min={datos.fechaInicio || undefined}
                className={error.fechaFin ? "error" : ""}
                value={datos.fechaFin}
                aria-invalid={Boolean(error.fechaFin)}
                aria-describedby={
                  error.fechaFin ? "editar-fin-error" : "editar-fin-ayuda"
                }
                onChange={(e) => setCampo("fechaFin", e.target.value)}
              />
              <small className="field-hint" id="editar-fin-ayuda">
                No puede ser anterior al inicio.
              </small>
            </div>
            <div className="field">
              <label htmlFor="editar-hora">
                Hora de inicio <span className="req">*</span>
              </label>
              {error.horaEvento && (
                <ErrorCampo id="editar-hora-error">{error.horaEvento}</ErrorCampo>
              )}
              <input
                id="editar-hora"
                type="time"
                className={error.horaEvento ? "error" : ""}
                value={datos.horaEvento}
                aria-invalid={Boolean(error.horaEvento)}
                aria-describedby={
                  error.horaEvento ? "editar-hora-error" : undefined
                }
                onChange={(e) => setCampo("horaEvento", e.target.value)}
              />
            </div>
            <CampoDuracion
              id="editar-duracion"
              testId="editar-duracion"
              valor={datos.duracion}
              error={error.duracion}
              limiteDiario={limiteDiario}
              onChange={(valor) => setCampo("duracion", valor)}
            />
            <div className="field full">
              <label htmlFor="editar-notas">Notas de producción</label>
              <textarea
                id="editar-notas"
                value={datos.notas}
                onChange={(e) => setCampo("notas", e.target.value)}
              />
            </div>
          </div>
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
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ReprogramarDialog({
  tarea,
  evento,
  onClose,
}: {
  tarea: Subtarea;
  /** El evento dueño, para limitar la fecha al inicio del evento. */
  evento?: Evento;
  onClose: () => void;
}) {
  const { reprogramarSubtarea, resolverConflictoSubtarea, limiteDiario } =
    useStore();
  const [fecha, setFecha] = useState(tarea.fechaLimite);
  const [horaInicio, setHoraInicio] = useState(tarea.horaInicio ?? "");
  const [estimacion, setEstimacion] = useState(hoursToTime(tarea.estimacion));
  const [motivo, setMotivo] = useState(tarea.motivoMovimiento ?? "");
  const [error, setError] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [conflicto, setConflicto] = useState<ConflictoSobrecarga | null>(null);
  const [avisoPersistencia, setAvisoPersistencia] = useState("");
  const [estimacionConflicto, setEstimacionConflicto] = useState<number | null>(
    null,
  );
  const conflictoRef = useRef<HTMLDivElement>(null);
  const estimacionNumerica = timeToHours(estimacion);
  /**
   * El tope es la duración total del evento (el límite diario solo si no hay
   * evento a la vista); nunca por debajo de la estimación original.
   */
  const maximoEstimacion = Math.max(
    evento?.duracion ?? limiteDiario,
    tarea.estimacion,
  );

  const intentarGuardar = async (fechaPropuesta: string, horas: number) => {
    const problema = validarTarea(
      { ...tarea, fechaLimite: fechaPropuesta, horaInicio, estimacion: horas },
      evento?.fechaInicio,
      maximoEstimacion,
      evento?.fechaFin,
    );
    if (Object.keys(problema).length > 0) {
      setErrores(problema);
      setError("");
      return;
    }
    setErrores({});
    setGuardando(true);
    setError("");
    const res = await reprogramarSubtarea(tarea.id, {
      fechaLimite: fechaPropuesta,
      horaInicio,
      estimacion: horas,
      motivoMovimiento: motivo.trim(),
    });
    setGuardando(false);
    if (res.ok) {
      onClose();
      return;
    }
    if (res.tipo === "conflicto") {
      setAvisoPersistencia("");
      setEstimacionConflicto(horas);
      setConflicto(res.conflicto);
      return;
    }
    setError(res.error);
  };

  const confirmar = (e: FormEvent) => {
    e.preventDefault();
    if (!esHorasValidas(estimacion, maximoEstimacion, CANTIDAD_MINIMA_HORAS)) {
      setErrores({
        estimacion: `Indica una estimación entre 30 minutos y ${formatoHoras(maximoEstimacion)} h.`,
      });
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
      fecha: fechaSugerida,
      limiteHoras: res.data.limiteHoras,
      horasActuales: 0,
      horasNuevaGestion: estimacionNumerica,
      horasTotalesProyectadas: res.data.horasTotalesProyectadas,
      horasExceso: res.data.horasExceso,
      estrategiasDisponibles: ["mover_otro_dia", "reducir_horas"],
      fechasSugeridas: res.data.fechasSugeridas,
      mensaje: res.data.mensaje,
    });
  };

  const aplicarReduccion = async () => {
    if (!esHorasValidas(estimacion, maximoEstimacion, CANTIDAD_MINIMA_HORAS)) {
      setError(
        `La estimación debe estar entre 30 minutos y ${formatoHoras(maximoEstimacion)} h.`,
      );
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
      fecha,
      limiteHoras: res.data.limiteHoras,
      horasActuales: 0,
      horasNuevaGestion: estimacionNumerica,
      horasTotalesProyectadas: res.data.horasTotalesProyectadas,
      horasExceso: res.data.horasExceso,
      estrategiasDisponibles: ["mover_otro_dia", "reducir_horas"],
      fechasSugeridas: res.data.fechasSugeridas,
      mensaje: res.data.mensaje,
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
        className="dialog dialog-mover"
        onSubmit={confirmar}
        onMouseDown={(e) => e.stopPropagation()}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="mover-titulo"
      >
        <div className="dialog-body">
          <div className="dialog-title">
            <h2 id="mover-titulo">Mover gestión</h2>
            <p>{tarea.titulo}</p>
          </div>
          <div className="mover-grid">
            <div className="field">
              <label htmlFor="reprogramar-fecha">
                Nueva fecha límite <span className="req">*</span>
              </label>
              {errores.fechaLimite && (
                <ErrorCampo id="reprogramar-fecha-error">
                  {errores.fechaLimite}
                </ErrorCampo>
              )}
              <input
                id="reprogramar-fecha"
                type="date"
                min={evento?.fechaInicio}
                max={evento?.fechaFin}
                value={fecha}
                data-testid="reprogramar-fecha"
                className={errores.fechaLimite ? "error" : ""}
                aria-invalid={Boolean(errores.fechaLimite)}
                aria-describedby={
                  errores.fechaLimite
                    ? "reprogramar-fecha-error"
                    : evento
                      ? "reprogramar-fecha-ayuda"
                      : undefined
                }
                onChange={(e) => {
                  setFecha(e.target.value);
                  setErrores((x) => ({ ...x, fechaLimite: "" }));
                  setConflicto(null);
                  setAvisoPersistencia("");
                }}
              />
              {evento && (
                <small className="field-hint" id="reprogramar-fecha-ayuda">
                  Debe estar entre {fechaBonita(evento.fechaInicio, true)} y{" "}
                  {fechaBonita(evento.fechaFin, true)}.
                </small>
              )}
            </div>
            <div className="field">
              <label htmlFor="reprogramar-hora">
                Hora de comienzo <span className="req">*</span>
              </label>
              {errores.horaInicio && (
                <ErrorCampo id="reprogramar-hora-error">
                  {errores.horaInicio}
                </ErrorCampo>
              )}
              <input
                id="reprogramar-hora"
                type="time"
                value={horaInicio}
                className={errores.horaInicio ? "error" : ""}
                aria-invalid={Boolean(errores.horaInicio)}
                aria-describedby={errores.horaInicio ? "reprogramar-hora-error" : undefined}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
              <small className="field-hint">
                La hora límite se recalcula: comienzo + estimación.
              </small>
            </div>
            <CampoHoras
              id="reprogramar-estimacion"
              testId="reprogramar-estimacion"
              valor={estimacion}
              error={errores.estimacion}
              maximoHoras={maximoEstimacion}
              alcance="evento"
              onChange={(valor) => {
                setEstimacion(valor);
                setErrores((x) => ({ ...x, estimacion: "" }));
                setConflicto(null);
                setAvisoPersistencia("");
              }}
            />
            <div className="field">
              <label htmlFor="reprogramar-motivo">
                Motivo del cambio{" "}
                <span className="opcional">(opcional)</span>
              </label>
              <input
                id="reprogramar-motivo"
                data-testid="reprogramar-motivo"
                type="text"
                maxLength={500}
                value={motivo}
                placeholder="ej. el salón se liberó más tarde"
                autoComplete="off"
                aria-describedby="reprogramar-motivo-ayuda"
                onChange={(e) => setMotivo(e.target.value)}
              />
              <small className="field-hint" id="reprogramar-motivo-ayuda">
                Puedes mover la gestión sin escribirlo. Queda anotado junto a la
                gestión.
              </small>
            </div>
          </div>
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
            {guardando ? "Guardando…" : "Mover gestión"}
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
                  Para el {fechaHoraBonita(conflicto.fecha)} quedarías con{" "}
                  <strong>
                    {formatoHoras(conflicto.horasTotalesProyectadas)} h
                    planificadas
                  </strong>{" "}
                  (límite {formatoHoras(conflicto.limiteHoras)} h)
                  {conflicto.horasExceso > 0 &&
                    `, un exceso de ${formatoHoras(conflicto.horasExceso)} h`}
                  .
                  {conflicto.horasActuales > 0 &&
                    ` Otras gestiones abiertas de ese día suman ${formatoHoras(conflicto.horasActuales)} h.`}
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
                  {conflicto.fechasSugeridas.length ? (
                    conflicto.fechasSugeridas.map((sugerida) => (
                      <div
                        className="capacity-conflict-option"
                        key={sugerida.fecha}
                      >
                        <div>
                          <strong>Mover a un día con capacidad</strong>
                          <span>
                            {fechaHoraBonita(sugerida.fecha)} ·{" "}
                            {formatoHoras(sugerida.horasTotalesProyectadas)} h de{" "}
                            {formatoHoras(conflicto.limiteHoras)} h
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
                      No encontramos otro día con capacidad dentro de las fechas
                      del evento. Elige otra fecha manualmente.
                    </p>
                  )}
                  <div className="capacity-conflict-option">
                    <div>
                      <strong>Reducir la estimación</strong>
                      <span>El total se actualiza al cambiar las horas.</span>
                    </div>
                    <div className="capacity-conflict-reduce">
                      <CampoHoras
                        id="reprogramar-estimacion-conflicto"
                        testId="reprogramar-estimacion-conflicto"
                        etiqueta="Nueva estimación"
                        valor={estimacion}
                        maximoHoras={maximoEstimacion}
                        alcance="evento"
                        sinAyuda
                        onChange={(valor) => {
                          setEstimacion(valor);
                          setErrores((x) => ({ ...x, estimacion: "" }));
                        }}
                      />
                      <button
                        type="button"
                        className="button button-secondary button-small"
                        onClick={() => void aplicarReduccion()}
                        disabled={
                          guardando ||
                          !esHorasValidas(
                            estimacion,
                            maximoEstimacion,
                            CANTIDAD_MINIMA_HORAS,
                          ) ||
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
                    gridTemplateColumns: "minmax(0,1fr) minmax(210px, 280px)",
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
                    <div
                      style={{
                        fontSize: "24px",
                        color: p === 100 ? "var(--salvia)" : "#e0e0e0",
                        fontWeight: 300,
                      }}
                    >
                      {p}%
                    </div>
                  </div>
                  <BarraProgresoEvento evento={e} compacta />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Página del enlace enviado por correo: /restablecer?uid=...&token=...
 * Valida los datos con el servidor y guarda la nueva contraseña.
 */
function RestablecerPasswordPage() {
  const [, setLocation] = useLocation();
  // El enlace del correo trae uid y token por query string.
  const parametros = new URLSearchParams(window.location.search);
  const uid = parametros.get("uid") ?? "";
  const token = parametros.get("token") ?? "";
  const enlaceCompleto = Boolean(uid && token);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!enlaceCompleto) {
      setError("El enlace no trae los datos de recuperación. Solicita uno nuevo.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      await api.post("/auth/restablecer/", { uid, token, password });
      setListo(true);
    } catch (err: any) {
      setError(
        err.response?.data
          ? mensajeDeError(err.response.data)
          : "No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
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
            Nueva contraseña
          </h1>
          <p style={{ color: "var(--apagado)", fontSize: 14 }}>
            Elige la contraseña que usarás desde ahora.
          </p>
        </div>

        <div
          style={{ background: "var(--panel)", padding: 32, borderRadius: 12 }}
        >
          {listo ? (
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
                Contraseña actualizada. Ya puedes iniciar sesión con la nueva.
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
                Iniciar sesión
              </button>
            </div>
          ) : (
            <form onSubmit={enviar} noValidate>
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
                  Nueva contraseña
                </label>
                <input
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div
                className="field"
                style={{ marginBottom: 16, textAlign: "left" }}
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
                  Confirmar contraseña
                </label>
                <input
                  type={mostrarPassword ? "text" : "password"}
                  required
                  value={confirmar}
                  onChange={(e) => {
                    setConfirmar(e.target.value);
                    setError("");
                  }}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                />
              </div>
              <label className="checkbox-line" style={{ marginBottom: 16 }}>
                <input
                  type="checkbox"
                  checked={mostrarPassword}
                  onChange={(e) => setMostrarPassword(e.target.checked)}
                />
                Mostrar contraseñas
              </label>
              {(error || !enlaceCompleto) && (
                <span
                  style={{
                    color: "var(--oxido)",
                    fontSize: 12,
                    marginBottom: 12,
                    display: "block",
                    textAlign: "left",
                  }}
                >
                  {error ||
                    "El enlace no trae los datos de recuperación. Solicita uno nuevo."}
                </span>
              )}
              {enlaceCompleto ? (
                <button
                  type="submit"
                  disabled={enviando}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "var(--azul-claro)",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: enviando ? "default" : "pointer",
                    opacity: enviando ? 0.7 : 1,
                    marginBottom: 16,
                  }}
                >
                  {enviando ? "Guardando…" : "Guardar contraseña"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLocation("/recuperar")}
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
                  Solicitar un enlace nuevo
                </button>
              )}
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
                  Volver al inicio de sesión
                </span>
              </div>
            </form>
          )}
        </div>
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
            noValidate
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
            noValidate
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
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!correo.includes("@")) {
      setError("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      await api.post("/auth/recuperar/", {
        email: correo.trim().toLowerCase(),
      });
      setEnviado(true);
    } catch (err: any) {
      setError(
        err.response?.data
          ? mensajeDeError(err.response.data)
          : "No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
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
                  marginBottom: 12,
                  background: "rgba(5, 150, 105, 0.1)",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid var(--salvia)",
                }}
              >
                Anotamos <strong>{correo.trim()}</strong>. Si el correo tiene una
                cuenta, te enviamos un enlace para restablecer la contraseña:
                ábrelo para elegir la nueva.
              </p>
              <p
                style={{
                  color: "var(--apagado)",
                  fontSize: 12,
                  marginBottom: 20,
                }}
              >
                ¿No llega en unos minutos? Revisa el spam. En desarrollo, el
                enlace también se imprime en la consola del servidor.
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
            <form onSubmit={handleSubmit} noValidate>
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
                disabled={enviando}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--azul-claro)",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: enviando ? "default" : "pointer",
                  opacity: enviando ? 0.7 : 1,
                  marginBottom: 16,
                }}
              >
                {enviando ? "Enviando…" : "Solicitar restablecimiento"}
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
