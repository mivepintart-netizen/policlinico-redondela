import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { enviarEmailCita } from "@/lib/servidor/email";

/**
 * Tras una reserva confirmada sin pasarela (pago simulado o cita del panel),
 * envía el email de confirmación. Solo se envía una vez por reserva.
 */
export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "Falta la cita" }, { status: 400 });
  const { data } = await supabaseServidor().rpc("obtener_reserva_por_token", { p_token: token });
  const r = data?.[0];
  if (!r || (r.estado !== "confirmada" && r.estado !== "sin_deposito")) return NextResponse.json({ enviado: false });
  const enviado = await enviarEmailCita("confirmacion", r.id, new URL(req.url).origin);
  return NextResponse.json({ enviado });
}
