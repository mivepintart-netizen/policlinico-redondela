import { NextResponse } from "next/server";
import { hayClaveSecretaSupabase } from "@/lib/servidor/admin";
import { modoStripe } from "@/lib/servidor/stripe";

export const dynamic = "force-dynamic";

/** Para el panel: ¿está configurado el cobro online? (no revela claves) */
export async function GET() {
  return NextResponse.json({
    stripe: modoStripe(),
    webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    claveSecretaSupabase: hayClaveSecretaSupabase(),
  });
}
