import { NextResponse } from "next/server";
import { mensajeError } from "@/lib/supabase/errores";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { enviarEmailCita } from "@/lib/servidor/email";

/**
 * El paciente cancela desde su enlace. Si la cancela con menos de 24 h,
 * queda marcada como "cancelación tardía" y la clínica podrá cobrar el 50 %
 * de la tarjeta guardada (lo decide recepción desde el panel).
 */
export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "Falta la cita" }, { status: 400 });

  const sb = supabaseServidor();
  const { data: cita } = await sb.rpc("obtener_reserva_por_token", { p_token: token });
  const r = cita?.[0];
  if (!r) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

  const { data: tarde, error } = await sb.rpc("cancelar_reserva_por_token", { p_token: token });
  if (error) return NextResponse.json({ error: mensajeError(error, "No se pudo cancelar la cita.") }, { status: 400 });

  // Solo avisamos de citas que estaban confirmadas (no de reservas sin tarjeta aún)
  if (r.estado !== "pendiente_pago") {
    await enviarEmailCita("cancelacion", r.id, new URL(req.url).origin, { tarde: !!tarde });
  }
  return NextResponse.json({ tarde: !!tarde });
}
