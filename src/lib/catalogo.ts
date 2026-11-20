/**
 * Especialidades, profesionales y festivos leídos de Supabase,
 * convertidos al formato que usa la aplicación.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DiaSemana, FilaEspecialidad, FilaProfesional, Horario, Turno } from "./database.types";

export type { DiaSemana, Horario, Turno };

export type Especialidad = {
  id: string;
  nombre: string;
  descripcionCorta: string;
  duracionMin: number;
  precio: number;
  deposito: number;
  activa: boolean;
  orden: number;
};

export type Profesional = {
  id: string;
  nombre: string;
  rol: string;
  especialidadId: string;
  horario: Horario;
  activo: boolean;
  orden: number;
};

export type Festivo = { fecha: string; descripcion: string };

export type Catalogo = {
  especialidades: Especialidad[];
  profesionales: Profesional[];
  festivos: Festivo[];
  /** true: el paciente deja la tarjeta en garantía (Stripe); false: modo simulado */
  pagoOnline: boolean;
};

export const aEspecialidad = (f: FilaEspecialidad): Especialidad => ({
  id: f.id,
  nombre: f.nombre,
  descripcionCorta: f.descripcion_corta,
  duracionMin: f.duracion_min,
  precio: f.precio,
  deposito: f.deposito,
  activa: f.activa,
  orden: f.orden,
});

export const aProfesional = (f: FilaProfesional): Profesional => ({
  id: f.id,
  nombre: f.nombre,
  rol: f.rol,
  especialidadId: f.especialidad_id,
  horario: f.horario ?? {},
  activo: f.activo,
  orden: f.orden,
});

export async function cargarCatalogo(sb: SupabaseClient<Database>): Promise<Catalogo> {
  const [e, p, f, a] = await Promise.all([
    sb.from("especialidades").select("*").order("orden").order("nombre"),
    sb.from("profesionales").select("*").order("orden").order("nombre"),
    sb.from("festivos").select("*").order("fecha"),
    sb.from("ajustes").select("pago_online").maybeSingle(),
  ]);
  const error = e.error ?? p.error ?? f.error;
  if (error) throw error;
  return {
    especialidades: (e.data ?? []).map(aEspecialidad),
    profesionales: (p.data ?? []).map(aProfesional),
    festivos: f.data ?? [],
    // Si la tabla de ajustes aún no existe (falta el SQL de pagos): simulado
    pagoOnline: !!a.data?.pago_online,
  };
}
