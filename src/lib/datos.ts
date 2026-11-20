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

/**
 * Datos legales del titular de la web. ⚠️ Rellenar con los datos reales:
 * los textos entre corchetes se muestran resaltados en las páginas legales.
 */
export const legal = {
  titular: "[RAZÓN SOCIAL DEL POLICLÍNICO]",
  cif: "[CIF]",
  domicilio: "Rúa do Viaduto, 14, 36800 Redondela (Pontevedra)",
  registro: "[Datos de inscripción en el Registro Mercantil, si es sociedad]",
  autorizacionSanitaria: "[Nº de registro de centro sanitario de la Xunta de Galicia]",
  emailPrivacidad: "[email para protección de datos]",
  delegadoProteccionDatos: "[Nombre o empresa del Delegado de Protección de Datos, si lo hay]",
  regionServidores: "[Región de Supabase: Settings → General, p. ej. «Unión Europea (Irlanda)»]",
  actualizado: "noviembre de 2026",
};

/** Franjas de cada turno. Deben coincidir con es_hueco_valido() en la base de datos. */
export const turnos = {
  m: { inicio: "09:00", fin: "14:00" },
  t: { inicio: "16:00", fin: "20:30" },
} as const;

/** Hasta cuántos días vista se puede reservar (igual que en crear_reserva()). */
export const diasReservables = 60;

export function formatoEuros(valor: number) {
  // 40 → "40 €"; 22.5 → "22,50 €"
  const texto = Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace(".", ",");
  return `${texto} €`;
}

/** Porcentaje del precio que se cobra si el paciente no se presenta o cancela con menos de 24 h. */
export const PORCENTAJE_AUSENCIA = 50;

/** Importe (en euros) que se cobra por ausencia para un precio dado. */
export const importeAusencia = (precio: number) => Math.round(precio * PORCENTAJE_AUSENCIA) / 100;
