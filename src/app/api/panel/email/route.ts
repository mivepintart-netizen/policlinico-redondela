import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { enviarEmailCita, type TipoEmail } from "@/lib/servidor/email";

/** El panel avisa al paciente por email (p. ej. al cancelar la clínica su cita). */
export async function POST(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { id, tipo } = (await req.json().catch(() => ({}))) as { id?: string; tipo?: TipoEmail };
  if (!jwt || !id || !tipo || !["confirmacion", "cambio", "cancelacion"].includes(tipo)) {
    return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  }
  const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: esPanel } = await sb.rpc("es_usuario_panel");
  if (!esPanel) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const enviado = await enviarEmailCita(tipo, id, new URL(req.url).origin, { tarde: false });
  return NextResponse.json({ enviado });
}
