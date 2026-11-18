/**
 * Cálculo de huecos libres a partir de los horarios (datos ficticios).
 * Cuando conectemos Supabase, los huecos ocupados vendrán de la
 * función `horas_ocupadas` en lugar de generarse aquí.
 */
import {
  type DiaSemana,
  type ProfesionalDemo,
  diasReservables,
  festivos,
  profesionales,
  turnos,
} from "./datos";

const DIAS: DiaSemana[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

export type Hueco = {
  hora: string; // 'HH:MM'
  profesionalId: string;
};

/* ----- Fechas (siempre en hora local, formato 'YYYY-MM-DD') ----- */

export function aISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
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

function aMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function aHora(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function esFestivo(iso: string) {
  return festivos.find((f) => f.fecha === iso);
}

/* ----- Ocupación ficticia, estable para el mismo día/hora ----- */

export function hash(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

export function estaOcupado(profesionalId: string, iso: string, hora: string) {
  return hash(`${profesionalId}|${iso}|${hora}`) < 38;
}

/* ----- Huecos ----- */

function huecosProfesional(
  prof: ProfesionalDemo,
  iso: string,
  duracionMin: number,
  ahora: Date
): Hueco[] {
  const fecha = desdeISO(iso);
  const turno = prof.horario[DIAS[fecha.getDay()]];
  if (!turno || esFestivo(iso)) return [];

  // No se puede reservar con menos de 1 hora de antelación
  const esHoy = iso === aISO(ahora);
  const minimo = esHoy ? ahora.getHours() * 60 + ahora.getMinutes() + 60 : 0;

  const franjas = turno === "mt" ? [turnos.m, turnos.t] : [turnos[turno]];
  const resultado: Hueco[] = [];
  for (const f of franjas) {
    for (let t = aMinutos(f.inicio); t + duracionMin <= aMinutos(f.fin); t += duracionMin) {
      const hora = aHora(t);
      if (t < minimo || estaOcupado(prof.id, iso, hora)) continue;
      resultado.push({ hora, profesionalId: prof.id });
    }
  }
  return resultado;
}

/**
 * Huecos libres de un día. Si `profesionalId` es null ("cualquiera"),
 * junta los de todos los profesionales de la especialidad y deja uno por hora.
 */
export function huecosDelDia(
  especialidadId: string,
  profesionalId: string | null,
  iso: string,
  duracionMin: number,
  ahora: Date
): Hueco[] {
  const lista = profesionales.filter(
    (p) => p.especialidadId === especialidadId && (!profesionalId || p.id === profesionalId)
  );
  const porHora = new Map<string, Hueco>();
  for (const p of lista) {
    for (const h of huecosProfesional(p, iso, duracionMin, ahora)) {
      if (!porHora.has(h.hora)) porHora.set(h.hora, h);
    }
  }
  return Array.from(porHora.values()).sort((a, b) => a.hora.localeCompare(b.hora));
}

export function limiteReserva(ahora: Date) {
  return sumarDias(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), diasReservables);
}

/* ----- Formatos en español ----- */

export function fechaLarga(iso: string) {
  const s = desdeISO(iso).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function nombreMes(d: Date) {
  const s = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
