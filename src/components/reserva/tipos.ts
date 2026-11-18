import type { Hueco } from "@/lib/agenda";

export type DatosPaciente = {
  nombre: string;
  apellidos: string;
  dni: string;
  telefono: string;
  email: string;
  motivo: string;
  acepta: boolean;
};

export type MetodoPago = "tarjeta" | "bizum";

export type EstadoReserva = {
  especialidadId: string | null;
  /** undefined = sin elegir · null = "cualquier profesional" */
  profesionalId: string | null | undefined;
  fecha: string | null; // 'YYYY-MM-DD'
  hueco: Hueco | null;
  datos: DatosPaciente;
  metodoPago: MetodoPago;
};

export const datosVacios: DatosPaciente = {
  nombre: "",
  apellidos: "",
  dni: "",
  telefono: "",
  email: "",
  motivo: "",
  acepta: false,
};

export const PASOS = ["Especialidad", "Profesional", "Día y hora", "Tus datos", "Pago"] as const;
