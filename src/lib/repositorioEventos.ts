import { api, mensajeDeError } from "@/services/api";

export type EstadoSubtarea = "pendiente" | "en_progreso" | "hecho" | "pospuesta";
export type Prioridad = "alta" | "media" | "baja";

/** Clasificación que calcula el servidor para los filtros de /eventos. */
export type EstadoAgenda = "activo" | "pasado" | "retrasado" | "cancelado";

export type Subtarea = {
  id: string;
  titulo: string;
  categoria: string;
  prioridad: Prioridad;
  estado: EstadoSubtarea;
  fechaLimite: string;
  horaLimite: string;
  horaInicio?: string;
  estimacion: number;
  /** Motivo del último movimiento (opcional). */
  motivoMovimiento?: string;
  /** Motivo opcional de la posposición (US-09). */
  notaPospuesta?: string;
};

export type FechaSugerida = {
  fecha: string;
  horasTotalesProyectadas: number;
};

export type ConflictoSobrecarga = {
  fecha: string;
  limiteHoras: number;
  horasActuales: number;
  horasNuevaGestion: number;
  horasTotalesProyectadas: number;
  horasExceso: number;
  estrategiasDisponibles: string[];
  fechasSugeridas: FechaSugerida[];
  mensaje: string;
};

export type ResultadoReprogramacion =
  | { ok: true; data: Subtarea }
  | { ok: false; tipo: "conflicto"; conflicto: ConflictoSobrecarga }
  | { ok: false; tipo: "error"; error: string };

export type RespuestaResolverConflicto = {
  resuelto: boolean;
  mensaje: string;
  subtarea: Subtarea;
  limiteHoras: number;
  horasTotalesProyectadas: number;
  horasExceso: number;
  fechasSugeridas: FechaSugerida[];
};

export type Evento = {
  id: string;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  horaEvento: string;
  duracion: number;
  lugar: string;
  notas: string;
  capacidadDiaria: number;
  horasPlanificadas: number;
  /** Un evento cancelado deja de generar trabajo pendiente. */
  cancelado: boolean;
  /** Clasificación del servidor; se recalcula en el cliente si aún no viene. */
  estadoAgenda: EstadoAgenda;
  subtareas: Subtarea[];
  creadoEn: string;
};

/** Datos editables de un evento (lo que se envía al API). */
export type EventoPayload = Omit<
  Evento,
  "id" | "subtareas" | "creadoEn" | "horasPlanificadas" | "estadoAgenda"
>;

/**
 * Fallo de una operación. `codigo` permite reaccionar a causas concretas sin
 * parsear el mensaje (por ejemplo, un servidor que aún no conoce un campo).
 */
export type Resultado<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; codigo?: string };

/** Código de fallo: el servidor rechazó un dato que aún no conoce. */
export const CODIGO_DATOS_NO_SOPORTADOS = "DATOS_NO_SOPORTADOS";

