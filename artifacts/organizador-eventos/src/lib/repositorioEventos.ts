export type EstadoTarea = "pendiente" | "en_progreso" | "hecho";
export type Prioridad = "alta" | "media" | "baja";

export type Tarea = {
  id: string;
  titulo: string;
  categoria: string;
  prioridad: Prioridad;
  estado: EstadoTarea;
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
  tareas: Tarea[];
  creadoEn: string;
};

export type Resultado<T> = { ok: true; data: T } | { ok: false; error: string };

const CLAVE = "organizador-eventos.demo.v1";
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

function tarea(
  titulo: string,
  categoria: string,
  fechaLimite: string,
  estimacion: number,
  prioridad: Prioridad,
  estado: EstadoTarea = "pendiente",
  horaLimite = "18:00",
  horaInicio?: string,
): Tarea {
  return { id: generarId("tsk"), titulo, categoria, prioridad, estado, fechaLimite, horaLimite, horaInicio, estimacion };
}

function semillas(): Evento[] {
  const base = hoy();
  const lanzamiento: Evento = {
    id: generarId("evt"), nombre: "Lanzamiento Studio Norte", tipo: "Lanzamiento",
    fechaInicio: sumarDias(base, 9), fechaFin: sumarDias(base, 9), horaEvento: "19:00", duracion: 4,
    lugar: "Galería Ámbar · Manizales", notas: "Confirmar todo 48 h antes por posibles cambios de proveedor.",
    capacidadDiaria: 6, creadoEn: base,
    tareas: [
      tarea("Enviar invitaciones a lista VIP", "invitaciones", base, 2, "alta", "pendiente", "17:00"),
      tarea("Cerrar menú con catering", "catering", sumarDias(base, -1), 1.5, "media", "pendiente", "16:00"),
      tarea("Coordinar montaje de sonido", "proveedores", sumarDias(base, 3), 3, "media", "en_progreso", "10:00"),
      tarea("Confirmar disponibilidad del salón", "salon", sumarDias(base, -2), 1, "alta", "hecho", "12:00"),
    ],
  };
  const conferencia: Evento = {
    id: generarId("evt"), nombre: "Conferencia RetailTech", tipo: "Conferencia",
    fechaInicio: sumarDias(base, 3), fechaFin: sumarDias(base, 3), horaEvento: "18:00", duracion: 5,
    lugar: "Centro de Convenciones · Manizales", notas: "El proveedor de streaming avisó retraso de equipo.",
    capacidadDiaria: 6, creadoEn: base,
    tareas: [
      tarea("Prueba técnica de streaming", "proveedores", base, 2, "alta", "pendiente", "09:00", "08:00"),
      tarea("Confirmar asistencia de ponentes", "invitaciones", sumarDias(base, 1), 1, "alta", "en_progreso", "12:00"),
      tarea("Reservar coffee break", "catering", sumarDias(base, -3), 1, "media", "pendiente", "11:00"),
    ],
  };
  return [lanzamiento, conferencia];
}

function leer(): Resultado<Evento[]> {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) {
      const datos = semillas();
      window.localStorage.setItem(CLAVE, JSON.stringify(datos));
      return { ok: true, data: datos };
    }
    const datos = JSON.parse(crudo) as Evento[];
    if (!Array.isArray(datos)) throw new Error("Formato inválido");
    return { ok: true, data: datos };
  } catch {
    return { ok: false, error: "No se pudo leer el plan local. Revisa el espacio disponible y vuelve a intentar." };
  }
}
function escribir(eventos: Evento[]): Resultado<Evento[]> {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(eventos));
    return { ok: true, data: eventos };
  } catch {
    return { ok: false, error: "No se pudo guardar el cambio local. El navegador puede haber bloqueado el almacenamiento." };
  }
}

export const repositorioEventos = {
  // Futuro: cambiar localStorage por llamadas HTTP aquí, no en las vistas.
  cargar(): Resultado<Evento[]> { return leer(); },
  guardar(eventos: Evento[]): Resultado<Evento[]> { return escribir(eventos); },
  limpiar(): Resultado<Evento[]> { return escribir([]); },
};

export function tareasGlobales(eventos: Evento[]) {
  return eventos.flatMap((evento) => evento.tareas.map((tarea) => ({ ...tarea, eventoId: evento.id, eventoNombre: evento.nombre })));
}