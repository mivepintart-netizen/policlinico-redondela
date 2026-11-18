import { NextResponse } from "next/server";
import { mensajeError } from "@/lib/supabase/errores";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { enviarEmailCita } from "@/lib/servidor/email";

/** El paciente cambia el día u hora desde su enlace; se le envía el aviso. */
export async function POST(req: Request) {
  const { token, fecha, hora } = (await req.json().catch(() => ({}))) as { token?: string; fecha?: string; hora?: string };
  if (!token || !fecha || !hora) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  const sb = supabaseServidor();
  const { error } = await sb.rpc("cambiar_reserva_por_token", { p_token: token, p_fecha: fecha, p_hora: hora });
  if (error) return NextResponse.json({ error: mensajeError(error, "No se pudo cambiar la cita.") }, { status: 400 });
  const { data } = await sb.rpc("obtener_reserva_por_token", { p_token: token });
  if (data?.[0]) await enviarEmailCita("cambio", data[0].id, new URL(req.url).origin);
  return NextResponse.json({ ok: true });
}
