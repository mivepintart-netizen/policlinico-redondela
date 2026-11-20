/**
 * Tipos y utilidades del panel de gestión.
 */
import type { EstadoReserva, FilaReserva, MetodoPago, RolPanel } from "./database.types";
import type { Especialidad, Profesional } from "./catalogo";

export type EstadoPanel = EstadoReserva;
export type MetodoPagoPanel = MetodoPago | null;
export type { RolPanel };

export type ReservaPanel = {
  id: string;
  token: string;
  especialidadId: string;
  profesionalId: string;
  fecha: string;
  hora: string;
  precio: number;
  deposito: number;
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
  expiraEn: string | null;
  recordatorioAt: string | null;
  /** "Visa ···· 4242" si el paciente dejó la tarjeta en garantía */
  tarjeta: string | null;
  /** Cancelada por el paciente con menos de 24 h */
  canceladaTarde: boolean;
  /** Cobro por ausencia (euros); null si no se ha cobrado */
  cobrado: number | null;
  cobroDevuelto: boolean;
  cobroAt: string | null;
  /** Último intento de cobro fallido */
  cobroError: string | null;
};

export type SesionPanel = { id: string; email: string; nombre: string; rol: RolPanel };

export const ESTADOS: Record<EstadoPanel, { texto: string; clase: string; punto: string }> = {
  pendiente_pago: { texto: "Esperando tarjeta", clase: "bg-white text-ambar-700 ring-ambar-500/40", punto: "bg-ambar-500 animate-pulse" },
  confirmada: { texto: "Confirmada", clase: "bg-brand-50 text-brand-700 ring-brand-100", punto: "bg-brand-500" },
  sin_deposito: { texto: "Sin tarjeta", clase: "bg-ambar-50 text-ambar-700 ring-ambar-100", punto: "bg-ambar-500" },
  completada: { texto: "Atendida", clase: "bg-slate-100 text-slate-600 ring-slate-200", punto: "bg-slate-400" },
  no_presentado: { texto: "No se presentó", clase: "bg-red-50 text-red-700 ring-red-200", punto: "bg-red-700" },
  cancelada: { texto: "Cancelada", clase: "bg-red-50 text-red-700 ring-red-100", punto: "bg-red-500" },
};

export const METODOS: Record<MetodoPago, string> = {
  tarjeta: "Tarjeta (online)",
  bizum: "Bizum (online)",
  recepcion: "En recepción",
};

export const esActiva = (r: ReservaPanel) => r.estado !== "cancelada";

/** Lo cobrado por ausencia que no se ha devuelto (euros). */
export const cobroAusencia = (r: ReservaPanel) => (r.cobrado !== null && !r.cobroDevuelto ? r.cobrado : 0);

/** ¿Se puede cobrar el 50 % a esta reserva? */
export const sePuedeCobrar = (r: ReservaPanel) =>
  !!r.tarjeta && cobroAusencia(r) === 0 && (r.estado === "no_presentado" || (r.estado === "cancelada" && r.canceladaTarde));

/* ----- Conversión desde/hacia la base de datos ----- */

export const desdeFila = (f: FilaReserva): ReservaPanel => ({
  id: f.id,
  token: f.token_acceso,
  especialidadId: f.especialidad_id,
  profesionalId: f.profesional_id,
  fecha: f.fecha,
  hora: f.hora,
  precio: f.precio,
  deposito: f.deposito,
  estado: f.estado,
  reembolso: f.reembolso,
  metodoPago: f.metodo_pago,
  paciente: {
    nombre: f.paciente_nombre,
    apellidos: f.paciente_apellidos,
    dni: f.paciente_dni,
    telefono: f.paciente_telefono,
    email: f.paciente_email,
    motivo: f.paciente_motivo,
  },
  creadaEl: f.created_at,
  origen: f.origen,
  expiraEn: f.expira_en,
  recordatorioAt: f.recordatorio_at ?? null,
  tarjeta: f.garantia_tarjeta ?? null,
  canceladaTarde: !!f.cancelada_tarde,
  cobrado: f.cobro_ref && f.cobro_importe != null ? f.cobro_importe / 100 : null,
  cobroDevuelto: !!f.cobro_devuelto,
  cobroAt: f.cobro_at ?? null,
  cobroError: f.cobro_error ?? null,
});

/** Cambios de la aplicación → columnas de la tabla. */
export function aColumnas(c: Partial<ReservaPanel>): Partial<FilaReserva> {
  const f: Partial<FilaReserva> = {};
  if (c.estado !== undefined) f.estado = c.estado;
  if (c.reembolso !== undefined) f.reembolso = c.reembolso;
  if (c.metodoPago !== undefined) f.metodo_pago = c.metodoPago;
  if (c.fecha !== undefined) f.fecha = c.fecha;
  if (c.hora !== undefined) f.hora = c.hora;
  if (c.profesionalId !== undefined) f.profesional_id = c.profesionalId;
  return f;
}

/* ----- Exportación ----- */

export function aCSV(reservas: ReservaPanel[], esp: Especialidad[], prof: Profesional[]) {
  const cab = ["Código", "Fecha", "Hora", "Especialidad", "Profesional", "Estado", "Paciente", "DNI", "Teléfono", "Email", "Precio", "Tarjeta en garantía", "Cobrado por ausencia", "Cancelación tardía", "Origen"];
  const celda = (v: string | number) => {
    const t = String(v);
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const filas = reservas.map((r) =>
    [
      r.id, r.fecha, r.hora,
      esp.find((x) => x.id === r.especialidadId)?.nombre ?? r.especialidadId,
      prof.find((x) => x.id === r.profesionalId)?.nombre ?? r.profesionalId,
      ESTADOS[r.estado].texto, `${r.paciente.nombre} ${r.paciente.apellidos}`, r.paciente.dni,
      r.paciente.telefono, r.paciente.email, r.precio, r.tarjeta ?? "", cobroAusencia(r) ? String(cobroAusencia(r)).replace(".", ",") : "",
      r.canceladaTarde ? "Sí" : "", r.origen === "web" ? "Web" : "Panel",
    ].map(celda).join(";")
  );
  // BOM para que Excel abra bien las tildes; ";" como separador (Excel en español)
  return "﻿" + [cab.join(";"), ...filas].join("\r\n");
}
