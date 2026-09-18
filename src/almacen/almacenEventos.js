// Persistencia simple en localStorage. Sin backend por ahora:
// esta capa es la única que sabe cómo se guardan los datos,
// así que conectar una API real después solo implica reescribir este archivo.

const CLAVE_ALMACEN = "eventops.eventos.v3";

const CATEGORIAS = [
  { id: "salon", nombre: "Salón" },
  { id: "invitaciones", nombre: "Invitaciones" },
  { id: "catering", nombre: "Catering" },
  { id: "proveedores", nombre: "Proveedores" },
  { id: "otro", nombre: "Otro" },
];

const PRIORIDADES = ["alta", "media", "baja"];

// Máximo de horas laborales que se pueden acumular en un mismo día.
export const LIMITE_HORAS_DIA = 8;

function generarId(prefijo = "id") {
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function sumarDias(base, dias) {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

// Combina una fecha (AAAA-MM-DD) y una hora (HH:MM) en un objeto Date comparable.
// Si no hay hora, se asume el final del día (23:59) para no bloquear de más.
export function combinarFechaHora(fechaISO, horaHHMM) {
  return new Date(`${fechaISO}T${horaHHMM || "23:59"}:00`);
}

export function formatoFechaHora(fechaISO, horaHHMM) {
  const d = new Date(fechaISO + "T00:00:00");
  const fecha = d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  return horaHHMM ? `${fecha} · ${horaHHMM}` : fecha;
}

// El tiempo estimado se captura con un reloj normal (input tipo "time"),
// así que se guarda como duración "HH:MM" en vez de un número de horas.
export function horasDesdeDuracion(duracionHHMM) {
  if (!duracionHHMM) return 0;
  const [horas, minutos] = duracionHHMM.split(":").map(Number);
  return (horas || 0) + (minutos || 0) / 60;
}

export function formatoDuracion(duracionHHMM) {
  if (!duracionHHMM) return "";
  const [horas, minutos] = duracionHHMM.split(":").map(Number);
  const partes = [];
  if (horas) partes.push(`${horas}h`);
  if (minutos) partes.push(`${minutos}min`);
  return partes.length ? partes.join(" ") : "0min";
}

function generarDatosSemilla() {
  const hoy = hoyISO();
  const eventos = [
    {
      id: generarId("evt"),
      nombre: "Lanzamiento Studio Norte",
      fecha: sumarDias(hoy, 12),
      horaLimite: "19:00",
      lugar: "Galería Ámbar, Manizales",
      notas: "Cliente pidió confirmar todo 48h antes por posibles cambios de proveedor.",
      creadoEn: hoy,
      tareas: [
        {
          id: generarId("tsk"),
          titulo: "Confirmar disponibilidad del salón",
          categoria: "salon",
          prioridad: "alta",
          estado: "hecho",
          fechaLimite: sumarDias(hoy, -2),
          horaLimite: "12:00",
          tiempoEstimado: "01:00",
        },
        {
          id: generarId("tsk"),
          titulo: "Enviar invitaciones a lista VIP",
          categoria: "invitaciones",
          prioridad: "alta",
          estado: "pendiente",
          fechaLimite: hoy,
          horaLimite: "17:00",
          tiempoEstimado: "02:00",
        },
        {
          id: generarId("tsk"),
          titulo: "Cerrar menú con catering",
          categoria: "catering",
          prioridad: "media",
          estado: "pendiente",
          fechaLimite: sumarDias(hoy, -1),
          horaLimite: "16:00",
          tiempoEstimado: "01:30",
        },
        {
          id: generarId("tsk"),
          titulo: "Coordinar montaje de sonido",
          categoria: "proveedores",
          prioridad: "media",
          estado: "en_progreso",
          fechaLimite: sumarDias(hoy, 3),
          horaLimite: "10:00",
          tiempoEstimado: "03:00",
        },
      ],
    },
    {
      id: generarId("evt"),
      nombre: "Boda Camila & Esteban",
      fecha: sumarDias(hoy, 34),
      horaLimite: "16:00",
      lugar: "Finca El Roble, Villamaría",
      notas: "",
      creadoEn: hoy,
      tareas: [
        {
          id: generarId("tsk"),
          titulo: "Firmar contrato con florista",
          categoria: "proveedores",
          prioridad: "alta",
          estado: "pendiente",
          fechaLimite: sumarDias(hoy, 2),
          horaLimite: "15:00",
          tiempoEstimado: "01:00",
        },
        {
          id: generarId("tsk"),
          titulo: "Prueba de menú",
          categoria: "catering",
          prioridad: "media",
          estado: "pendiente",
          fechaLimite: sumarDias(hoy, 7),
          horaLimite: "13:00",
          tiempoEstimado: "02:00",
        },
        {
          id: generarId("tsk"),
          titulo: "Diseñar tarjetas de invitación",
          categoria: "invitaciones",
          prioridad: "baja",
          estado: "hecho",
          fechaLimite: sumarDias(hoy, -5),
          horaLimite: "18:00",
          tiempoEstimado: "02:00",
        },
      ],
    },
    {
      id: generarId("evt"),
      nombre: "Conferencia RetailTech",
      fecha: sumarDias(hoy, 3),
      horaLimite: "18:00",
      lugar: "Centro de Convenciones, Manizales",
      notas: "Proveedor de streaming avisó retraso de equipo — reprogramar prueba técnica.",
      creadoEn: hoy,
      tareas: [
        {
          id: generarId("tsk"),
          titulo: "Prueba técnica de streaming",
          categoria: "proveedores",
          prioridad: "alta",
          estado: "pendiente",
          fechaLimite: hoy,
          horaLimite: "09:00",
          tiempoEstimado: "02:00",
        },
        {
          id: generarId("tsk"),
          titulo: "Confirmar asistencia de ponentes",
          categoria: "invitaciones",
          prioridad: "alta",
          estado: "en_progreso",
          fechaLimite: sumarDias(hoy, 1),
          horaLimite: "12:00",
          tiempoEstimado: "01:00",
        },
        {
          id: generarId("tsk"),
          titulo: "Reservar coffee break",
          categoria: "catering",
          prioridad: "media",
          estado: "pendiente",
          fechaLimite: sumarDias(hoy, -3),
          horaLimite: "11:00",
          tiempoEstimado: "01:00",
        },
      ],
    },
  ];
  return eventos;
}

function leerTodo() {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN);
    if (!crudo) {
      const datos = generarDatosSemilla();
      localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
      return datos;
    }
    return JSON.parse(crudo);
  } catch (e) {
    console.error("No se pudo leer el almacenamiento local:", e);
    return [];
  }
}

