/** Mensaje legible a partir de un error de Supabase (sirve en navegador y servidor). */
export function mensajeError(e: unknown, porDefecto = "Ha ocurrido un error. Inténtalo de nuevo.") {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
    const m = e.message;
    // Los errores de nuestras funciones vienen en español y son para mostrar
    if (/^[A-ZÁÉÍÓÚ¿¡]/.test(m) && !/^(JWT|Failed|TypeError|NetworkError)/.test(m)) return m;
    if (/fetch|network/i.test(m)) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  }
  return porDefecto;
}
