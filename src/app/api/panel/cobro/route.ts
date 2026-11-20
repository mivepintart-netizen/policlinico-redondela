import { NextResponse } from "next/server";
import { usuarioDePeticion } from "@/lib/servidor/auth";
import { ErrorPago, cobrarAusencia, devolverCobro } from "@/lib/servidor/pagos";

/**
 * Recepción cobra la ausencia (50 %) de la tarjeta guardada, o devuelve
 * ese cobro si se hizo por error. Solo personal del panel.
 */
export async function POST(req: Request) {
  const u = await usuarioDePeticion(req);
  if (!u?.esPanel) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const { id, accion } = (await req.json().catch(() => ({}))) as { id?: string; accion?: "cobrar" | "devolver" };
  if (!id || (accion !== "cobrar" && accion !== "devolver")) return NextResponse.json({ error: "Petición no válida" }, { status: 400 });

  try {
    const r = accion === "cobrar" ? await cobrarAusencia(id, new URL(req.url).origin) : await devolverCobro(id);
    return NextResponse.json(r);
  } catch (e) {
    if (e instanceof ErrorPago) return NextResponse.json({ error: e.message }, { status: e.estado });
    console.error("cobro panel", accion, id, e);
    return NextResponse.json({ error: "No se pudo completar. Inténtalo de nuevo o hazlo desde el panel de Stripe." }, { status: 502 });
  }
}
