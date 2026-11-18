/**
 * Datos del panel de gestión (versión de prueba).
 *
 * Las reservas se generan a partir de los mismos huecos que el paciente ve
 * como ocupados (`estaOcupado`), así que paciente y panel son coherentes.
 * Se les suman las reservas de ejemplo y las hechas en /reservar.
 *
 * Cuando conectemos Supabase, todo esto se sustituye por consultas a la tabla
 * `reservas` (el personal del panel puede leerlas todas gracias a RLS).
 */
import { aISO, desdeISO, estaOcupado, esFestivo, sumarDias } from "./agenda";
import {
  especialidades as especialidadesBase,
  profesionales as profesionalesBase,
  turnos,
  type DiaSemana,
  type EspecialidadDemo,
  type ProfesionalDemo,
} from "./datos";
import { todas as reservasWeb } from "./reservasDemo";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type EstadoPanel = "confirmada" | "sin_deposito" | "cancelada" | "completada";
export type MetodoPagoPanel = "tarjeta" | "bizum" | "recepcion" | null;

export type ReservaPanel = {
  id: string;
  token: string | null; // solo las reservas web tienen enlace del paciente
  especialidadId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  estado: EstadoPanel;
  reembolso: boolean;
  metodoPago: MetodoPagoPanel;
  paciente: {
    nombre: string;
    apellidos: string;
    dni: string;
    telefono: string;
    email: string;
    motivo: string;
  };
  creadaEl: string;
  origen: "web" | "panel";
};

export type ProfesionalPanel = ProfesionalDemo & { activo: boolean };
export type EspecialidadPanel = EspecialidadDemo & { activa: boolean };
export type FestivoPanel = { fecha: string; descripcion: string };

export type RolPanel = "admin" | "secretaria";
export type SesionPanel = { email: string; nombre: string; rol: RolPanel };

/** Cuentas de prueba (con Supabase serán usuarios de Authentication). */
export const cuentasDemo: (SesionPanel & { clave: string })[] = [
  { email: "admin@policlinicoredondela.es", clave: "demo1234", nombre: "Admin", rol: "admin" },
  { email: "maria@policlinicoredondela.es", clave: "demo1234", nombre: "María", rol: "secretaria" },
];

export const ESTADOS: Record<EstadoPanel, { texto: string; clase: string; punto: string }> = {
  confirmada: { texto: "Confirmada", clase: "bg-brand-50 text-brand-700 ring-brand-100", punto: "bg-brand-500" },
  sin_deposito: { texto: "Sin anticipo", clase: "bg-ambar-50 text-ambar-700 ring-ambar-100", punto: "bg-ambar-500" },
  completada: { texto: "Completada", clase: "bg-slate-100 text-slate-600 ring-slate-200", punto: "bg-slate-400" },
  cancelada: { texto: "Cancelada", clase: "bg-red-50 text-red-700 ring-red-100", punto: "bg-red-500" },
};

export const METODOS: Record<Exclude<MetodoPagoPanel, null>, string> = {
  tarjeta: "Tarjeta (online)",
  bizum: "Bizum (online)",
  recepcion: "En recepción",
};

/* ------------------------------------------------------------------ */
/* Valores iniciales editables                                         */
/* ------------------------------------------------------------------ */

export const profesionalesIniciales: ProfesionalPanel[] = profesionalesBase.map((p) => ({ ...p, activo: true }));
export const especialidadesIniciales: EspecialidadPanel[] = especialidadesBase.map((e) => ({ ...e, activa: true }));

/* ------------------------------------------------------------------ */
/* Generador de reservas ficticias                                     */
/* ------------------------------------------------------------------ */

