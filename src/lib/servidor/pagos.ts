/**
 * Lógica de pagos del servidor: abrir el pago, confirmarlo y devolverlo.
 */
import type Stripe from "stripe";
import { fechaLarga } from "../agenda";
import { supabaseAdmin } from "./admin";
import { clienteStripe } from "./stripe";
import { supabaseServidor } from "../supabase/servidor";
import { enviarEmailCita } from "./email";

export class ErrorPago extends Error {
  constructor(mensaje: string, public estado = 400) {
    super(mensaje);
  }
}

/** Abre una sesión de pago de Stripe para una reserva pendiente. Devuelve la URL. */
export async function iniciarPago(token: string, origen: string) {
  const stripe = clienteStripe();
  if (!stripe) throw new ErrorPago("El pago online no está disponible ahora mismo. Llámanos para reservar.", 503);

  const { data } = await supabaseServidor().rpc("obtener_reserva_por_token", { p_token: token });
  const r = data?.[0];
  if (!r) throw new ErrorPago("Cita no encontrada", 404);
  if (r.estado !== "pendiente_pago") throw new ErrorPago("Esta cita ya no está pendiente de pago.", 409);

  const { data: esp } = await supabaseServidor().from("especialidades").select("nombre").eq("id", r.especialidad_id).maybeSingle();

  const sesion = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      locale: "es",
      customer_email: r.paciente_email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: r.deposito * 100,
            product_data: {
              name: `Anticipo · ${esp?.nombre ?? "Cita"}`,
              description: `${fechaLarga(r.fecha)} a las ${r.hora} · Policlínico Redondela · Reserva ${r.id}`,
            },
          },
        },
      ],
      metadata: { reserva_id: r.id, token },
      payment_intent_data: { metadata: { reserva_id: r.id }, description: `Anticipo reserva ${r.id}` },
      // Stripe exige un mínimo de 30 minutos
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${origen}/api/pago/vuelta?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origen}/mi-zona/cita/${token}?pago=cancelado`,
    },
    { idempotencyKey: `checkout-${r.id}-${Math.floor(Date.now() / 60000)}` }
  );

  const { data: vigente, error: errorAdmin } = await supabaseAdmin().rpc("registrar_sesion_pago", { p_reserva_id: r.id, p_sesion: sesion.id });
  if (errorAdmin) {
    // Casi siempre: SUPABASE_SERVICE_ROLE_KEY incorrecta en Vercel
    console.error("registrar_sesion_pago", errorAdmin);
    await stripe.checkout.sessions.expire(sesion.id).catch(() => undefined);
    throw new ErrorPago("El pago online no está bien configurado en el servidor. Avisa a la clínica.", 500);
  }
  if (!vigente) {
    await stripe.checkout.sessions.expire(sesion.id).catch(() => undefined);
    throw new ErrorPago("El tiempo para pagar esta reserva ha caducado. Vuelve a reservar.", 409);
  }
  return sesion.url!;
}

/**
 * Aplica una sesión de pago completada (desde la vuelta del paciente o desde
 * el webhook; puede llegar dos veces y no pasa nada).
 */
export async function aplicarSesionPagada(sesion: Stripe.Checkout.Session, origen: string) {
  const reservaId = sesion.metadata?.reserva_id;
  const token = sesion.metadata?.token ?? null;
  if (!reservaId || sesion.payment_status !== "paid") return { estado: "sin_pagar" as const, token };

  const pi = typeof sesion.payment_intent === "string" ? sesion.payment_intent : sesion.payment_intent?.id;
  if (!pi) return { estado: "sin_pagar" as const, token };

  const { data: resultado, error } = await supabaseAdmin().rpc("confirmar_pago", {
    p_reserva_id: reservaId,
    p_pago_ref: pi,
    p_metodo: "tarjeta",
  });
  if (error) throw error;

  if (resultado === "caducada") {
    // Pagó cuando el hueco ya estaba ocupado: se le devuelve el dinero
    await devolverPago(pi, `caducada-${reservaId}`);
    return { estado: "caducada" as const, token };
  }
  await enviarEmailCita("confirmacion", reservaId, origen);
  return { estado: "confirmada" as const, token };
}

/** Devuelve íntegro un pago. Idempotente por clave. */
export async function devolverPago(paymentIntent: string, clave: string) {
  const stripe = clienteStripe();
  if (!stripe) return false;
  await stripe.refunds.create({ payment_intent: paymentIntent }, { idempotencyKey: `refund-${clave}` });
  return true;
}

/** Devuelve el anticipo de una reserva cancelada con derecho a reembolso. */
export async function reembolsarReserva(reservaId: string) {
  const { data } = await supabaseAdmin().rpc("datos_reembolso", { p_reserva_id: reservaId });
  const d = data?.[0];
  if (!d || d.estado !== "cancelada" || !d.reembolso) return { devuelto: false, motivo: "sin_derecho" as const };
  if (!d.pago_ref) return { devuelto: false, motivo: "pago_simulado" as const };
  await devolverPago(d.pago_ref, reservaId);
  return { devuelto: true, motivo: null };
}
