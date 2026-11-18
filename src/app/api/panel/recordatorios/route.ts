import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { enviarRecordatorios } from "@/lib/servidor/recordatorios";

export const maxDuration = 60;

/** El admin lanza a mano los recordatorios de mañana (los ya enviados no se repiten). */
export async function POST(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: esAdmin } = await sb.rpc("es_admin");
  if (!esAdmin) return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  try {
    return NextResponse.json(await enviarRecordatorios(new URL(req.url).origin));
  } catch (e) {
    console.error("recordatorios (panel)", e);
    return NextResponse.json({ error: "No se pudieron enviar. ¿Has ejecutado el SQL de recordatorios?" }, { status: 500 });
  }
}