function hoy(): string {
  const fecha = new Date();
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
export function hoyISO(): string {
  return hoy();
}
export function sumarDias(fechaISO: string, dias: number): string {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}
export function diferenciaDias(desde: string, hasta: string): number {
  return Math.round(
    (new Date(`${hasta}T12:00:00`).getTime() -
      new Date(`${desde}T12:00:00`).getTime()) /
      86400000,
  );
}
export function combinarFechaHora(fecha: string, hora = "23:59"): number {
  return new Date(`${fecha}T${hora}:00`).getTime();
}
export function fechaBonita(fecha: string, incluirAnio = false): string {
  const texto = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    ...(incluirAnio ? { year: "numeric" } : {}),
  });
  return texto.replace(".", "");
}
export function fechaHoraBonita(fecha: string, hora?: string): string {
  return `${fechaBonita(fecha, true)}${hora ? ` · ${hora}` : ""}`;
}
export function generarId(prefijo: string): string {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Funciones de mapeo
/**
 * Réplica local de `EventoSerializer.get_estado_agenda`. Solo se usa si el
 * servidor todavía no envía `estado_agenda`; cuando llega, manda el servidor.
 */
function calcularEstadoAgenda(e: any, fechaInicio: string): EstadoAgenda {
  if (e.cancelado) return "cancelado";
  if (diferenciaDias(hoyISO(), fechaInicio) >= 0) return "activo";
  const abiertas = (e.subtareas || []).filter((t: any) => t.estado !== "hecho");
  return abiertas.length ? "retrasado" : "pasado";
}

function mapEventoFromApi(e: any): Evento {
  return {
    id: e.id.toString(),
    nombre: e.nombre,
    tipo: e.tipo || "Otro",
    fechaInicio: e.fecha_inicio,
    fechaFin: e.fecha_final,
    horaEvento: e.hora.slice(0, 5),
    duracion: Number(e.duracion_horas),
    lugar: e.lugar,
    notas: e.notas_produccion || "",
    capacidadDiaria: Number(e.limite_diario_horas),
    horasPlanificadas: Number(e.horas_planificadas ?? 0),
    cancelado: Boolean(e.cancelado),
    estadoAgenda: e.estado_agenda ?? calcularEstadoAgenda(e, e.fecha_inicio),
    creadoEn: e.creado_en ? e.creado_en.slice(0, 10) : hoyISO(),
    subtareas: (e.subtareas || []).map(mapSubtareaFromApi),
  };
}
function mapSubtareaFromApi(t: any): Subtarea {
  return {
    id: t.id.toString(),
    titulo: t.gestion,
    categoria: t.categoria.toLowerCase(),
    prioridad: t.prioridad,
    estado: t.estado,
    fechaLimite: t.plazo,
    horaLimite: t.hora_limite.slice(0, 5),
    horaInicio: t.hora_inicio ? t.hora_inicio.slice(0, 5) : undefined,
    estimacion: Number(t.estimacion_horas),
    motivoMovimiento: t.motivo_movimiento ?? "",
    notaPospuesta: t.nota_pospuesta ?? "",
  };
}

function mapFechaSugeridaFromApi(f: any): FechaSugerida {
  return {
    fecha: f.fecha,
    horasTotalesProyectadas: Number(f.horas_totales_proyectadas),
  };
}

function mapConflictoFromApi(c: any): ConflictoSobrecarga {
  return {
    fecha: c.fecha,
    limiteHoras: Number(c.limite_horas),
    horasActuales: Number(c.horas_actuales),
    horasNuevaGestion: Number(c.horas_nueva_gestion),
    horasTotalesProyectadas: Number(c.horas_totales_proyectadas),
    horasExceso: Number(c.horas_exceso),
    estrategiasDisponibles: Array.isArray(c.estrategias_disponibles)
      ? c.estrategias_disponibles
      : [],
    fechasSugeridas: Array.isArray(c.fechas_sugeridas)
      ? c.fechas_sugeridas.map(mapFechaSugeridaFromApi)
      : [],
    mensaje: c.mensaje ?? "",
  };
}

function mapEventoToApi(e: EventoPayload) {
  return {
    nombre: e.nombre,
    tipo: e.tipo,
    lugar: e.lugar,
    fecha_inicio: e.fechaInicio,
    fecha_final: e.fechaFin,
    hora: e.horaEvento,
    duracion_horas: e.duracion,
    limite_diario_horas: e.capacidadDiaria,
    notas_produccion: e.notas,
    cancelado: e.cancelado,
  };
}

function mapSubtareaToApi(eventoId: string, t: Omit<Subtarea, "id">) {
  return {
    evento: Number(eventoId),
    gestion: t.titulo,
    categoria: t.categoria.toUpperCase(),
    prioridad: t.prioridad,
    estado: t.estado,
    estimacion_horas: t.estimacion,
    plazo: t.fechaLimite,
    // La hora límite la calcula el servidor (comienzo + estimación); solo se
    // envía si aún no hay hora de comienzo (datos antiguos).
    hora_inicio: t.horaInicio || null,
    hora_limite: t.horaInicio ? undefined : t.horaLimite || undefined,
    motivo_movimiento: t.motivoMovimiento ?? "",
    nota_pospuesta: t.notaPospuesta ?? "",
  };
}

/** Traduce el fallo del servidor a un mensaje que pueda leer el organizador. */
function errorDe(e: any, porDefecto: string): string {
  return e.response?.data ? mensajeDeError(e.response.data) : porDefecto;
}

export const repositorioEventos = {
  async cargar(): Promise<Resultado<Evento[]>> {
    try {
      const response = await api.get("/eventos/");
      return { ok: true, data: response.data.map(mapEventoFromApi) };
    } catch (e: any) {
      console.error(e);
      return {
        ok: false,
        error: "No se pudo cargar los eventos desde el servidor.",
      };
    }
  },

  async crearEvento(
    evento: EventoPayload,
  ): Promise<Resultado<Evento>> {
    try {
      const response = await api.post("/eventos/", mapEventoToApi(evento));
      return { ok: true, data: mapEventoFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: errorDe(e, "No se pudo crear el evento.") };
    }
  },

  async actualizarEvento(
    id: string,
    evento: EventoPayload,
  ): Promise<Resultado<Evento>> {
    try {
      const response = await api.put(`/eventos/${id}/`, mapEventoToApi(evento));
      return { ok: true, data: mapEventoFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: errorDe(e, "No se pudo actualizar el evento.") };
    }
  },

  async eliminarEvento(id: string): Promise<Resultado<boolean>> {
    try {
      await api.delete(`/eventos/${id}/`);
      return { ok: true, data: true };
    } catch (e: any) {
      return { ok: false, error: errorDe(e, "No se pudo eliminar el evento.") };
    }
  },

  async crearSubtarea(
    eventoId: string,
    subtarea: Omit<Subtarea, "id">,
  ): Promise<Resultado<Subtarea>> {
    try {
      const response = await api.post(
        "/subtareas/",
        mapSubtareaToApi(eventoId, subtarea),
      );
      return { ok: true, data: mapSubtareaFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: errorDe(e, "No se pudo crear la gestión.") };
    }
  },

  async actualizarSubtarea(
    eventoId: string,
    subtarea: Subtarea,
  ): Promise<Resultado<Subtarea>> {
    try {
      const response = await api.put(
        `/subtareas/${subtarea.id}/`,
        mapSubtareaToApi(eventoId, subtarea),
      );
      return { ok: true, data: mapSubtareaFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: errorDe(e, "No se pudo actualizar la gestión.") };
    }
  },

  async reprogramar(
    id: string,
    cambios: {
      fechaLimite: string;
      horaInicio: string;
      estimacion: number;
      motivoMovimiento?: string;
    },
  ): Promise<ResultadoReprogramacion> {
    try {
      const response = await api.patch(`/subtareas/${id}/reprogramar/`, {
        plazo: cambios.fechaLimite,
        hora_inicio: cambios.horaInicio || null,
        estimacion_horas: cambios.estimacion,
        motivo_movimiento: cambios.motivoMovimiento ?? "",
      });
      return { ok: true, data: mapSubtareaFromApi(response.data) };
    } catch (e: any) {
      if (e.response?.status === 409) {
        return {
          ok: false,
          tipo: "conflicto",
          conflicto: mapConflictoFromApi(e.response.data),
        };
      }
      return {
        ok: false,
        tipo: "error",
        error: errorDe(
          e,
          "No se pudo guardar la nueva fecha. Revisa tu conexión e inténtalo de nuevo.",
        ),
      };
    }
  },

  async posponer(
    id: string,
    cambios: {
      fechaLimite?: string;
      horaInicio?: string;
      nota?: string;
    },
  ): Promise<Resultado<Subtarea>> {
    try {
      const response = await api.patch(`/subtareas/${id}/posponer/`, {
        plazo: cambios.fechaLimite || undefined,
        hora_inicio: cambios.horaInicio || undefined,
        nota_pospuesta: cambios.nota ?? "",
      });
      return { ok: true, data: mapSubtareaFromApi(response.data) };
    } catch (e: any) {
      return {
        ok: false,
        error: errorDe(e, "No se pudo posponer la gestión."),
      };
    }
  },

  async resolverConflicto(
    id: string,
    estrategia: "mover_otro_dia" | "reducir_horas" | "posponer",
    datos: {
      plazo?: string;
      horaLimite?: string;
      estimacion?: number;
      nota?: string;
    },
  ): Promise<Resultado<RespuestaResolverConflicto>> {
    try {
      const response = await api.post(`/subtareas/${id}/resolver-conflicto/`, {
        estrategia,
        plazo: datos.plazo,
        hora_limite: datos.horaLimite,
        estimacion_horas: datos.estimacion,
        nota_pospuesta: datos.nota,
      });
      const d = response.data;
      return {
        ok: true,
        data: {
          resuelto: Boolean(d.resuelto),
          mensaje: d.mensaje ?? "",
          subtarea: mapSubtareaFromApi(d.subtarea),
          limiteHoras: Number(d.limite_horas),
          horasTotalesProyectadas: Number(d.horas_totales_proyectadas),
          horasExceso: Number(d.horas_exceso),
          fechasSugeridas: Array.isArray(d.fechas_sugeridas)
            ? d.fechas_sugeridas.map(mapFechaSugeridaFromApi)
            : [],
        },
      };
    } catch (e: any) {
      return {
        ok: false,
        error: errorDe(
          e,
          "No se pudo resolver el conflicto. Revisa tu conexión e inténtalo de nuevo.",
        ),
      };
    }
  },

  async eliminarSubtarea(id: string): Promise<Resultado<boolean>> {
    try {
      await api.delete(`/subtareas/${id}/`);
      return { ok: true, data: true };
    } catch (e: any) {
      return { ok: false, error: errorDe(e, "No se pudo eliminar la gestión.") };
    }
  },
};

// ---------------------------------------------------------------------------
// Capacidad diaria del organizador (límite de horas, persistido en el servidor)
// ---------------------------------------------------------------------------

export const repositorioConfiguracion = {
  async cargar(): Promise<Resultado<number>> {
    try {
      const response = await api.get("/config/");
      return { ok: true, data: Number(response.data.limite_diario_horas) };
    } catch (e: any) {
      console.error(e);
      return {
        ok: false,
        error: "No se pudo cargar tu capacidad diaria desde el servidor.",
      };
    }
  },

  async actualizar(horas: number): Promise<Resultado<number>> {
    try {
      const response = await api.put("/config/", {
        limite_diario_horas: horas,
      });
      return { ok: true, data: Number(response.data.limite_diario_horas) };
    } catch (e: any) {
      return {
        ok: false,
        error: e.response?.data
          ? mensajeDeError(e.response.data)
          : "No se pudo guardar tu capacidad diaria. Revisa tu conexión e inténtalo de nuevo.",
      };
    }
  },
};

export function tareasGlobales(eventos: Evento[]) {
  return eventos.flatMap((evento) =>
    evento.subtareas.map((subtarea) => ({
      ...subtarea,
      eventoId: evento.id,
      eventoNombre: evento.nombre,
    })),
  );
}

export function hoursToTime(h: number): string {
  if (!h || !Number.isFinite(h) || h <= 0) return "00:00";
  const m = Math.round(h * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return hh.toString().padStart(2, "0") + ":" + mm.toString().padStart(2, "0");
}

/**
 * ¿El texto tiene forma HH:MM y representa una cantidad de horas válida?
 * `minimoHoras` permite exigir un piso (por ejemplo, media hora) sin romper el
 * caso por defecto, en el que cualquier cantidad mayor a cero vale.
 */
export function esHorasValidas(
  texto: string,
  maximoHoras = 24,
  minimoHoras = 0,
): boolean {
  if (!/^\d{1,2}:\d{2}$/.test(texto.trim())) return false;
  const horas = timeToHours(texto);
  if (!Number.isFinite(horas)) return false;
  if (minimoHoras > 0) return horas >= minimoHoras && horas <= maximoHoras;
  return horas > 0 && horas <= maximoHoras;
}

/**
 * Convierte "HH:MM" a horas. Devuelve 0 (nunca `NaN`) si el texto no tiene
 * forma HH:MM, para que una entrada inválida no acabe traveling al servidor.
 */
export function timeToHours(t: string): number {
  const partes = (t || "").trim().split(":");
  if (partes.length !== 2) return 0;
  const [hh, mm] = partes.map((p) => parseInt(p, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || mm < 0 || mm > 59) {
    return 0;
  }
  return Number((hh + mm / 60).toFixed(2));
}

// ---------------------------------------------------------------------------
// Vista Hoy: datos ya agrupados y ordenados por el backend
// ---------------------------------------------------------------------------

export type TareaHoy = Subtarea & { eventoId: string; eventoNombre: string };

export type GruposHoy = {
  vencidas: TareaHoy[];
  para_hoy: TareaHoy[];
  proximas: TareaHoy[];
};

export type RespuestaHoy = {
  generadoEn: string;
  total: number;
  filtros: { evento: number | null; estado: string };
  grupos: GruposHoy;
};

export type FiltrosHoy = {
  evento?: string;
  estado?: string;
};

// El endpoint /hoy usa nombres propios (titulo, fecha_limite), distintos a /subtareas/.
function mapTareaHoyFromApi(t: any): TareaHoy {
  return {
    id: t.id.toString(),
    titulo: t.titulo,
    categoria: (t.categoria ?? "OTRO").toLowerCase(),
    prioridad: t.prioridad,
    estado: t.estado,
    fechaLimite: t.fecha_limite,
    horaLimite: t.hora_limite.slice(0, 5),
    horaInicio: t.hora_inicio ? t.hora_inicio.slice(0, 5) : undefined,
    estimacion: Number(t.estimacion_horas),
    motivoMovimiento: t.motivo_movimiento ?? "",
    notaPospuesta: t.nota_pospuesta ?? "",
    eventoId: t.evento.id.toString(),
    eventoNombre: t.evento.nombre,
  };
}

export const repositorioHoy = {
  async cargar(filtros?: FiltrosHoy): Promise<Resultado<RespuestaHoy>> {
    try {
      const response = await api.get("/hoy/", { params: filtros });
      const datos = response.data;
      return {
        ok: true,
        data: {
          generadoEn: datos.generado_en,
          total: datos.total,
          filtros: datos.filtros,
          grupos: {
            vencidas: (datos.grupos?.vencidas ?? []).map(mapTareaHoyFromApi),
            para_hoy: (datos.grupos?.para_hoy ?? []).map(mapTareaHoyFromApi),
            proximas: (datos.grupos?.proximas ?? []).map(mapTareaHoyFromApi),
          },
        },
      };
    } catch (e: any) {
      console.error(e);
      return {
        ok: false,
        error: "No se pudieron cargar las gestiones del día desde el servidor.",
      };
    }
  },
};

