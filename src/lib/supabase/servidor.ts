import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Cliente de Supabase para leer datos públicos desde el servidor (sin sesión).
 * `cache: "no-store"`: Next.js no debe guardar estas consultas en su caché,
 * o los cambios del panel (precios, horarios, festivos, cobro) no se verían.
 */
export function supabaseServidor() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, opciones) => fetch(url, { ...opciones, cache: "no-store" }) },
  });
}
