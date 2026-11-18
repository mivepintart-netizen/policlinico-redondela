/**
 * Datos ficticios para construir las páginas antes de conectar Supabase.
 * Cuando conectemos la base de datos, estos datos saldrán de las tablas
 * `especialidades`, `profesionales`, etc.
 */

export type IlustracionId =
  | "medicina-general"
  | "fisioterapia"
  | "traumatologia"
  | "psicologia"
  | "podologia"
  | "cardiologia"
  | "nutricion";

export type EspecialidadDemo = {
  id: IlustracionId;
  nombre: string;
  descripcionCorta: string;
  duracionMin: number;
  precio: number; // euros
  deposito: number; // euros (anticipo online)
};

export const especialidades: EspecialidadDemo[] = [
  {
    id: "medicina-general",
    nombre: "Medicina general",
    descripcionCorta:
      "Consultas, revisiones, certificados y seguimiento de tu salud del día a día.",
    duracionMin: 20,
    precio: 35,
    deposito: 8,
  },
  {
    id: "fisioterapia",
    nombre: "Fisioterapia",
    descripcionCorta:
      "Dolor de espalda, cervicales, lesiones deportivas y recuperación tras una operación.",
    duracionMin: 45,
    precio: 40,
    deposito: 10,
  },
  {
    id: "traumatologia",
    nombre: "Traumatología",
    descripcionCorta:
      "Diagnóstico y tratamiento de lesiones de huesos, articulaciones y ligamentos.",
    duracionMin: 30,
    precio: 60,
    deposito: 15,
  },
  {
    id: "psicologia",
    nombre: "Psicología",
    descripcionCorta:
      "Ansiedad, estrés, duelo o autoestima. Terapia para adultos y adolescentes.",
    duracionMin: 50,
    precio: 55,
    deposito: 15,
  },
  {
    id: "podologia",
    nombre: "Podología",
    descripcionCorta:
      "Quiropodia, uñas encarnadas, plantillas a medida y estudio de la pisada.",
    duracionMin: 30,
    precio: 35,
    deposito: 8,
  },
  {
    id: "cardiologia",
    nombre: "Cardiología",
    descripcionCorta:
      "Electrocardiograma, control de la tensión y revisiones cardiovasculares.",
    duracionMin: 30,
    precio: 70,
    deposito: 20,
  },
  {
    id: "nutricion",
    nombre: "Nutrición",
    descripcionCorta:
      "Planes de alimentación personalizados para perder peso, deporte o patologías.",
    duracionMin: 45,
    precio: 50,
    deposito: 15,
  },
];

export const depositoMinimo = Math.min(...especialidades.map((e) => e.deposito));

/** Ticket de ejemplo que se muestra en el hero. */
export const ticketHero = {
  especialidadId: "fisioterapia" as const,
  profesional: "Laura Méndez",
  rol: "Fisioterapeuta",
  huecos: [
    { dia: "Hoy", hora: "17:30" },
    { dia: "Hoy", hora: "19:15" },
    { dia: "Mañana", hora: "10:00" },
    { dia: "Mañana", hora: "12:45" },
  ],
};

export const pasos = [
  {
    titulo: "Elige especialidad",
    texto: "Escoge el servicio que necesitas y, si quieres, el profesional.",
  },
  {
    titulo: "Escoge día y hora",
    texto: "Ves los huecos libres en tiempo real. Sin llamadas ni esperas.",
  },
  {
    titulo: "Paga el anticipo",
    texto: "Confirmas tu cita con una pequeña parte del precio. El resto, en la clínica.",
  },
  {
    titulo: "Recibe la confirmación",
    texto: "Te llega un email con todos los detalles y un enlace para gestionar tu cita.",
  },
];

export const ejemploAnticipo = {
  total: 50,
  ahora: 15,
  enCentro: 35,
};

export const faqAnticipo = [
  {
    pregunta: "¿Por qué pedís un anticipo?",
    respuesta:
      "Para reducir las citas a las que nadie acude. Así los huecos libres llegan a quien de verdad los necesita y podemos mantener precios ajustados.",
  },
  {
    pregunta: "¿Y si no puedo ir?",
    respuesta:
      "Si cancelas hasta 24 horas antes, te devolvemos el anticipo completo. Puedes cancelar o cambiar la cita desde el enlace del email de confirmación.",
  },
  {
    pregunta: "¿Qué pasa si cancelo con menos de 24 horas?",
    respuesta:
      "En ese caso el anticipo no se devuelve, salvo causa justificada (enfermedad, urgencia familiar…). Llámanos y lo vemos.",
  },
  {
    pregunta: "¿Cómo pago el resto?",
    respuesta:
      "En la clínica, el día de la cita, con tarjeta, Bizum o efectivo. El anticipo ya aparece descontado.",
  },
];