const NOMBRES = ["Ana", "Xoán", "Lucía", "Brais", "Uxía", "Antón", "Carmen", "Manuel", "Iria", "Pablo", "Sabela", "Diego", "Noelia", "Martiño", "Rosa", "Javier", "Alba", "Roi", "Pilar", "Hugo", "Lara", "Iago", "Begoña", "Fernando"];
const APELLIDOS = ["Pérez", "Otero", "Fernández", "Rodríguez", "Lorenzo", "Alonso", "Vázquez", "Castro", "Iglesias", "Rial", "Souto", "Barreiro", "Costas", "Martínez", "Domínguez", "Pazos", "Varela", "Graña", "Comesaña", "Lago", "Cid", "Bouzas"];
const MOTIVOS = ["", "", "Dolor lumbar desde hace dos semanas", "Revisión anual", "Molestias en la rodilla al correr", "Seguimiento", "Me lo recomendó mi médico de cabecera", "", "Primera consulta", "Control de tensión"];
const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";
const DIAS: DiaSemana[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

function semilla(texto: string) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const quitarTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

function aMin(h: string) {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
}
function aHora(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Horas de inicio posibles de un profesional un día concreto. */
export function horasDelProfesional(prof: ProfesionalDemo, iso: string, duracionMin: number) {
  const turno = prof.horario[DIAS[desdeISO(iso).getDay()]];
  if (!turno) return [];
  const franjas = turno === "mt" ? [turnos.m, turnos.t] : [turnos[turno]];
  const horas: string[] = [];
  for (const f of franjas) {
    for (let t = aMin(f.inicio); t + duracionMin <= aMin(f.fin); t += duracionMin) horas.push(aHora(t));
  }
  return horas;
}

const cacheDia = new Map<string, ReservaPanel[]>();

function generadasDelDia(iso: string, ahora: Date): ReservaPanel[] {
  const clave = `${iso}|${aISO(ahora)}`;
  if (cacheDia.has(clave)) return cacheDia.get(clave)!;
  const lista: ReservaPanel[] = [];
  if (!esFestivo(iso)) {
    for (const prof of profesionalesBase) {
      const esp = especialidadesBase.find((e) => e.id === prof.especialidadId)!;
      for (const hora of horasDelProfesional(prof, iso, esp.duracionMin)) {
        if (!estaOcupado(prof.id, iso, hora)) continue;
        const s = semilla(`${prof.id}|${iso}|${hora}`);
        const nombre = NOMBRES[s % NOMBRES.length];
        const ap1 = APELLIDOS[(s >>> 5) % APELLIDOS.length];
        const ap2 = APELLIDOS[(s >>> 11) % APELLIDOS.length];
        const numDni = 10000000 + (s % 89999999);
        const momento = new Date(`${iso}T${hora}:00`);
        const r = (s >>> 3) % 100;

        let estado: EstadoPanel;
        if (momento < ahora) estado = r < 90 ? "completada" : "cancelada";
        else estado = r < 9 ? "sin_deposito" : r < 13 ? "cancelada" : "confirmada";
        const metodoPago: MetodoPagoPanel =
          estado === "sin_deposito" ? null : (s >>> 7) % 4 === 0 ? "bizum" : (s >>> 7) % 9 === 1 ? "recepcion" : "tarjeta";

        lista.push({
          id: `RDN-${String(s % 100000).padStart(5, "0")}`,
          token: null,
          especialidadId: esp.id,
          profesionalId: prof.id,
          fecha: iso,
          hora,
          estado,
          reembolso: estado === "cancelada" && r % 2 === 0,
          metodoPago,
          paciente: {
            nombre,
            apellidos: `${ap1} ${ap2}`,
            dni: `${numDni}${LETRAS_DNI[numDni % 23]}`,
            telefono: `6${String(s % 100000000).padStart(8, "0")}`,
            email: `${quitarTildes(nombre).toLowerCase()}.${quitarTildes(ap1).toLowerCase()}@ejemplo.es`,
            motivo: MOTIVOS[(s >>> 9) % MOTIVOS.length],
          },
          creadaEl: sumarDias(desdeISO(iso), -((s % 12) + 1)).toISOString(),
          origen: (s >>> 13) % 5 === 0 ? "panel" : "web",
        });
      }
    }
  }
  cacheDia.set(clave, lista);
  return lista;
}

function desdeWeb(ahora: Date): ReservaPanel[] {
  return reservasWeb(ahora).map((r) => ({
    id: r.id,
    token: r.token,
    especialidadId: r.especialidadId,
    profesionalId: r.profesionalId,
    fecha: r.fecha,
    hora: r.hora,
    estado: r.estado,
    reembolso: r.reembolso,
    metodoPago: r.metodoPago,
    paciente: { ...r.paciente, dni: "", motivo: "" },
    creadaEl: r.creadaEl,
    origen: "web",
  }));
}

/**
 * Todas las reservas entre dos fechas (incluidas), ya con los cambios
 * hechos desde el panel aplicados.
 */
export function reservasEnRango(
  desde: string,
  hasta: string,
  ahora: Date,
  cambios: Record<string, Partial<ReservaPanel>>,
  nuevas: ReservaPanel[]
): ReservaPanel[] {
  const extra = [...desdeWeb(ahora), ...nuevas];
  const ocupadas = new Set(extra.map((r) => `${r.profesionalId}|${r.fecha}|${r.hora}`));

  const generadas: ReservaPanel[] = [];
  for (let d = desdeISO(desde); aISO(d) <= hasta; d = sumarDias(d, 1)) {
    for (const r of generadasDelDia(aISO(d), ahora)) {
      // Si una reserva real ocupa el mismo hueco, no mostramos la ficticia
      if (!ocupadas.has(`${r.profesionalId}|${r.fecha}|${r.hora}`)) generadas.push(r);
    }
  }

  return [...generadas, ...extra]
    .map((r) => (cambios[r.id] ? { ...r, ...cambios[r.id] } : r))
    .filter((r) => r.fecha >= desde && r.fecha <= hasta)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export const esActiva = (r: ReservaPanel) => r.estado !== "cancelada";

export function nuevoCodigo(existentes: Set<string>) {
  for (;;) {
    const id = `RDN-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
    if (!existentes.has(id)) return id;
  }
}

export function aCSV(reservas: ReservaPanel[], esp: EspecialidadPanel[], prof: ProfesionalPanel[]) {
  const cab = ["Código", "Fecha", "Hora", "Especialidad", "Profesional", "Estado", "Paciente", "DNI", "Teléfono", "Email", "Precio", "Anticipo", "Método de pago", "Reembolso", "Origen"];
  const celda = (v: string | number) => {
    const t = String(v);
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const filas = reservas.map((r) => {
    const e = esp.find((x) => x.id === r.especialidadId);
    return [
      r.id, r.fecha, r.hora, e?.nombre ?? r.especialidadId,
      prof.find((x) => x.id === r.profesionalId)?.nombre ?? r.profesionalId,
      ESTADOS[r.estado].texto, `${r.paciente.nombre} ${r.paciente.apellidos}`, r.paciente.dni,
      r.paciente.telefono, r.paciente.email, e?.precio ?? "", r.estado === "sin_deposito" ? 0 : e?.deposito ?? "",
      r.metodoPago ? METODOS[r.metodoPago] : "", r.reembolso ? "Sí" : "No", r.origen === "web" ? "Web" : "Panel",
    ].map(celda).join(";");
  });
  // BOM para que Excel abra bien las tildes; ";" como separador (Excel en español)
  return "﻿" + [cab.join(";"), ...filas].join("\r\n");
}
