import { NextResponse } from "next/server";
import { ErrorPago, iniciarPago } from "@/lib/servidor/pagos";

/** El paciente quiere pagar el anticipo de una reserva pendiente. */
export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string };
    if (!token || typeof token !== "string") return NextResponse.json({ error: "Falta la reserva" }, { status: 400 });
    const url = await iniciarPago(token, new URL(req.url).origin);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof ErrorPago) return NextResponse.json({ error: e.message }, { status: e.estado });
    console.error("iniciar pago", e);
    return NextResponse.json({ error: "No se pudo abrir el pago. Inténtalo de nuevo." }, { status: 500 });
  }
}
