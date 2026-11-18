/**
 * Recordatorio por email el día antes de la cita. Solo servidor.
 */
import { Resend } from "resend";
import { supabaseAdmin } from "./admin";
import { REMITENTE, hayEmail, plantillaEmail } from "./email";

/** Fecha de mañana en España (YYYY-MM-DD), independiente de la zona del servidor. */
export function mananaEnEspana(ahora = new Date()) {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(ahora); // 2026-11-18
  const [a, m, d] = hoy.split("-").map(Number);
  const manana = new Date(Date.UTC(a, m - 1, d + 1));
  return manana.toISOString().slice(0, 10);
}

export type ResultadoRecordatorios = { fecha: string; pendientes: number; enviados: number; fallidos: number; motivo?: string };

export async function enviarRecordatorios(origen: string): Promise<ResultadoRecordatorios> {
  const fecha = mananaEnEspana();
  if (!hayEmail()) return { fecha, pendientes: 0, enviados: 0, fallidos: 0, motivo: "Falta RESEND_API_KEY" };

  const sb = supabaseAdmin();
  const { data: citas, error } = await sb
    .from("reservas")
    .select("*")
    .eq("fecha", fecha)
    .in("estado", ["confirmada", "sin_deposito"])
    .neq("paciente_email", "")
    .is("recordatorio_at", null)
    .order("hora");
  if (error) throw error;
  if (!citas?.length) return { fecha, pendientes: 0, enviados: 0, fallidos: 0 };

  const [{ data: esps }, { data: profs }] = await Promise.all([
    sb.from("especialidades").select("id, nombre, duracion_min"),
    sb.from("profesionales").select("id, nombre"),
  ]);
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || origen;
  const resend = new Resend(process.env.RESEND_API_KEY);

  let enviados = 0;
  let fallidos = 0;
  // Lotes de 100 (máximo de Resend por llamada)
  for (let i = 0; i < citas.length; i += 100) {
    const lote = citas.slice(i, i + 100);

    // Marcar antes de enviar: si el proceso se lanza dos veces, nadie recibe dos recordatorios
    const { data: marcadas } = await sb
      .from("reservas")
      .update({ recordatorio_at: new Date().toISOString() })
      .in("id", lote.map((r) => r.id))
      .is("recordatorio_at", null)
      .select("id");
    const ids = new Set((marcadas ?? []).map((m) => m.id));
    const aEnviar = lote.filter((r) => ids.has(r.id));
    if (!aEnviar.length) continue;

    const mensajes = aEnviar.map((r) => {
      const esp = esps?.find((e) => e.id === r.especialidad_id);
      const { asunto, html, texto } = plantillaEmail({
        tipo: "recordatorio",
        r,
        especialidad: esp?.nombre ?? "Consulta",
        duracionMin: esp?.duracion_min ?? 30,
        profesional: profs?.find((p) => p.id === r.profesional_id)?.nombre ?? "",
        enlace: `${base}/mi-zona/cita/${r.token_acceso}`,
      });
      return {
        from: REMITENTE(),
        to: r.paciente_email,
        replyTo: process.env.EMAIL_RESPONDER_A || undefined,
        subject: asunto,
        html,
        text: texto,
      };
    });

    const { error: errEnvio } = await resend.batch.send(mensajes);
    if (errEnvio) {
      console.error("recordatorios", fecha, errEnvio);
      fallidos += aEnviar.length;
      // Desmarcar para poder reintentar
      await sb.from("reservas").update({ recordatorio_at: null }).in("id", aEnviar.map((r) => r.id));
    } else {
      enviados += aEnviar.length;
    }
  }
  return { fecha, pendientes: citas.length, enviados, fallidos };
}
