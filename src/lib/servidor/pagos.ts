/**
 * Tarjeta en garantía (Stripe). Solo servidor.
 *
 * Al reservar NO se cobra nada: el paciente guarda su tarjeta en Stripe.
 * Si no se presenta o cancela con menos de 24 h, recepción puede cobrarle
 * el 50 % del precio desde el panel.
 */
import type Stripe from "stripe";
import { fechaLarga } from "../agenda";
import { PORCENTAJE_AUSENCIA, formatoEuros, importeAusencia } from "../datos";
import { supabaseAdmin } from "./admin";
import { clienteStripe } from "./stripe";
import { supabaseServidor } from "../supabase/servidor";
import { enviarEmailCita } from "./email";

export class ErrorPago extends Error {
  constructor(mensaje: string, public estado = 400) {
    super(mensaje);
  }
}

/** Abre la página segura de Stripe para que el paciente guarde su tarjeta. Devuelve la URL. */
export async function iniciarGarantia(token: string, origen: string) {
  const stripe = clienteStripe();
  if (!stripe) throw new ErrorPago("Ahora mismo no se puede añadir la tarjeta online. Llámanos para reservar.", 503);

  const { data } = await supabaseServidor().rpc("obtener_reserva_por_token", { p_token: token });
  const r = data?.[0];
  if (!r) throw new ErrorPago("Cita no encontrada", 404);
  if (r.estado !== "pendiente_pago") throw new ErrorPago("Esta cita ya tiene la tarjeta guardada.", 409);

  const { data: esp } = await supabaseServidor().from("especialidades").select("nombre").eq("id", r.especialidad_id).maybeSingle();
  const importe = importeAusencia(r.precio);

  const cliente = await stripe.customers.create(
    {
      email: r.paciente_email || undefined,
      name: `${r.paciente_nombre} ${r.paciente_apellidos}`.trim(),
      metadata: { reserva_id: r.id },
    },
    { idempotencyKey: `cliente-${r.id}` }
  );

  const sesion = await stripe.checkout.sessions.create(
    {
      mode: "setup",
      locale: "es",
      currency: "eur",
      customer: cliente.id,
      // Solo tarjeta: es lo único que se puede cobrar después sin el paciente delante
      allowed_payment_method_types: ["card"],
      setup_intent_data: {
        metadata: { reserva_id: r.id },
        description: `Garantía reserva ${r.id} · ${esp?.nombre ?? "Cita"} · ${fechaLarga(r.fecha)} ${r.hora}`,
      },
      custom_text: {
        submit: {
          message: `No se te cobra nada ahora. Solo si no acudes o cancelas con menos de 24 h, la clínica podrá cobrarte el ${PORCENTAJE_AUSENCIA} % de la cita (${formatoEuros(importe)}).`,
        },
      },
      metadata: { reserva_id: r.id, token },
      // Stripe exige un mínimo de 30 minutos
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: `${origen}/api/pago/vuelta?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origen}/mi-zona/cita/${token}?pago=cancelado`,
    },
    { idempotencyKey: `garantia-${r.id}-${Math.floor(Date.now() / 60000)}` }
  );

  const { data: vigente, error: errorAdmin } = await supabaseAdmin().rpc("registrar_sesion_pago", { p_reserva_id: r.id, p_sesion: sesion.id });
  if (errorAdmin) {
    // Casi siempre: SUPABASE_SERVICE_ROLE_KEY incorrecta en Vercel
    console.error("registrar_sesion_pago", errorAdmin);
    await stripe.checkout.sessions.expire(sesion.id).catch(() => undefined);
    throw new ErrorPago("La tarjeta online no está bien configurada en el servidor. Avisa a la clínica.", 500);
  }
  if (!vigente) {
    await stripe.checkout.sessions.expire(sesion.id).catch(() => undefined);
    throw new ErrorPago("El tiempo para confirmar esta reserva ha caducado. Vuelve a reservar.", 409);
  }
  return sesion.url!;
}

/** "Visa ···· 4242" */
function textoTarjeta(pm: Stripe.PaymentMethod | null) {
  const c = pm?.card;
  if (!c) return "Tarjeta";
  const marca = c.brand ? c.brand.charAt(0).toUpperCase() + c.brand.slice(1) : "Tarjeta";
  return `${marca === "Amex" ? "American Express" : marca} ···· ${c.last4}`;
}

/**
 * Aplica una sesión completada (desde la vuelta del paciente o desde el
 * webhook; puede llegar dos veces y no pasa nada).
 */
