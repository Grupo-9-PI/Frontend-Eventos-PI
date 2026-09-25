import { api } from "@/services/api";

export type EstadoSubtarea = "pendiente" | "en_progreso" | "hecho";
export type Prioridad = "alta" | "media" | "baja";

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
  subtareas: Subtarea[];
  creadoEn: string;
};

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

export const CATEGORIAS = [
  { id: "salon", nombre: "Salón" },
  { id: "invitaciones", nombre: "Invitaciones" },
  { id: "catering", nombre: "Catering" },
  { id: "proveedores", nombre: "Proveedores" },
  { id: "otro", nombre: "Otro" },
];
export const PRIORIDADES: Prioridad[] = ["alta", "media", "baja"];

function hoy(): string {
  const fecha = new Date();
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
export function hoyISO(): string { return hoy(); }
export function sumarDias(fechaISO: string, dias: number): string {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}
export function diferenciaDias(desde: string, hasta: string): number {
  return Math.round((new Date(`${hasta}T12:00:00`).getTime() - new Date(`${desde}T12:00:00`).getTime()) / 86400000);
}
export function combinarFechaHora(fecha: string, hora = "23:59"): number {
  return new Date(`${fecha}T${hora}:00`).getTime();
}
export function fechaBonita(fecha: string, incluirAnio = false): string {
  const texto = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    day: "numeric", month: "short", ...(incluirAnio ? { year: "numeric" } : {}),
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
    creadoEn: e.creado_en ? e.creado_en.slice(0,10) : hoyISO(),
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
  };
}

function mapEventoToApi(e: Omit<Evento, "id"|"subtareas"|"creadoEn">) {
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
    hora_limite: t.horaLimite,
    hora_inicio: t.horaInicio || null,
  };
}

export const repositorioEventos = {
  async cargar(): Promise<Resultado<Evento[]>> {
    try {
      const response = await api.get('/eventos/');
      return { ok: true, data: response.data.map(mapEventoFromApi) };
    } catch (e: any) {
      console.error(e);
      return { ok: false, error: "No se pudo cargar los eventos desde el servidor." };
    }
  },

  async crearEvento(evento: Omit<Evento, "id"|"subtareas"|"creadoEn">): Promise<Resultado<Evento>> {
    try {
      const response = await api.post('/eventos/', mapEventoToApi(evento));
      return { ok: true, data: mapEventoFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: e.response?.data ? JSON.stringify(e.response.data) : "Error al crear evento." };
    }
  },

  async actualizarEvento(id: string, evento: Omit<Evento, "id"|"subtareas"|"creadoEn">): Promise<Resultado<Evento>> {
    try {
      const response = await api.put(`/eventos/${id}/`, mapEventoToApi(evento));
      return { ok: true, data: mapEventoFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: e.response?.data ? JSON.stringify(e.response.data) : "Error al actualizar evento." };
    }
  },

  async eliminarEvento(id: string): Promise<Resultado<boolean>> {
    try {
      await api.delete(`/eventos/${id}/`);
      return { ok: true, data: true };
    } catch (e: any) {
      return { ok: false, error: "Error al eliminar evento." };
    }
  },

  async crearSubtarea(eventoId: string, subtarea: Omit<Subtarea, "id">): Promise<Resultado<Subtarea>> {
    try {
      const response = await api.post('/subtareas/', mapSubtareaToApi(eventoId, subtarea));
      return { ok: true, data: mapSubtareaFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: e.response?.data ? JSON.stringify(e.response.data) : "Error al crear gestión." };
    }
  },

  async actualizarSubtarea(eventoId: string, subtarea: Subtarea): Promise<Resultado<Subtarea>> {
    try {
      const response = await api.put(`/subtareas/${subtarea.id}/`, mapSubtareaToApi(eventoId, subtarea));
      return { ok: true, data: mapSubtareaFromApi(response.data) };
    } catch (e: any) {
      return { ok: false, error: e.response?.data ? JSON.stringify(e.response.data) : "Error al actualizar gestión." };
    }
  },

  async eliminarSubtarea(id: string): Promise<Resultado<boolean>> {
    try {
      await api.delete(`/subtareas/${id}/`);
      return { ok: true, data: true };
    } catch (e: any) {
      return { ok: false, error: "Error al eliminar gestión." };
    }
  }
};

export function tareasGlobales(eventos: Evento[]) {
  return eventos.flatMap((evento) => evento.subtareas.map((subtarea) => ({ ...subtarea, eventoId: evento.id, eventoNombre: evento.nombre })));
}
