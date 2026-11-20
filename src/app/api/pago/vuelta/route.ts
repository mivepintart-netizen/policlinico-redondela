import { NextResponse } from "next/server";
import { aplicarSesionGarantia } from "@/lib/servidor/pagos";
import { clienteStripe } from "@/lib/servidor/stripe";

/** Stripe devuelve aquí al paciente tras guardar la tarjeta. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("session_id");
  const stripe = clienteStripe();
  if (!id || !stripe) return NextResponse.redirect(new URL("/mi-zona", url.origin));

  try {
    const sesion = await stripe.checkout.sessions.retrieve(id);
    const { estado, token } = await aplicarSesionGarantia(sesion, url.origin);
    if (!token) return NextResponse.redirect(new URL("/mi-zona", url.origin));
    const pago = estado === "confirmada" ? "ok" : estado === "caducada" ? "caducado" : "pendiente";
    return NextResponse.redirect(new URL(`/mi-zona/cita/${token}?pago=${pago}`, url.origin));
  } catch (e) {
    console.error("vuelta de pago", e);
    return NextResponse.redirect(new URL("/mi-zona?pago=error", url.origin));
  }
}
