import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Cliente con la clave SECRETA de Supabase. SOLO para rutas del servidor
 * (src/app/api). Nunca importar desde componentes del navegador.
 */
export function supabaseAdmin() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!clave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const hayClaveSecretaSupabase = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Comprueba que la clave secreta funciona de verdad (no solo que existe). */
export async function claveSecretaFunciona() {
  if (!hayClaveSecretaSupabase()) return false;
  try {
    const { error } = await supabaseAdmin().rpc("datos_reembolso", { p_reserva_id: "RDN-00000" });
    if (error) console.error("clave secreta de Supabase", error.message);
    return !error;
  } catch {
    return false;
  }
}
