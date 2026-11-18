"use client";

import { useEffect, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { btn } from "./ui";

/** Estado de los recordatorios automáticos y envío manual (solo admin). */
export default function AjustesRecordatorios({ onAviso }: { onAviso: (t: string) => void }) {
  const [config, setConfig] = useState<{ cron: boolean; email: boolean } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/pago/estado")
      .then((r) => r.json())
      .then((e) => setConfig({ cron: !!e.cron, email: !!e.email }))
      .catch(() => undefined);
  }, []);

  const enviarAhora = async () => {
    setEnviando(true);
    const { data } = await supabaseNavegador().auth.getSession();
    const res = await fetch("/api/panel/recordatorios", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    }).catch(() => null);
    const r = (await res?.json().catch(() => ({}))) as {
      fecha?: string; pendientes?: number; enviados?: number; fallidos?: number; motivo?: string; error?: string;
    };
    setEnviando(false);
    if (!res?.ok) return onAviso(r.error ?? "No se pudieron enviar los recordatorios.");
    if (r.motivo) return onAviso(`No enviados: ${r.motivo}`);
    if (!r.pendientes) return onAviso("No hay recordatorios pendientes para mañana (o ya se enviaron).");
    onAviso(`Recordatorios enviados: ${r.enviados}${r.fallidos ? ` · fallidos: ${r.fallidos}` : ""}`);
  };

  return (
    <section className="mb-8 rounded-2xl bg-white p-5 ring-1 ring-linea">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">Recordatorio el día antes</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Cada tarde, hacia las 18:00, se envía un email a los pacientes con cita al día siguiente. Cada paciente lo recibe
            una sola vez.
          </p>
          {config && (
            <p className={`mt-2 text-sm font-medium ${config.cron && config.email ? "text-brand-600" : "text-ambar-700"}`}>
              {config.cron && config.email
                ? "✓ Activado"
                : !config.email
                  ? "Desactivado: falta RESEND_API_KEY en Vercel"
                  : "Desactivado: falta CRON_SECRET en Vercel"}
            </p>
          )}
        </div>
        <button type="button" onClick={() => void enviarAhora()} disabled={enviando} className={`${btn.secundario} shrink-0`}>
          {enviando ? "Enviando…" : "Enviar ahora los de mañana"}
        </button>
      </div>
    </section>
  );
}
