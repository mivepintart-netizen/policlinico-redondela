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
