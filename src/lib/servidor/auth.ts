import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

/**
 * Comprueba quién hace la petición a partir de su sesión del panel
 * (cabecera Authorization: Bearer <token>). Solo servidor.
 */
export async function usuarioDePeticion(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: u } = await sb.auth.getUser(jwt);
  if (!u.user) return null;
  const [{ data: esPanel }, { data: esAdmin }] = await Promise.all([sb.rpc("es_usuario_panel"), sb.rpc("es_admin")]);
  return { id: u.user.id, email: u.user.email ?? "", esPanel: !!esPanel, esAdmin: !!esAdmin };
}
