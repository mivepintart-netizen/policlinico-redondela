"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { contacto } from "@/lib/datos";
import { accesosDemo, buscar } from "@/lib/reservasDemo";

const claseInput =
  "w-full rounded-xl border border-linea bg-white px-3.5 py-3 text-base outline-none transition placeholder:text-tinta-tenue/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10";

export default function Acceso() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [emailEnlace, setEmailEnlace] = useState("");
  const [enlaceEnviado, setEnlaceEnviado] = useState(false);

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^(RDN-?)?\d{5}$/i.test(codigo.trim())) {
      setError("El código tiene este formato: RDN-12345. Lo encontrarás en el email de confirmación.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Escribe el email con el que hiciste la reserva.");
      return;
    }
    setBuscando(true);
    // Pequeña espera para simular la consulta
    setTimeout(() => {
      const r = buscar(codigo, email);
      if (r) {
        router.push(`/mi-zona/cita/${r.token}`);
      } else {
        setBuscando(false);
        setError("No encontramos ninguna cita con ese código y ese email. Revisa que coincidan con los del email de confirmación.");
      }
    }, 500);
  };

  const enviarEnlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEnlace.trim())) return;
    setEnlaceEnviado(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">Mi zona</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Gestiona tu cita</h1>
        <p className="mt-3 text-lg text-tinta-suave">
          Sin cuentas ni contraseñas. Consulta, cambia o cancela tu cita con el código de reserva.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Acceso con código + email */}
        <form onSubmit={entrar} noValidate className="rounded-2xl bg-white p-6 shadow-tarjeta ring-1 ring-linea sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Accede con tu código</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Están en el email que te enviamos al reservar.
          </p>

          <div className="mt-6 space-y-4">
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

        <div className="space-y-6">
          {/* Reenvío del enlace */}
          <div className="rounded-2xl bg-white p-6 ring-1 ring-linea">
            <h2 className="font-semibold tracking-tight">¿No encuentras el código?</h2>
            {enlaceEnviado ? (
              <p role="status" className="mt-3 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
                Si hay citas asociadas a <strong className="font-medium">{emailEnlace}</strong>, te llegará un email con el
                enlace para gestionarlas. Revisa también la carpeta de spam.
              </p>
            ) : (
              <form onSubmit={enviarEnlace} noValidate className="mt-3">
                <p className="text-sm text-tinta-suave">Te reenviamos el enlace de tus citas a tu email.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="email-enlace" className="sr-only">Tu email</label>
                  <input
                    id="email-enlace"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={emailEnlace}
                    onChange={(e) => setEmailEnlace(e.target.value)}
                    placeholder="tu@email.com"
                    className={`${claseInput} py-2.5`}
                  />
                  <button type="submit" className="shrink-0 rounded-xl border border-linea bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:border-brand-200 hover:bg-brand-50">
                    Enviar enlace
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-2xl bg-white p-6 ring-1 ring-linea">
            <h2 className="font-semibold tracking-tight">¿Prefieres hablar con alguien?</h2>
            <p className="mt-1 text-sm text-tinta-suave">{contacto.recepcionista} te ayuda a cambiar o cancelar tu cita.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={contacto.whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-100">
                WhatsApp
              </a>
              <a href={`tel:${contacto.telefonoHref}`} className="rounded-lg bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-100">
                {contacto.telefono}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Solo en la versión de prueba */}
      <div className="mt-10 rounded-2xl border border-dashed border-ambar-500/40 bg-ambar-50/50 p-5">
        <p className="text-sm font-semibold text-ambar-700">Versión de prueba · citas de ejemplo</p>
        <p className="mt-1 text-sm text-tinta-suave">Pulsa una para rellenar el formulario.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {accesosDemo.map((a) => (
            <li key={a.codigo}>
              <button
                type="button"
                onClick={() => {
                  setCodigo(a.codigo);
                  setEmail(a.email);
                  setError(null);
                }}
                className="rounded-lg bg-white px-3 py-2 text-left text-sm ring-1 ring-linea transition hover:ring-brand-300"
              >
                <span className="font-mono font-semibold">{a.codigo}</span>
                <span className="text-tinta-tenue"> · {a.descripcion}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
