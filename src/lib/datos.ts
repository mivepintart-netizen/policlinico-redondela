/**
 * Datos fijos de la clínica. Las especialidades, profesionales, festivos y
 * reservas están en Supabase (ver catalogo.ts).
 */

export const contacto = {
  direccion: "Rúa do Viaduto, 14",
  codigoPostal: "36800",
  localidad: "Redondela",
  provincia: "Pontevedra",
  // ⚠️ Datos ficticios: sustituir por los reales
  telefono: "986 40 12 34",
  telefonoHref: "+34986401234",
  whatsappHref: "https://wa.me/34600000000",
  email: "citas@policlinicoredondela.es",
  recepcionista: "María",
};

/** Franjas de cada turno. Deben coincidir con es_hueco_valido() en la base de datos. */
export const turnos = {
  m: { inicio: "09:00", fin: "14:00" },
  t: { inicio: "16:00", fin: "20:30" },
} as const;

/** Hasta cuántos días vista se puede reservar (igual que en crear_reserva()). */
export const diasReservables = 60;

export function formatoEuros(valor: number) {
  return `${valor} €`;
}
