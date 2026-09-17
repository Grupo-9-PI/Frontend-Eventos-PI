// Persistencia simple en localStorage. Sin backend por ahora:
// esta capa es la única que sabe cómo se guardan los datos,
// así que conectar una API real después solo implica reescribir este archivo.

const CLAVE_ALMACEN = "eventops.eventos.v1";

const CATEGORIAS = [
  { id: "salon", nombre: "Salón" },
  { id: "invitaciones", nombre: "Invitaciones" },
  { id: "catering", nombre: "Catering" },
  { id: "proveedores", nombre: "Proveedores" },
  { id: "otro", nombre: "Otro" },
];

const PRIORIDADES = ["alta", "media", "baja"];

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

function generarDatosSemilla() {
  const hoy = hoyISO();
  const eventos = [
    {
      id: generarId("evt"),
      nombre: "Lanzamiento Studio Norte",
      fecha: sumarDias(hoy, 12),
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
        },
        {
          id: generarId("tsk"),
          titulo: "Enviar invitaciones a lista VIP",
          categoria: "invitaciones",
          prioridad: "alta",
          estado: "pendiente",
          fechaLimite: hoy,
        },
        {
          id: generarId("tsk"),
          titulo: "Cerrar menú con catering",
          categoria: "catering",
          prioridad: "media",
          estado: "pendiente",
          fechaLimite: sumarDias(hoy, -1),
        },
        {
          id: generarId("tsk"),
          titulo: "Coordinar montaje de sonido",
          categoria: "proveedores",
          prioridad: "media",
          estado: "en_progreso",
          fechaLimite: sumarDias(hoy, 3),
        },
      ],
    },
    {
      id: generarId("evt"),
      nombre: "Boda Camila & Esteban",
      fecha: sumarDias(hoy, 34),
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
        },
        {
          id: generarId("tsk"),
          titulo: "Prueba de menú",
          categoria: "catering",
          prioridad: "media",
          estado: "pendiente",
          fechaLimite: sumarDias(hoy, 7),
        },
        {
          id: generarId("tsk"),
          titulo: "Diseñar tarjetas de invitación",
          categoria: "invitaciones",
          prioridad: "baja",
          estado: "hecho",
          fechaLimite: sumarDias(hoy, -5),
        },
      ],
    },
    {
      id: generarId("evt"),
      nombre: "Conferencia RetailTech",
      fecha: sumarDias(hoy, 3),
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
        },
        {
          id: generarId("tsk"),
          titulo: "Confirmar asistencia de ponentes",
          categoria: "invitaciones",
          prioridad: "alta",
          estado: "en_progreso",
          fechaLimite: sumarDias(hoy, 1),
        },
        {
          id: generarId("tsk"),
          titulo: "Reservar coffee break",
          categoria: "catering",
          prioridad: "media",
          estado: "pendiente",
          fechaLimite: sumarDias(hoy, -3),
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

  crear({ nombre, fecha, lugar, notas }) {
    const eventos = leerTodo();
    const nuevo = {
      id: generarId("evt"),
      nombre,
      fecha,
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
};

export function diasHasta(fechaISO) {
  const hoy = new Date(hoyISO());
  const objetivo = new Date(fechaISO);
  const diff = Math.round((objetivo - hoy) / (1000 * 60 * 60 * 24));
  return diff;
}

export { hoyISO, sumarDias };
