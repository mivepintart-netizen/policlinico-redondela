/**
 * Almacén de reservas de prueba (solo en el navegador).
 *
 * - Incluye unas reservas de ejemplo con fechas relativas a hoy, para que
 *   siempre haya una próxima, una en menos de 24 h, una cancelada y una pasada.
 * - Las reservas hechas en /reservar y los cambios (cancelar, cambiar hora)
 *   se guardan en localStorage para poder probar el flujo completo.
 *
 * Cuando conectemos Supabase, esto se sustituye por:
 *   - obtener_reserva_por_token(token)
 *   - una búsqueda por código + email en el servidor
 *   - actualizaciones de la reserva desde una ruta del servidor
 */
import { aISO, esFestivo, sumarDias } from "./agenda";
import { profesionales, turnos } from "./datos";

export type EstadoCita = "confirmada" | "cancelada" | "completada";

export type ReservaDemo = {
  id: string; // 'RDN-12345'
  token: string; // enlace personal
  especialidadId: string;
  profesionalId: string;
  fecha: string; // 'YYYY-MM-DD'
  hora: string; // 'HH:MM'
  estado: EstadoCita;
  reembolso: boolean;
  metodoPago: "tarjeta" | "bizum";
  paciente: {
    nombre: string;
    apellidos: string;
    email: string;
    telefono: string;
  };
  creadaEl: string; // ISO
};

const CLAVE_NUEVAS = "rdn-reservas";
const CLAVE_CAMBIOS = "rdn-cambios";

/* ----- Ejemplos (fechas relativas a "ahora") ----- */

const DIAS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"] as const;

/**
 * Primer día (desde `desde`, avanzando `paso` días) en que el profesional
 * trabaja en el turno que contiene `hora`, para que los ejemplos sean realistas.
 */
function diaQueAtiende(profesionalId: string, desde: Date, hora: string, paso: 1 | -1) {
  const prof = profesionales.find((p) => p.id === profesionalId)!;
  const turnoHora = hora < turnos.m.fin ? "m" : "t";
  let d = desde;
  for (let i = 0; i < 14; i++, d = sumarDias(d, paso)) {
    const turno = prof.horario[DIAS[d.getDay()]];
    if (turno && turno.includes(turnoHora) && !esFestivo(aISO(d))) return aISO(d);
  }
  return aISO(desde);
}

function ejemplos(ahora: Date): ReservaDemo[] {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const ana = { nombre: "Ana", apellidos: "Pérez Souto", email: "ana@ejemplo.es", telefono: "600123456" };

  // Cita dentro de unas 5 horas (para ver el caso "menos de 24 h")
  const pronto = new Date(ahora.getTime() + 5 * 60 * 60 * 1000);
  pronto.setMinutes(pronto.getMinutes() < 30 ? 0 : 30, 0, 0);
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const creada = sumarDias(hoy, -2).toISOString();

  return [
    {
      id: "RDN-40703",
      token: "demo-7f3a9c2e-proxima",
      especialidadId: "fisioterapia",
      profesionalId: "laura-mendez",
      fecha: diaQueAtiende("laura-mendez", sumarDias(hoy, 4), "10:30", 1),
      hora: "10:30",
      estado: "confirmada",
      reembolso: false,
      metodoPago: "tarjeta",
      paciente: ana,
      creadaEl: creada,
    },
    {
      id: "RDN-58210",
      token: "demo-b81d44f0-pronto",
      especialidadId: "cardiologia",
      profesionalId: "elena-bouzas",
      fecha: aISO(pronto),
      hora: hhmm(pronto),
      estado: "confirmada",
      reembolso: false,
      metodoPago: "bizum",
      paciente: { nombre: "Xoán", apellidos: "Lorenzo Gil", email: "xoan@ejemplo.es", telefono: "611222333" },
      creadaEl: creada,
    },
    {
      id: "RDN-77402",
      token: "demo-2c9e10aa-cancelada",
      especialidadId: "psicologia",
      profesionalId: "noa-rial",
      fecha: diaQueAtiende("noa-rial", sumarDias(hoy, 6), "17:00", 1),
      hora: "17:00",
      estado: "cancelada",
      reembolso: true,
      metodoPago: "tarjeta",
      paciente: ana,
      creadaEl: creada,
    },
    {
      id: "RDN-31977",
      token: "demo-e5f2b7d1-pasada",
      especialidadId: "nutricion",
      profesionalId: "marta-souto",
      fecha: diaQueAtiende("marta-souto", sumarDias(hoy, -10), "17:00", -1),
      hora: "17:00",
      estado: "completada",
      reembolso: false,
      metodoPago: "tarjeta",
      paciente: ana,
      creadaEl: sumarDias(hoy, -14).toISOString(),
    },
  ];
}

