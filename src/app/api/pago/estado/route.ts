import { NextResponse } from "next/server";
import { claveSecretaFunciona } from "@/lib/servidor/admin";
import { clienteStripe, modoStripe } from "@/lib/servidor/stripe";

export const dynamic = "force-dynamic";

/** Para el panel: ¿está bien configurado el cobro online? (no revela claves) */
export async function GET() {
  const stripe = clienteStripe();
  let stripeFunciona = false;
  if (stripe) {
    try {
      await stripe.balance.retrieve();
      stripeFunciona = true;
    } catch (e) {
      console.error("clave de Stripe", e instanceof Error ? e.message : e);
    }
  }
  const webhook = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  return NextResponse.json({
    stripe: stripeFunciona ? modoStripe() : null,
    stripeConfigurado: !!stripe,
    webhook: webhook.startsWith("whsec_"),
    webhookConfigurado: !!webhook,
    claveSecretaSupabase: await claveSecretaFunciona(),
    claveSecretaConfigurada: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    email: !!process.env.RESEND_API_KEY,
    cron: !!process.env.CRON_SECRET,
  });
}
