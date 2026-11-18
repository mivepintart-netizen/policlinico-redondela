"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { contacto } from "@/lib/datos";
import { mensajeError, supabaseNavegador } from "@/lib/supabase/cliente";

const claseInput =
  "w-full rounded-xl border border-linea bg-white px-3.5 py-3 text-base outline-none transition placeholder:text-tinta-tenue/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10";

export default function Acceso() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numeros = codigo.trim().toUpperCase().replace(/^RDN-?/, "");
    if (!/^\d{5}$/.test(numeros)) {
      setError("El código tiene este formato: RDN-12345. Lo encontrarás en el email de confirmación.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Escribe el email con el que hiciste la reserva.");
      return;
    }
    setBuscando(true);
    const { data: token, error: err } = await supabaseNavegador().rpc("buscar_reserva", {
      p_codigo: `RDN-${numeros}`,
      p_email: email.trim().toLowerCase(),
    });
    if (err) {
      setBuscando(false);
      setError(mensajeError(err));
      return;
    }
    if (!token) {
      setBuscando(false);
      setError("No encontramos ninguna cita con ese código y ese email. Revisa que coincidan con los del email de confirmación.");
      return;
    }
    router.push(`/mi-zona/cita/${token}`);
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-semibold tracking-tight">Mi cita</h1>
      <p className="mt-2 text-tinta-suave">Consulta, cambia o cancela tu cita sin necesidad de cuenta.</p>

      <form onSubmit={entrar} noValidate className="mt-8 rounded-2xl bg-white p-6 shadow-tarjeta ring-1 ring-linea sm:p-8">
        <div className="space-y-4">
          <div>
            <label htmlFor="codigo" className="mb-1.5 block text-sm font-medium">Código de reserva</label>
            <input
              id="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="RDN-12345"
              autoCapitalize="characters"
              autoComplete="off"
              className={`${claseInput} font-mono tracking-wide`}
            />
          </div>
          <div>
            <label htmlFor="email-acceso" className="mb-1.5 block text-sm font-medium">Email de la reserva</label>
            <input
              id="email-acceso"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className={claseInput}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={buscando}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:opacity-70"
        >
          {buscando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />}
          {buscando ? "Buscando tu cita…" : "Ver mi cita"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-tinta-suave">
        ¿No encuentras el código? Llámanos al{" "}
        <a href={`tel:${contacto.telefonoHref}`} className="font-medium text-brand-600">{contacto.telefono}</a> o escríbenos por{" "}
        <a href={contacto.whatsappHref} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600">WhatsApp</a>.
      </p>
    </div>
  );
}