/** Credenciales de ejemplo que se muestran en la página de acceso. */
export const accesosDemo = [
  { codigo: "RDN-40703", email: "ana@ejemplo.es", descripcion: "Próxima cita" },
  { codigo: "RDN-58210", email: "xoan@ejemplo.es", descripcion: "En menos de 24 h" },
  { codigo: "RDN-77402", email: "ana@ejemplo.es", descripcion: "Cancelada" },
  { codigo: "RDN-31977", email: "ana@ejemplo.es", descripcion: "Ya realizada" },
];

/* ----- localStorage (puede no estar disponible) ----- */

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = window.localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: los cambios duran solo esta visita */
  }
}

/* ----- API ----- */

function todas(ahora: Date): ReservaDemo[] {
  const cambios = leer<Record<string, Partial<ReservaDemo>>>(CLAVE_CAMBIOS, {});
  const lista = [...ejemplos(ahora), ...leer<ReservaDemo[]>(CLAVE_NUEVAS, [])];
  return lista.map((r) => ({ ...r, ...cambios[r.token] }));
}

export function porToken(token: string, ahora = new Date()) {
  return todas(ahora).find((r) => r.token === token) ?? null;
}

export function buscar(codigo: string, email: string, ahora = new Date()) {
  // Acepta "RDN-12345", "rdn12345" o solo "12345"
  const c = `RDN-${codigo.trim().toUpperCase().replace(/^RDN-?/, "")}`;
  const e = email.trim().toLowerCase();
  return todas(ahora).find((r) => r.id === c && r.paciente.email.toLowerCase() === e) ?? null;
}

export function guardarNueva(r: ReservaDemo) {
  const nuevas = leer<ReservaDemo[]>(CLAVE_NUEVAS, []);
  escribir(CLAVE_NUEVAS, [...nuevas, r]);
}

export function actualizar(token: string, cambios: Partial<ReservaDemo>) {
  const todos = leer<Record<string, Partial<ReservaDemo>>>(CLAVE_CAMBIOS, {});
  escribir(CLAVE_CAMBIOS, { ...todos, [token]: { ...todos[token], ...cambios } });
}

/** Momento exacto de la cita. */
export function momentoCita(r: Pick<ReservaDemo, "fecha" | "hora">) {
  const [a, m, d] = r.fecha.split("-").map(Number);
  const [h, min] = r.hora.split(":").map(Number);
  return new Date(a, m - 1, d, h, min);
}

/** Estado efectivo: una confirmada cuya hora ya pasó se muestra como realizada. */
export function estadoEfectivo(r: ReservaDemo, ahora = new Date()): EstadoCita {
  if (r.estado === "confirmada" && momentoCita(r) < ahora) return "completada";
  return r.estado;
}

/** ¿Se puede cancelar con reembolso o cambiar? (más de 24 h de antelación) */
export function dentroDePlazo(r: ReservaDemo, ahora = new Date()) {
  return momentoCita(r).getTime() - ahora.getTime() > 24 * 60 * 60 * 1000;
}
