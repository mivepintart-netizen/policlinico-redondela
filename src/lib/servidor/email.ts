/**
 * Emails al paciente (Resend). Solo servidor.
 * Si falla un email, nunca se deshace la acción (reservar, cambiar, cancelar).
 */
import { Resend } from "resend";
import { fechaLarga, momento } from "../agenda";
import { PORCENTAJE_AUSENCIA, contacto, formatoEuros, importeAusencia } from "../datos";
import type { FilaReserva } from "../database.types";
import { supabaseAdmin } from "./admin";

export type TipoEmail = "confirmacion" | "cambio" | "cancelacion" | "recordatorio" | "cobro";

export const REMITENTE = () => process.env.EMAIL_REMITENTE || "Policlínico Redondela <onboarding@resend.dev>";

export const hayEmail = () => !!process.env.RESEND_API_KEY;

/* ------------------------------------------------------------------ */
/* Plantilla                                                           */
/* ------------------------------------------------------------------ */

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function fila(etiqueta: string, valor: string) {
  return `<tr><td style="padding:6px 0;color:#7C949B;font-size:14px;width:120px;vertical-align:top">${etiqueta}</td><td style="padding:6px 0;color:#12333A;font-size:15px;font-weight:600">${valor}</td></tr>`;
}

export function plantillaEmail(opts: {
  tipo: TipoEmail;
  r: FilaReserva;
  especialidad: string;
  duracionMin: number;
  profesional: string;
  enlace: string;
  /** Cancelación con menos de 24 h (se puede cobrar el 50 %) */
  tarde?: boolean;
}) {
  const { tipo, r, enlace } = opts;
  const garantia = r.garantia_tarjeta;
  const ausencia = formatoEuros(importeAusencia(r.precio));
  const cobrado = formatoEuros((r.cobro_importe ?? 0) / 100);
  const nombre = esc(r.paciente_nombre);
  const cuando = `${fechaLarga(r.fecha).toLowerCase()} a las ${r.hora}`;

  const titulos: Record<TipoEmail, { asunto: string; titulo: string; intro: string }> = {
    confirmacion: {
      asunto: `Cita confirmada: ${opts.especialidad}, ${cuando}`,
      titulo: "¡Tu cita está confirmada!",
      intro: `Hola ${nombre}, te esperamos en el Policlínico Redondela.`,
    },
    cambio: {
      asunto: `Cita cambiada: ${opts.especialidad}, ${cuando}`,
      titulo: "Hemos cambiado tu cita",
      intro: `Hola ${nombre}, estos son los nuevos datos de tu cita.`,
    },
    recordatorio: {
      asunto: `Recordatorio: mañana a las ${r.hora}, ${opts.especialidad}`,
      titulo: `Te esperamos mañana a las ${r.hora}`,
      intro: `Hola ${nombre}, te recordamos tu cita en el Policlínico Redondela. Si no puedes venir, avísanos para que otra persona pueda aprovechar el hueco.`,
    },
    cancelacion: {
      asunto: `Cita cancelada: ${opts.especialidad}, ${cuando}`,
      titulo: "Tu cita está cancelada",
      intro: `Hola ${nombre}, hemos cancelado tu cita. Si no lo has pedido tú, llámanos.`,
    },
    cobro: {
      asunto: `Cargo por cita no atendida: ${opts.especialidad}, ${cuando}`,
      titulo: `Hemos cobrado el ${PORCENTAJE_AUSENCIA} % de tu cita`,
      intro: `Hola ${nombre}, como no acudiste a tu cita o la cancelaste con menos de 24 horas de antelación, hemos cobrado <strong>${cobrado}</strong> a tu ${esc(garantia ?? "tarjeta")}, según las condiciones que aceptaste al reservar. Si crees que es un error, llámanos al ${contacto.telefono}.`,
    },
  };
  const t = titulos[tipo];

  let pago = "";
  const caja = (fondo: string, color: string, html: string) =>
    `<p style="margin:0;padding:14px 16px;background:${fondo};border-radius:12px;color:${color};font-size:14px;line-height:1.5">${html}</p>`;
  if (tipo === "cancelacion") {
    pago = opts.tarde
      ? caja("#FDF4EA", "#9E5815", `Has cancelado con menos de 24 horas de antelación. Según las condiciones de reserva, la clínica puede cobrar el ${PORCENTAJE_AUSENCIA} % de la cita (<strong>${ausencia}</strong>) a tu tarjeta. Si fue por una causa justificada, llámanos.`)
      : "";
  } else if (tipo !== "cobro") {
    pago = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px 0;margin:0 -8px">
      <tr>
        <td style="background:#EAF6F7;border-radius:12px;padding:12px 14px;width:50%">
          <div style="color:#09555E;font-size:13px">Pagado al reservar</div>
          <div style="color:#0D7C8A;font-size:20px;font-weight:700">0 €</div>
        </td>
        <td style="background:#F6FBFB;border-radius:12px;padding:12px 14px;width:50%">
          <div style="color:#4A6670;font-size:13px">A pagar en la clínica</div>
          <div style="color:#12333A;font-size:20px;font-weight:700">${formatoEuros(r.precio)}</div>
        </td>
      </tr>
    </table>${garantia ? `<p style="margin:10px 0 0;color:#7C949B;font-size:13px">Tarjeta en garantía: ${esc(garantia)}</p>` : ""}`;
  }

  const limite = new Date(momento(r.fecha, r.hora).getTime() - 24 * 3600 * 1000);
  const politica =
    tipo === "recordatorio"
      ? `<p style="margin:20px 0 0;color:#4A6670;font-size:14px;line-height:1.5">Llega 5 minutos antes. Si no puedes venir, avísanos desde el botón de abajo o llámanos al ${contacto.telefono}.${
          garantia ? ` Recuerda que si no acudes se podrá cobrar el ${PORCENTAJE_AUSENCIA} % de la cita (${ausencia}).` : ""
        }</p>`
      : tipo === "confirmacion" || tipo === "cambio"
      ? `<p style="margin:20px 0 0;color:#4A6670;font-size:14px;line-height:1.5">Puedes cambiar o cancelar gratis hasta el <strong>${limite.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las ${r.hora}</strong>.${
          garantia
            ? ` Si cancelas después o no acudes, se podrá cobrar el ${PORCENTAJE_AUSENCIA} % de la cita (<strong>${ausencia}</strong>) a la tarjeta que dejaste en garantía.`
            : ""
        }</p>`
      : "";

  const boton =
    tipo !== "cancelacion" && tipo !== "cobro"
      ? `<a href="${enlace}" style="display:inline-block;margin-top:24px;background:#0D7C8A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px">Ver, cambiar o cancelar mi cita</a>${
          tipo === "recordatorio"
            ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`)}" style="display:inline-block;margin-top:12px;color:#0D7C8A;font-size:14px;font-weight:600">Cómo llegar →</a>`
            : ""
        }`
      : `<a href="${enlace.replace(/\/mi-zona\/cita\/.*/, "/reservar")}" style="display:inline-block;margin-top:24px;background:#0D7C8A;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px">Reservar otra cita</a>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(t.asunto)}</title></head>
<body style="margin:0;padding:0;background:#F6FBFB;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6FBFB;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 16px;color:#12333A;font-size:16px;font-weight:700">
      <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;background:#0D7C8A;color:#fff;border-radius:8px;margin-right:8px">+</span>Policlínico Redondela
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #DCEBEC;border-radius:20px;padding:28px">
      <h1 style="margin:0;color:#12333A;font-size:24px;line-height:1.25">${t.titulo}</h1>
      <p style="margin:8px 0 20px;color:#4A6670;font-size:15px;line-height:1.5">${t.intro}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #DCEBEC;border-bottom:1px solid #DCEBEC;margin-bottom:20px">
        <tr><td style="padding:12px 0">
          <table role="presentation" cellpadding="0" cellspacing="0">
            ${fila("Especialidad", esc(opts.especialidad))}
            ${fila("Día", fechaLarga(r.fecha))}
            ${fila("Hora", `${r.hora} · ${opts.duracionMin} min`)}
            ${fila("Profesional", esc(opts.profesional))}
            ${fila("Dónde", `${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`)}
            ${fila("Código", r.id)}
          </table>
        </td></tr>
      </table>
      ${pago}
      ${politica}
      ${boton}
    </td></tr>
    <tr><td style="padding:20px 8px;color:#7C949B;font-size:12px;line-height:1.6;text-align:center">
      Policlínico Redondela · ${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad} (${contacto.provincia})<br>
      Teléfono ${contacto.telefono} · Recibes este email porque has reservado una cita con nosotros.
    </td></tr>
  </table>
</td></tr></table></body></html>`;

  const texto = [
    t.titulo,
    "",
    t.intro.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, ""),
    "",
    `Especialidad: ${opts.especialidad}`,
    `Día: ${fechaLarga(r.fecha)}`,
    `Hora: ${r.hora} (${opts.duracionMin} min)`,
    `Profesional: ${opts.profesional}`,
    `Dónde: ${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`,
    `Código: ${r.id}`,
    "",
    tipo !== "cancelacion" && tipo !== "cobro" ? `Gestiona tu cita: ${enlace}` : "",
    `Teléfono: ${contacto.telefono}`,
  ].join("\n");

  return { asunto: t.asunto, html, texto };
}

/** Archivo .ics para añadir la cita al calendario. */
function ics(r: FilaReserva, especialidad: string, duracionMin: number, enlace: string) {
  const inicio = momento(r.fecha, r.hora);
  const fin = new Date(inicio.getTime() + duracionMin * 60000);
  const local = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
  const e = (t: string) => t.replace(/[\;,]/g, (c) => `\\${c}`);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Policlinico Redondela//Citas//ES", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@policlinicoredondela`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;TZID=Europe/Madrid:${local(inicio)}`,
    `DTEND;TZID=Europe/Madrid:${local(fin)}`,
    `SUMMARY:${e(`${especialidad} · Policlínico Redondela`)}`,
    `LOCATION:${e(`${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`)}`,
    `DESCRIPTION:${e(`Reserva ${r.id}. Gestiona tu cita: ${enlace}`)}`,
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${e(especialidad)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Envío                                                               */
/* ------------------------------------------------------------------ */

/**
 * Envía un email sobre una reserva. La confirmación solo se envía una vez
 * aunque se llame varias (vuelta del pago + webhook, recargas…).
 */
export async function enviarEmailCita(tipo: TipoEmail, reservaId: string, origen: string, extra?: { tarde?: boolean }) {
  if (!hayEmail()) return false;
  try {
    const sb = supabaseAdmin();

    if (tipo === "confirmacion") {
      // Marcar como enviado de forma atómica: si ya lo estaba, no se repite
      const { data: marcada } = await sb
        .from("reservas")
        .update({ email_confirmacion_at: new Date().toISOString() })
        .eq("id", reservaId)
        .in("estado", ["confirmada", "sin_deposito"])
        .is("email_confirmacion_at", null)
        .select("id");
      if (!marcada?.length) return false;
    }

    const { data: r } = await sb.from("reservas").select("*").eq("id", reservaId).maybeSingle();
    if (!r?.paciente_email) return false;
    const [{ data: esp }, { data: prof }] = await Promise.all([
      sb.from("especialidades").select("nombre, duracion_min").eq("id", r.especialidad_id).maybeSingle(),
      sb.from("profesionales").select("nombre").eq("id", r.profesional_id).maybeSingle(),
    ]);
    const especialidad = esp?.nombre ?? "Consulta";
    const duracionMin = esp?.duracion_min ?? 30;
    const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || origen;
    const enlace = `${base}/mi-zona/cita/${r.token_acceso}`;

    const { asunto, html, texto } = plantillaEmail({
      tipo, r, especialidad, duracionMin, profesional: prof?.nombre ?? "", enlace, tarde: extra?.tarde,
    });

    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: REMITENTE(),
      to: r.paciente_email,
      replyTo: process.env.EMAIL_RESPONDER_A || undefined,
      subject: asunto,
      html,
      text: texto,
      attachments:
        tipo === "cancelacion" || tipo === "recordatorio" || tipo === "cobro"
          ? undefined
          : [{ filename: `cita-${r.id}.ics`, content: Buffer.from(ics(r, especialidad, duracionMin, enlace)).toString("base64") }],
    });
    if (error) {
      console.error("email", tipo, reservaId, error);
      // Si la confirmación falló, permitir reintentarla
      if (tipo === "confirmacion") await sb.from("reservas").update({ email_confirmacion_at: null }).eq("id", reservaId);
      return false;
    }
    return true;
  } catch (e) {
    console.error("email", tipo, reservaId, e);
    return false;
  }
}
