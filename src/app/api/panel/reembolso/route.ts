import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { reembolsarReserva } from "@/lib/servidor/pagos";

/** El personal del panel cancela una cita con devolución del anticipo. */
export async function POST(req: Request) {
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!jwt || !id) return NextResponse.json({ error: "Petición no válida" }, { status: 400 });

  // Comprobar que quien lo pide es del panel, con su propia sesión
  const sb = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: esPanel } = await sb.rpc("es_usuario_panel");
  if (!esPanel) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  try {
    const r = await reembolsarReserva(id);
    return NextResponse.json(r);
  } catch (e) {
    console.error("devolución panel", id, e);
    return NextResponse.json({ error: "No se pudo hacer la devolución. Hazla desde el panel de Stripe." }, { status: 502 });
  }
}
