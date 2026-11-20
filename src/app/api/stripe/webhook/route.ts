import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { aplicarSesionGarantia } from "@/lib/servidor/pagos";
import { clienteStripe } from "@/lib/servidor/stripe";

/**
 * Avisos de Stripe. Garantiza que la cita se confirma aunque el paciente
 * cierre el navegador justo después de guardar la tarjeta.
 */
export async function POST(req: Request) {
  const stripe = clienteStripe();
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secreto) return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(await req.text(), req.headers.get("stripe-signature") ?? "", secreto);
  } catch {
    return NextResponse.json({ error: "Firma no válida" }, { status: 400 });
  }

  try {
    if (evento.type === "checkout.session.completed") {
      await aplicarSesionGarantia(evento.data.object as Stripe.Checkout.Session, new URL(req.url).origin);
    }
    // checkout.session.expired: no hace falta nada, el hueco se libera solo
    return NextResponse.json({ recibido: true });
  } catch (e) {
    console.error("webhook", evento.type, e);
    // 500 → Stripe lo reintentará
    return NextResponse.json({ error: "Error al procesar" }, { status: 500 });
  }
}
