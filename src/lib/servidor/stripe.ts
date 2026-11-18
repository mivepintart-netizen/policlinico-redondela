import Stripe from "stripe";

let stripe: Stripe | null = null;

/** Cliente de Stripe (null si no está configurado). Solo servidor. */
export function clienteStripe() {
  const clave = process.env.STRIPE_SECRET_KEY;
  if (!clave) return null;
  if (!stripe) {
    // fetch: funciona en Vercel y respeta proxies
    stripe = new Stripe(clave, { httpClient: Stripe.createFetchHttpClient() });
  }
  return stripe;
}

export const modoStripe = () =>
  !process.env.STRIPE_SECRET_KEY ? null : process.env.STRIPE_SECRET_KEY.startsWith("sk_live") || process.env.STRIPE_SECRET_KEY.startsWith("rk_live") ? "real" : "prueba";