function escribirTodo(eventos) {
  localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(eventos));
}

export const almacenEventos = {
  CATEGORIAS,
  PRIORIDADES,

  listar() {
    return leerTodo().sort((a, b) => a.fecha.localeCompare(b.fecha));
  },

  obtener(id) {
    return leerTodo().find((e) => e.id === id) || null;
  },

  crear({ nombre, fecha, horaLimite, lugar, notas }) {
    const eventos = leerTodo();
    const nuevo = {
      id: generarId("evt"),
      nombre,
      fecha,
      horaLimite: horaLimite || "18:00",
      lugar,
      notas: notas || "",
      creadoEn: hoyISO(),
      tareas: [],
    };
    eventos.push(nuevo);
    escribirTodo(eventos);
    return nuevo;
  },

  eliminar(eventoId) {
    const eventos = leerTodo().filter((e) => e.id !== eventoId);
    escribirTodo(eventos);
  },

  agregarTarea(eventoId, tarea) {
    const eventos = leerTodo();
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return null;
    const nueva = {
      id: generarId("tsk"),
      titulo: tarea.titulo,
      categoria: tarea.categoria || "otro",
      prioridad: tarea.prioridad || "media",
      estado: "pendiente",
      fechaLimite: tarea.fechaLimite || hoyISO(),
      horaLimite: tarea.horaLimite || "18:00",
      tiempoEstimado: tarea.tiempoEstimado || "01:00",
    };
    evento.tareas.push(nueva);
    escribirTodo(eventos);
    return nueva;
  },

  actualizarTarea(eventoId, tareaId, cambios) {
    const eventos = leerTodo();
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return;
    evento.tareas = evento.tareas.map((t) =>
      t.id === tareaId ? { ...t, ...cambios } : t
    );
    escribirTodo(eventos);
  },

  eliminarTarea(eventoId, tareaId) {
    const eventos = leerTodo();
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return;
    evento.tareas = evento.tareas.filter((t) => t.id !== tareaId);
    escribirTodo(eventos);
  },

  // Todas las tareas de todos los eventos, con referencia al evento padre.
  tareasGlobales() {
    const eventos = leerTodo();
    const tareas = [];
    eventos.forEach((evento) => {
      evento.tareas.forEach((t) => {
        tareas.push({ ...t, eventoId: evento.id, eventoNombre: evento.nombre });
      });
    });
    return tareas;
  },

  // Suma de horas estimadas de tareas pendientes que ya caen en esa fecha,
  // excluyendo opcionalmente una tarea (útil al reprogramar la misma tarea).
  horasOcupadasEnFecha(fechaISO, excluirTareaId = null) {
    return this.tareasGlobales()
      .filter(
        (t) =>
          t.fechaLimite === fechaISO &&
          t.estado !== "hecho" &&
          t.id !== excluirTareaId
      )
      .reduce((suma, t) => suma + horasDesdeDuracion(t.tiempoEstimado), 0);
  },
};

export function diasHasta(fechaISO) {
  const hoy = new Date(hoyISO());
  const objetivo = new Date(fechaISO);
  const diff = Math.round((objetivo - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}

// Una tarea "urgente" es una que vence hoy y todavía no se ha hecho:
// requiere gestión inmediata.
export function esUrgenteHoy(tarea) {
  return tarea.estado !== "hecho" && diasHasta(tarea.fechaLimite) === 0;
}

export { hoyISO, sumarDias };