export const contacto = {
  direccion: "Rúa do Viaduto, 14",
  codigoPostal: "36800",
  localidad: "Redondela",
  provincia: "Pontevedra",
  // Datos ficticios: sustituir por los reales
  telefono: "986 40 12 34",
  telefonoHref: "+34986401234",
  whatsappHref: "https://wa.me/34600000000",
  email: "citas@policlinicoredondela.es",
  recepcionista: "María",
  horarios: [
    { dias: "Lunes a viernes", horas: "9:00 – 14:00 · 16:00 – 20:30" },
    { dias: "Sábados", horas: "9:00 – 14:00" },
    { dias: "Domingos y festivos", horas: "Cerrado" },
  ],
};

export const navegacion = [
  { href: "/#especialidades", etiqueta: "Especialidades" },
  { href: "/#como-funciona", etiqueta: "Cómo funciona" },
  { href: "/#pago-anticipado", etiqueta: "Pago anticipado" },
  { href: "/#contacto", etiqueta: "Contacto" },
];

export function formatoEuros(valor: number) {
  return `${valor} €`;
}

/* ------------------------------------------------------------------ */
/* Reserva: profesionales, horarios y festivos (ficticios)             */
/* ------------------------------------------------------------------ */

export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
/** m = mañana, t = tarde, mt = mañana y tarde */
export type Turno = "m" | "t" | "mt";

export type ProfesionalDemo = {
  id: string;
  nombre: string;
  rol: string;
  especialidadId: IlustracionId;
  horario: Partial<Record<DiaSemana, Turno>>;
};

export const profesionales: ProfesionalDemo[] = [
  { id: "carmen-otero", nombre: "Dra. Carmen Otero", rol: "Médica de familia", especialidadId: "medicina-general", horario: { lun: "mt", mar: "mt", mie: "mt", jue: "mt", vie: "m" } },
  { id: "xose-lago", nombre: "Dr. Xosé Lago", rol: "Médico de familia", especialidadId: "medicina-general", horario: { lun: "t", mar: "m", mie: "t", jue: "m", vie: "mt", sab: "m" } },
  { id: "laura-mendez", nombre: "Laura Méndez", rol: "Fisioterapeuta", especialidadId: "fisioterapia", horario: { lun: "mt", mar: "mt", mie: "m", jue: "mt", vie: "mt", sab: "m" } },
  { id: "iago-pereira", nombre: "Iago Pereira", rol: "Fisioterapeuta deportivo", especialidadId: "fisioterapia", horario: { lun: "t", mar: "t", mie: "mt", jue: "t", vie: "m" } },
  { id: "andres-covelo", nombre: "Dr. Andrés Covelo", rol: "Traumatólogo", especialidadId: "traumatologia", horario: { mar: "t", jue: "mt" } },
  { id: "noa-rial", nombre: "Noa Rial", rol: "Psicóloga sanitaria", especialidadId: "psicologia", horario: { lun: "mt", mie: "mt", vie: "m" } },
  { id: "sara-iglesias", nombre: "Sara Iglesias", rol: "Podóloga", especialidadId: "podologia", horario: { mar: "m", jue: "mt", sab: "m" } },
  { id: "elena-bouzas", nombre: "Dra. Elena Bouzas", rol: "Cardióloga", especialidadId: "cardiologia", horario: { lun: "m", mie: "m" } },
  { id: "marta-souto", nombre: "Marta Souto", rol: "Dietista-nutricionista", especialidadId: "nutricion", horario: { mar: "mt", jue: "t", vie: "m" } },
];

/** Franjas de cada turno (horario de la clínica). */
export const turnos = {
  m: { inicio: "09:00", fin: "14:00" },
  t: { inicio: "16:00", fin: "20:30" },
} as const;

export const festivos: { fecha: string; descripcion: string }[] = [
  { fecha: "2026-12-08", descripcion: "Inmaculada Concepción" },
  { fecha: "2026-12-25", descripcion: "Navidad" },
  { fecha: "2027-01-01", descripcion: "Año Nuevo" },
  { fecha: "2027-01-06", descripcion: "Reyes" },
];

/** Hasta cuántos días vista se puede reservar. */
export const diasReservables = 60;
