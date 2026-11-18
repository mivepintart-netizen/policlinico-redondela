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
};

export type SesionPanel = { id: string; email: string; nombre: string; rol: RolPanel };

export const ESTADOS: Record<EstadoPanel, { texto: string; clase: string; punto: string }> = {
  confirmada: { texto: "Confirmada", clase: "bg-brand-50 text-brand-700 ring-brand-100", punto: "bg-brand-500" },
  sin_deposito: { texto: "Sin anticipo", clase: "bg-ambar-50 text-ambar-700 ring-ambar-100", punto: "bg-ambar-500" },
  completada: { texto: "Completada", clase: "bg-slate-100 text-slate-600 ring-slate-200", punto: "bg-slate-400" },
  cancelada: { texto: "Cancelada", clase: "bg-red-50 text-red-700 ring-red-100", punto: "bg-red-500" },
};

export const METODOS: Record<MetodoPago, string> = {
  tarjeta: "Tarjeta (online)",
  bizum: "Bizum (online)",
  recepcion: "En recepción",
};

export const esActiva = (r: ReservaPanel) => r.estado !== "cancelada";

/** Anticipo realmente cobrado (0 si no se pagó). */
export const anticipoCobrado = (r: ReservaPanel) => (r.estado === "sin_deposito" || !r.metodoPago ? 0 : r.deposito);

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
  const cab = ["Código", "Fecha", "Hora", "Especialidad", "Profesional", "Estado", "Paciente", "DNI", "Teléfono", "Email", "Precio", "Anticipo cobrado", "Método de pago", "Reembolso", "Origen"];
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
      r.paciente.telefono, r.paciente.email, r.precio, anticipoCobrado(r),
      r.metodoPago ? METODOS[r.metodoPago] : "", r.reembolso ? "Sí" : "No", r.origen === "web" ? "Web" : "Panel",
    ].map(celda).join(";")
  );
  // BOM para que Excel abra bien las tildes; ";" como separador (Excel en español)
  return "﻿" + [cab.join(";"), ...filas].join("\r\n");
}
