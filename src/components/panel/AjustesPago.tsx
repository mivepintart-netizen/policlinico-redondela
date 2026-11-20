"use client";

import { useEffect, useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";

type Estado = {
  stripe: "prueba" | "real" | null;
  stripeConfigurado: boolean;
  webhook: boolean;
  webhookConfigurado: boolean;
  claveSecretaSupabase: boolean;
  claveSecretaConfigurada: boolean;
};

/** Interruptor de la tarjeta en garantía con Stripe (solo admin). */
export default function AjustesPago({ onAviso }: { onAviso: (t: string) => void }) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    supabaseNavegador()
      .from("ajustes")
      .select("pago_online")
      .maybeSingle()
      .then(({ data }) => setOnline(!!data?.pago_online));
    fetch("/api/pago/estado")
      .then((r) => r.json())
      .then(setEstado)
      .catch(() => undefined);
  }, []);

  const listoParaOnline = !!estado?.stripe && estado.webhook && estado.claveSecretaSupabase;

  const cambiar = async (valor: boolean) => {
    setGuardando(true);
    const { error } = await supabaseNavegador().from("ajustes").update({ pago_online: valor }).eq("id", true);
    setGuardando(false);
    if (error) return onAviso("No se pudo guardar. ¿Has ejecutado el SQL de pagos en Supabase?");
    setOnline(valor);
    onAviso(valor ? "Tarjeta en garantía activada" : "Tarjeta en garantía desactivada (modo simulado)");
  };

  const fila = (ok: boolean, puesta: boolean, texto: string, ayuda: string) => (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs text-white ${ok ? "bg-brand-500" : puesta ? "bg-red-500" : "bg-slate-300"}`}
        aria-hidden="true"
      >
        {ok ? "✓" : puesta ? "✕" : "–"}
      </span>
      <span>
        <span className={ok ? "" : "font-medium"}>{texto}</span>
        {!ok && (
          <span className="block text-xs text-tinta-suave">
            {puesta ? `Está puesta pero NO funciona. ${ayuda}` : "Falta en Vercel."}
          </span>
        )}
      </span>
    </li>
  );

  return (
    <section className="mb-8 rounded-2xl bg-white p-5 ring-1 ring-linea">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">Tarjeta en garantía</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            {online === null
              ? "Cargando…"
              : online
                ? "Online con Stripe: la cita se confirma cuando el paciente deja su tarjeta. No se cobra nada al reservar."
                : "Simulado: la cita se confirma sin pedir tarjeta. Solo para pruebas."}
          </p>
          {estado?.stripe && (
            <p className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${estado.stripe === "real" ? "bg-brand-50 text-brand-700" : "bg-ambar-50 text-ambar-700"}`}>
              Stripe en modo {estado.stripe === "real" ? "REAL (cobros de verdad)" : "de prueba (sin dinero real)"}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" disabled={guardando || online === false} onClick={() => void cambiar(false)} className={`rounded-xl px-4 py-2 text-sm font-medium ring-1 transition disabled:cursor-default ${online === false ? "bg-tinta text-white ring-tinta" : "bg-white ring-linea hover:bg-brand-50"}`}>
            Simulado
          </button>
          <button
            type="button"
            disabled={guardando || online === true || !listoParaOnline}
            onClick={() => void cambiar(true)}
            title={listoParaOnline ? undefined : "Falta configurar Stripe en Vercel"}
            className={`rounded-xl px-4 py-2 text-sm font-medium ring-1 transition disabled:cursor-not-allowed ${online ? "bg-brand-500 text-white ring-brand-500" : "bg-white ring-linea hover:bg-brand-50 disabled:opacity-50"}`}
          >
            Online
          </button>
        </div>
      </div>
      {estado && (
        <ul className="mt-4 space-y-2 border-t border-linea pt-4 text-sm">
          {fila(!!estado.stripe, estado.stripeConfigurado, "Clave de Stripe (STRIPE_SECRET_KEY)", "Debe empezar por sk_test_ (pruebas) o sk_live_ (real).")}
          {fila(estado.webhook, estado.webhookConfigurado, "Avisos de Stripe (STRIPE_WEBHOOK_SECRET)", "Debe empezar por whsec_.")}
          {fila(
            estado.claveSecretaSupabase,
            estado.claveSecretaConfigurada,
            "Clave secreta de Supabase (SUPABASE_SERVICE_ROLE_KEY)",
            "Debe ser la clave SECRETA (sb_secret_… o service_role), no la publishable."
          )}
        </ul>
      )}
    </section>
  );
}
