import { NextResponse } from "next/server";
import { mensajeError } from "@/lib/supabase/errores";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { reembolsarReserva } from "@/lib/servidor/pagos";

/** El paciente cancela desde su enlace; si procede, se le devuelve el anticipo. */
export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "Falta la cita" }, { status: 400 });

  const sb = supabaseServidor();
  const { data: cita } = await sb.rpc("obtener_reserva_por_token", { p_token: token });
  const r = cita?.[0];
  if (!r) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });

  const { data: conReembolso, error } = await sb.rpc("cancelar_reserva_por_token", { p_token: token });
  if (error) return NextResponse.json({ error: mensajeError(error, "No se pudo cancelar la cita.") }, { status: 400 });

  let devuelto = false;
  let devolucionPendiente = false;
  if (conReembolso) {
    try {
      devuelto = (await reembolsarReserva(r.id)).devuelto;
    } catch (e) {
      // La cita queda cancelada igualmente; la clínica hará la devolución a mano
      console.error("devolución", r.id, e);
      devolucionPendiente = true;
    }
  }
  return NextResponse.json({ reembolso: !!conReembolso, devuelto, devolucionPendiente });
}
