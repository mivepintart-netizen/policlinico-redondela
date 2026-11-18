/**
 * Tipos de la base de datos de Supabase.
 * Escritos a mano siguiendo el formato de `supabase gen types typescript`.
 * Si cambias el esquema, actualízalos (o regenéralos con la CLI de Supabase).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Días de la semana usados en el horario de un profesional. */
export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

/** Turno: m = mañana, t = tarde, mt = mañana y tarde. */
export type Turno = "m" | "t" | "mt";

/** Horario semanal: solo aparecen los días en que trabaja. */
export type Horario = Partial<Record<DiaSemana, Turno>>;

export type EspecialidadId =
  | "fisioterapia"
  | "traumatologia"
  | "psicologia"
  | "podologia"
  | "cardiologia"
  | "nutricion";

export type EstadoReserva =
  | "confirmada"
  | "sin_deposito"
  | "cancelada"
  | "completada";

export type RolPanel = "admin" | "secretaria";

export type Database = {
  public: {
    Tables: {
      especialidades: {
        Row: {
          id: string;
          nombre: string;
          descripcion_corta: string;
          descripcion_larga: string;
          duracion_min: number;
          precio: number;
          deposito: number;
          activa: boolean;
        };
        Insert: {
          id: string;
          nombre: string;
          descripcion_corta?: string;
          descripcion_larga?: string;
          duracion_min: number;
          precio: number;
          deposito?: number;
          activa?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          descripcion_corta?: string;
          descripcion_larga?: string;
          duracion_min?: number;
          precio?: number;
          deposito?: number;
          activa?: boolean;
        };
        Relationships: [];
      };
      profesionales: {
        Row: {
          id: string;
          nombre: string;
          rol: string;
          especialidad_id: string;
          horario: Horario;
          activo: boolean;
        };
        Insert: {
          id: string;
          nombre: string;
          rol: string;
          especialidad_id: string;
          horario?: Horario;
          activo?: boolean;
        };
        Update: {
          id?: string;
          nombre?: string;
          rol?: string;
          especialidad_id?: string;
          horario?: Horario;
          activo?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "profesionales_especialidad_id_fkey";
            columns: ["especialidad_id"];
            isOneToOne: false;
            referencedRelation: "especialidades";
            referencedColumns: ["id"];
          },
        ];
      };
      festivos: {
        Row: {
          fecha: string; // 'YYYY-MM-DD'
          descripcion: string;
        };
        Insert: {
          fecha: string;
          descripcion?: string;
        };
        Update: {
          fecha?: string;
          descripcion?: string;
        };
        Relationships: [];
      };
      reservas: {
        Row: {
          id: string; // 'RDN-12345'
          especialidad_id: string;
          profesional_id: string;
          fecha: string; // 'YYYY-MM-DD'
          hora: string; // 'HH:MM'
          precio: number;
          deposito: number;
          estado: EstadoReserva;
          metodo_pago: string | null;
          reembolso: boolean;
          paciente_nombre: string;
          paciente_apellidos: string;
          paciente_dni: string;
          paciente_telefono: string;
          paciente_email: string;
          paciente_motivo: string | null;
          token_acceso: string; // UUID
          created_at: string;
        };
        Insert: {
          /** Lo genera la base de datos si se omite. */
          id?: string;
          especialidad_id: string;
          profesional_id: string;
          fecha: string;
          hora: string;
          /** Desde la web pública los fija la BD a partir de la especialidad. */
          precio?: number;
          deposito?: number;
          estado?: EstadoReserva;
          metodo_pago?: string | null;
          reembolso?: boolean;
          paciente_nombre: string;
          paciente_apellidos: string;
          paciente_dni: string;
          paciente_telefono: string;
          paciente_email: string;
          paciente_motivo?: string | null;
          /** Genéralo en el cliente (crypto.randomUUID()) para poder recuperar la cita. */
          token_acceso?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          especialidad_id?: string;
          profesional_id?: string;
          fecha?: string;
          hora?: string;
          precio?: number;
          deposito?: number;
          estado?: EstadoReserva;
          metodo_pago?: string | null;
          reembolso?: boolean;
          paciente_nombre?: string;
          paciente_apellidos?: string;
          paciente_dni?: string;
          paciente_telefono?: string;
          paciente_email?: string;
          paciente_motivo?: string | null;
          token_acceso?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservas_especialidad_id_fkey";
            columns: ["especialidad_id"];
            isOneToOne: false;
            referencedRelation: "especialidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservas_profesional_id_fkey";
            columns: ["profesional_id"];
            isOneToOne: false;
            referencedRelation: "profesionales";
            referencedColumns: ["id"];
          },
        ];
      };
      usuarios_panel: {
        Row: {
          id: string; // uuid de auth.users
          nombre: string;
          rol: RolPanel;
          created_at: string;
        };
        Insert: {
          id: string;
          nombre: string;
          rol: RolPanel;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          rol?: RolPanel;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      es_usuario_panel: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      es_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      generar_id_reserva: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      horas_ocupadas: {
        Args: { p_profesional_id: string; p_desde: string; p_hasta: string };
        Returns: { fecha: string; hora: string }[];
      };
      obtener_reserva_por_token: {
        Args: { p_token: string };
        Returns: Database["public"]["Tables"]["reservas"]["Row"][];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

/* ----- Atajos ----- */

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Especialidad = Tables<"especialidades">;
export type Profesional = Tables<"profesionales">;
export type Festivo = Tables<"festivos">;
export type Reserva = Tables<"reservas">;
export type UsuarioPanel = Tables<"usuarios_panel">;
