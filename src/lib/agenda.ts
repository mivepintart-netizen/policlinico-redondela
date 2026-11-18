/**
 * Fechas y cálculo de huecos libres.
 * Los huecos posibles salen del horario de cada profesional; los ocupados,
 * de la función horas_ocupadas() de la base de datos.
 */
import { diasReservables, turnos } from "./datos";
import type { DiaSemana, Festivo, Profesional } from "./catalogo";

const DIAS: DiaSemana[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

export type Hueco = { hora: string; profesionalId: string };

/** Huecos ocupados: claves "profesionalId|YYYY-MM-DD|HH:MM" */
export type Ocupados = Set<string>;
export const claveHueco = (profesionalId: string, fecha: string, hora: string) => `${profesionalId}|${fecha}|${hora}`;

/* ----- Fechas (hora local, formato 'YYYY-MM-DD') ----- */

export function aISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function desdeISO(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export const aMinutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
export const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function momento(fecha: string, hora: string) {
  const d = desdeISO(fecha);
  d.setHours(Number(hora.slice(0, 2)), Number(hora.slice(3, 5)), 0, 0);
  return d;
}

export function limiteReserva(ahora: Date) {
  return sumarDias(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), diasReservables);
}

export const buscarFestivo = (festivos: Festivo[], iso: string) => festivos.find((f) => f.fecha === iso);

/* ----- Huecos ----- */

/** Todas las horas de inicio posibles de un profesional en un día (sin mirar ocupación). */
export function horasDelProfesional(prof: Profesional, iso: string, duracionMin: number) {
  const turno = prof.horario[DIAS[desdeISO(iso).getDay()]];
  if (!turno) return [];
  const franjas = turno === "mt" ? [turnos.m, turnos.t] : [turnos[turno]];
  const horas: string[] = [];
  for (const f of franjas) {
    for (let t = aMinutos(f.inicio); t + duracionMin <= aMinutos(f.fin); t += duracionMin) horas.push(aHora(t));
  }
  return horas;
}

/**
 * Huecos libres de un día para una especialidad. Con profesionalId = null
 * ("el primero disponible") junta los de todos y deja uno por hora.
 */
export function huecosDelDia(opts: {
  profesionales: Profesional[];
  festivos: Festivo[];
  ocupados: Ocupados;
  especialidadId: string;
  profesionalId: string | null;
  duracionMin: number;
  iso: string;
  ahora: Date;
}): Hueco[] {
  const { iso, ahora } = opts;
  if (buscarFestivo(opts.festivos, iso)) return [];
  // Mínimo 1 hora de antelación (igual que en la base de datos)
  const minimo = new Date(ahora.getTime() + 60 * 60 * 1000);

  const porHora = new Map<string, Hueco>();
  for (const p of opts.profesionales) {
    if (!p.activo || p.especialidadId !== opts.especialidadId) continue;
    if (opts.profesionalId && p.id !== opts.profesionalId) continue;
    for (const hora of horasDelProfesional(p, iso, opts.duracionMin)) {
      if (momento(iso, hora) < minimo) continue;
      if (opts.ocupados.has(claveHueco(p.id, iso, hora))) continue;
      if (!porHora.has(hora)) porHora.set(hora, { hora, profesionalId: p.id });
    }
  }
  return Array.from(porHora.values()).sort((a, b) => a.hora.localeCompare(b.hora));
}

/* ----- Formatos en español ----- */

export function fechaLarga(iso: string) {
  const s = desdeISO(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function nombreMes(d: Date) {
  const s = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
