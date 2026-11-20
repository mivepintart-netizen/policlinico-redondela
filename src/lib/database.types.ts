/**
 * Tipos de la base de datos (supabase/migrations/20261117000000_esquema_inicial.sql).
 * Si cambias el esquema, actualízalos o regenéralos con `supabase gen types`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
/** m = mañana, t = tarde, mt = mañana y tarde */
export type Turno = "m" | "t" | "mt";
export type Horario = Partial<Record<DiaSemana, Turno>>;

export type EstadoReserva = "pendiente_pago" | "confirmada" | "sin_deposito" | "cancelada" | "completada" | "no_presentado";
export type MetodoPago = "tarjeta" | "bizum" | "recepcion";
export type RolPanel = "admin" | "secretaria";

type Tabla<Row, Requeridos extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Requeridos> & Partial<Omit<Row, Requeridos>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type FilaEspecialidad = {
  id: string;
  nombre: string;
  descripcion_corta: string;
  duracion_min: number;
  precio: number;
  deposito: number;
  activa: boolean;
  orden: number;
};

export type FilaProfesional = {
  id: string;
  nombre: string;
  rol: string;
  especialidad_id: string;
  horario: Horario;
  activo: boolean;
  orden: number;
};

export type FilaFestivo = { fecha: string; descripcion: string };

export type FilaUsuarioPanel = { id: string; nombre: string; rol: RolPanel; created_at: string };

export type FilaReserva = {
  id: string;
  especialidad_id: string;
  profesional_id: string;
  fecha: string;
  hora: string;
  precio: number;
  deposito: number;
  estado: EstadoReserva;
  metodo_pago: MetodoPago | null;
  reembolso: boolean;
  paciente_nombre: string;
  paciente_apellidos: string;
  paciente_dni: string;
  paciente_telefono: string;
  paciente_email: string;
  paciente_motivo: string;
  origen: "web" | "panel";
  token_acceso: string;
  created_at: string;
  expira_en: string | null;
  pago_ref: string | null;
  pago_sesion: string | null;
  email_confirmacion_at: string | null;
  recordatorio_at: string | null;
  garantia_cliente: string | null;
  garantia_metodo: string | null;
  garantia_tarjeta: string | null;
  cancelada_tarde: boolean;
  cobro_ref: string | null;
  cobro_importe: number | null;
  cobro_at: string | null;
  cobro_devuelto: boolean;
  cobro_error: string | null;
};

export type FilaAjustes = { id: boolean; pago_online: boolean };

/** Lo que devuelve obtener_reserva_por_token (sin DNI, teléfono ni motivo). */
export type CitaPaciente = Pick<
  FilaReserva,
  | "id" | "especialidad_id" | "profesional_id" | "fecha" | "hora" | "precio" | "deposito" | "estado"
  | "metodo_pago" | "reembolso" | "paciente_nombre" | "paciente_apellidos" | "paciente_email" | "token_acceso"
  | "expira_en" | "garantia_tarjeta" | "cancelada_tarde" | "cobro_importe"
>;

export type Database = {
  public: {
    Tables: {
      especialidades: Tabla<FilaEspecialidad, "id" | "nombre" | "duracion_min" | "precio">;
      profesionales: Tabla<FilaProfesional, "id" | "nombre" | "rol" | "especialidad_id">;
      festivos: Tabla<FilaFestivo, "fecha">;
      usuarios_panel: Tabla<FilaUsuarioPanel, "id" | "nombre" | "rol">;
      ajustes: Tabla<FilaAjustes, "id">;
      reservas: Tabla<
        FilaReserva,
        "especialidad_id" | "profesional_id" | "fecha" | "hora" | "precio" | "deposito" | "paciente_nombre" | "paciente_apellidos" | "paciente_telefono"
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      horas_ocupadas: {
        Args: { p_especialidad_id: string; p_desde: string; p_hasta: string };
        Returns: { profesional_id: string; fecha: string; hora: string }[];
      };
      crear_reserva: {
        Args: {
          p_especialidad_id: string;
          p_profesional_id: string;
          p_fecha: string;
          p_hora: string;
          p_nombre: string;
          p_apellidos: string;
          p_dni: string;
          p_telefono: string;
          p_email: string;
          p_motivo: string;
          p_metodo_pago: string;
        };
        Returns: { id: string; token_acceso: string; deposito: number }[];
      };
      obtener_reserva_por_token: { Args: { p_token: string }; Returns: CitaPaciente[] };
      buscar_reserva: { Args: { p_codigo: string; p_email: string }; Returns: string | null };
      cancelar_reserva_por_token: { Args: { p_token: string }; Returns: boolean };
      cambiar_reserva_por_token: { Args: { p_token: string; p_fecha: string; p_hora: string }; Returns: undefined };
      liberar_pagos_caducados: { Args: Record<PropertyKey, never>; Returns: undefined };
      registrar_sesion_pago: { Args: { p_reserva_id: string; p_sesion: string }; Returns: boolean };
      confirmar_garantia: {
        Args: { p_reserva_id: string; p_cliente: string; p_metodo: string; p_tarjeta: string };
        Returns: "confirmada" | "caducada";
      };
      datos_cobro: {
        Args: { p_reserva_id: string };
        Returns: (Pick<
          FilaReserva,
          | "estado" | "precio" | "fecha" | "hora" | "cancelada_tarde" | "garantia_cliente" | "garantia_metodo"
          | "cobro_ref" | "cobro_importe" | "cobro_devuelto" | "paciente_nombre" | "paciente_apellidos" | "paciente_email"
        >)[];
      };
      registrar_cobro: {
        Args: { p_reserva_id: string; p_ref: string | null; p_importe: number | null; p_error: string | null };
        Returns: undefined;
      };
      registrar_devolucion_cobro: { Args: { p_reserva_id: string }; Returns: undefined };
      es_usuario_panel: { Args: Record<PropertyKey, never>; Returns: boolean };
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