export async function aplicarSesionGarantia(sesion: Stripe.Checkout.Session, origen: string) {
  const reservaId = sesion.metadata?.reserva_id;
  const token = sesion.metadata?.token ?? null;
  if (!reservaId || sesion.mode !== "setup" || sesion.status !== "complete") return { estado: "sin_tarjeta" as const, token };

  const stripe = clienteStripe();
  const siId = typeof sesion.setup_intent === "string" ? sesion.setup_intent : sesion.setup_intent?.id;
  if (!stripe || !siId) return { estado: "sin_tarjeta" as const, token };

  const si = await stripe.setupIntents.retrieve(siId, { expand: ["payment_method"] });
  if (si.status !== "succeeded" || !si.payment_method) return { estado: "sin_tarjeta" as const, token };
  const pm = typeof si.payment_method === "string" ? await stripe.paymentMethods.retrieve(si.payment_method) : si.payment_method;
  const cliente = typeof si.customer === "string" ? si.customer : si.customer?.id;
  if (!cliente) return { estado: "sin_tarjeta" as const, token };

  const { data: resultado, error } = await supabaseAdmin().rpc("confirmar_garantia", {
    p_reserva_id: reservaId,
    p_cliente: cliente,
    p_metodo: pm.id,
    p_tarjeta: textoTarjeta(pm),
  });
  if (error) throw error;

  if (resultado === "caducada") {
    // Llegó tarde y el hueco ya está ocupado: no se ha cobrado nada; se borra la tarjeta
    await stripe.paymentMethods.detach(pm.id).catch(() => undefined);
    return { estado: "caducada" as const, token };
  }
  await enviarEmailCita("confirmacion", reservaId, origen);
  return { estado: "confirmada" as const, token };
}

/** Traduce el error de Stripe al cobrar sin el paciente delante. */
function motivoRechazo(e: unknown) {
  const err = e as { code?: string; decline_code?: string; message?: string };
  if (err.code === "authentication_required")
    return "El banco del paciente pide que confirme el pago él mismo. Contacta con el paciente para que pague en la clínica o por otro medio.";
  if (err.decline_code === "insufficient_funds") return "La tarjeta no tiene saldo suficiente.";
  if (err.code === "expired_card") return "La tarjeta ha caducado.";
  if (err.code === "card_declined") return "El banco ha rechazado la tarjeta.";
  return "No se pudo cobrar la tarjeta.";
}

/**
 * Cobra al paciente el porcentaje por ausencia (no presentado o cancelación
 * con menos de 24 h). Lo pide recepción desde el panel.
 */
export async function cobrarAusencia(reservaId: string, origen: string) {
  const stripe = clienteStripe();
  if (!stripe) throw new ErrorPago("Stripe no está configurado.", 503);

  const sb = supabaseAdmin();
  const { data } = await sb.rpc("datos_cobro", { p_reserva_id: reservaId });
  const d = data?.[0];
  if (!d) throw new ErrorPago("Cita no encontrada", 404);
  if (!(d.estado === "no_presentado" || (d.estado === "cancelada" && d.cancelada_tarde)))
    throw new ErrorPago("Solo se cobra si el paciente no se presentó o canceló con menos de 24 h.", 409);
  if (d.cobro_ref) throw new ErrorPago(d.cobro_devuelto ? "Este cobro ya se devolvió." : "Esta cita ya está cobrada.", 409);
  if (!d.garantia_metodo || !d.garantia_cliente) throw new ErrorPago("Esta cita no tiene tarjeta guardada.", 409);

  const importe = importeAusencia(d.precio);
  const centimos = Math.round(importe * 100);
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: centimos,
        currency: "eur",
        customer: d.garantia_cliente,
        payment_method: d.garantia_metodo,
        off_session: true,
        confirm: true,
        description: `${d.estado === "no_presentado" ? "No presentado" : "Cancelación tardía"} · reserva ${reservaId} · ${fechaLarga(d.fecha)} ${d.hora}`,
        metadata: { reserva_id: reservaId, motivo: d.estado },
      },
      // Evita cobrar dos veces por un doble clic; tras un rechazo se puede reintentar al minuto
      { idempotencyKey: `ausencia-${reservaId}-${d.cobro_ref ?? "0"}-${Math.floor(Date.now() / 60000)}` }
    );
    if (pi.status !== "succeeded") throw Object.assign(new Error("pago no completado"), { code: "authentication_required" });
    await sb.rpc("registrar_cobro", { p_reserva_id: reservaId, p_ref: pi.id, p_importe: centimos, p_error: null });
    await enviarEmailCita("cobro", reservaId, origen);
    return { importe };
  } catch (e) {
    const motivo = motivoRechazo(e);
    console.error("cobro ausencia", reservaId, e instanceof Error ? e.message : e);
    await sb.rpc("registrar_cobro", { p_reserva_id: reservaId, p_ref: null, p_importe: null, p_error: motivo });
    throw new ErrorPago(motivo, 402);
  }
}

/** Devuelve íntegro el cobro por ausencia (por ejemplo, si se cobró por error). */
export async function devolverCobro(reservaId: string) {
  const stripe = clienteStripe();
  if (!stripe) throw new ErrorPago("Stripe no está configurado.", 503);
  const sb = supabaseAdmin();
  const { data } = await sb.rpc("datos_cobro", { p_reserva_id: reservaId });
  const d = data?.[0];
  if (!d?.cobro_ref || d.cobro_devuelto) throw new ErrorPago("No hay ningún cobro que devolver.", 409);
  await stripe.refunds.create({ payment_intent: d.cobro_ref }, { idempotencyKey: `devolucion-${d.cobro_ref}` });
  await sb.rpc("registrar_devolucion_cobro", { p_reserva_id: reservaId });
  return { importe: (d.cobro_importe ?? 0) / 100 };
}
