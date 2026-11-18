"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { fechaLarga, type Hueco } from "@/lib/agenda";
import { contacto, especialidades, formatoEuros, profesionales } from "@/lib/datos";
import {
  actualizar,
  dentroDePlazo,
  estadoEfectivo,
  momentoCita,
  porToken,
  type ReservaDemo,
} from "@/lib/reservasDemo";
import { PasoFecha } from "@/components/reserva/Pasos";
import { AvisoCancelacion } from "@/components/reserva/Resumen";
import { descargarIcs } from "./calendarioIcs";

type Aviso = { tipo: "ok" | "info"; texto: string } | null;

const ETIQUETAS = {
  confirmada: { texto: "Confirmada", clase: "bg-brand-50 text-brand-700 ring-brand-100" },
  cancelada: { texto: "Cancelada", clase: "bg-red-50 text-red-700 ring-red-100" },
  completada: { texto: "Realizada", clase: "bg-fondo text-tinta-suave ring-linea" },
} as const;

function Icono({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Ventana de confirmación de cancelación                              */
/* ------------------------------------------------------------------ */

function DialogoCancelar({
  reserva,
  conReembolso,
  deposito,
  onCerrar,
  onConfirmar,
}: {
  reserva: ReservaDemo;
  conReembolso: boolean;
  deposito: number;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  const botonCerrar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    botonCerrar.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-tinta/40 p-4 backdrop-blur-sm sm:items-center" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cancelar"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-ticket"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="titulo-cancelar" className="text-xl font-semibold tracking-tight">¿Cancelar tu cita?</h2>
        <p className="mt-2 text-sm text-tinta-suave">
          {fechaLarga(reserva.fecha)} a las {reserva.hora}. El hueco quedará libre para otra persona.
        </p>

        <div className={`mt-5 rounded-xl p-4 text-sm ${conReembolso ? "bg-brand-50 text-brand-800" : "bg-ambar-50 text-ambar-700"}`}>
          {conReembolso ? (
            <>
              Te devolveremos el anticipo de <strong className="font-semibold">{formatoEuros(deposito)}</strong> en 3–5
              días hábiles, por el mismo medio de pago.
            </>
          ) : (
            <>
              Faltan menos de 24 horas para tu cita:{" "}
              <strong className="font-semibold">el anticipo de {formatoEuros(deposito)} no se devuelve.</strong> Si es
              por una causa justificada, habla con {contacto.recepcionista}.
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={botonCerrar} type="button" onClick={onCerrar} className="rounded-xl px-5 py-3 font-medium text-tinta transition hover:bg-brand-50">
            No, mantener cita
          </button>
          <button type="button" onClick={onConfirmar} className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700">
            Sí, cancelar cita
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function DetalleCita({ token }: { token: string }) {
  const [ahora, setAhora] = useState<Date | null>(null);
  const [reserva, setReserva] = useState<ReservaDemo | null | undefined>(undefined);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [cancelando, setCancelando] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState<string | null>(null);
  const [nuevoHueco, setNuevoHueco] = useState<Hueco | null>(null);

  useEffect(() => {
    const n = new Date();
    setAhora(n);
    setReserva(porToken(token, n));
  }, [token]);

  const cerrarCancelar = useCallback(() => setCancelando(false), []);

  if (reserva === undefined || !ahora) {
    return <div className="mx-auto h-96 max-w-5xl animate-pulse rounded-2xl bg-white ring-1 ring-linea" />;
  }

  if (reserva === null) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">No encontramos esta cita</h1>
        <p className="mt-2 text-tinta-suave">
          El enlace no es válido o ha caducado. Prueba a entrar con tu código de reserva y tu email.
        </p>
        <Link href="/mi-zona" className="mt-6 inline-block rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600">
          Ir a Mi zona
        </Link>
      </div>
    );
  }

  const esp = especialidades.find((e) => e.id === reserva.especialidadId)!;
  const prof = profesionales.find((p) => p.id === reserva.profesionalId);
  const estado = estadoEfectivo(reserva, ahora);
  const enPlazo = dentroDePlazo(reserva, ahora);
  const activa = estado === "confirmada";

  const confirmarCancelacion = () => {
    const cambios = { estado: "cancelada" as const, reembolso: enPlazo };
    actualizar(reserva.token, cambios);
    setReserva({ ...reserva, ...cambios });
    setCancelando(false);
    setAviso({
      tipo: "info",
      texto: enPlazo
        ? `Cita cancelada. Te devolveremos ${formatoEuros(esp.deposito)} en 3–5 días hábiles.`
        : "Cita cancelada. Al ser con menos de 24 horas, el anticipo no se devuelve.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmarCambio = () => {
    if (!nuevaFecha || !nuevoHueco) return;
    const cambios = { fecha: nuevaFecha, hora: nuevoHueco.hora, profesionalId: nuevoHueco.profesionalId };
    actualizar(reserva.token, cambios);
    setReserva({ ...reserva, ...cambios });
    setCambiando(false);
    setNuevaFecha(null);
    setNuevoHueco(null);
    setAviso({
      tipo: "ok",
      texto: `Cita cambiada al ${fechaLarga(nuevaFecha).toLowerCase()} a las ${nuevoHueco.hora}. Te hemos enviado un email con los nuevos datos.`,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mismoHueco = nuevaFecha === reserva.fecha && nuevoHueco?.hora === reserva.hora;
  const etiqueta = ETIQUETAS[estado];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`
  )}`;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/mi-zona" className="text-sm font-medium text-tinta-suave transition hover:text-brand-600">
        ← Mi zona
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Hola, {reserva.paciente.nombre}</h1>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${etiqueta.clase}`}>{etiqueta.texto}</span>
      </div>
      <p className="mt-1 text-tinta-suave">
        Reserva <span className="font-mono font-medium text-tinta">{reserva.id}</span>
      </p>

      {aviso && (
        <div
          role="status"
          className={`mt-6 flex items-start justify-between gap-4 rounded-2xl p-4 text-sm ${
            aviso.tipo === "ok" ? "bg-brand-500 text-white" : "bg-tinta text-white"
          }`}
        >
          <p>{aviso.texto}</p>
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="-m-1 rounded-lg p-1 opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {cambiando ? (
        /* ---------- Cambiar día u hora ---------- */
        <section className="mt-8" aria-labelledby="titulo-cambio">
          <h2 id="titulo-cambio" className="text-xl font-semibold tracking-tight">Elige el nuevo día y hora</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Ahora: {fechaLarga(reserva.fecha)} a las {reserva.hora}
            {prof && <> con {prof.nombre}</>}. El anticipo pagado se mantiene.
          </p>
          <div className="mt-6">
            <PasoFecha
              encabezado={false}
              ahora={ahora}
              especialidadId={esp.id}
              profesionalId={reserva.profesionalId}
              fecha={nuevaFecha}
              hueco={nuevoHueco}
              onFecha={(iso) => {
                setNuevaFecha(iso);
                setNuevoHueco(null);
              }}
              onHueco={setNuevoHueco}
            />
          </div>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-linea pt-6 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => {
                setCambiando(false);
                setNuevaFecha(null);
                setNuevoHueco(null);
              }}
              className="rounded-xl px-5 py-3 font-medium text-tinta-suave transition hover:bg-brand-50 hover:text-tinta"
            >
              Cancelar el cambio
            </button>
            <button
              type="button"
              onClick={confirmarCambio}
              disabled={!nuevoHueco || mismoHueco}
              className="rounded-xl bg-brand-500 px-6 py-3.5 font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-tinta-tenue/40 disabled:shadow-none"
            >
              {nuevoHueco && !mismoHueco
                ? `Cambiar al ${fechaLarga(nuevaFecha!).toLowerCase()} · ${nuevoHueco.hora}`
                : "Confirmar cambio"}
            </button>
          </div>
        </section>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ---------- Ficha de la cita ---------- */}
          <article className={`overflow-hidden rounded-3xl bg-white shadow-tarjeta ring-1 ring-linea ${estado === "cancelada" ? "opacity-80" : ""}`}>
            <div className="border-b border-linea p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-500">Tu cita</p>
              <h2 className={`mt-1 text-2xl font-semibold tracking-tight ${estado === "cancelada" ? "line-through decoration-tinta-tenue" : ""}`}>
                {esp.nombre}
              </h2>
            </div>

            <dl className="grid gap-x-6 gap-y-5 p-6 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-tinta-tenue">Día</dt>
                <dd className="mt-0.5 text-base font-semibold">{fechaLarga(reserva.fecha)}</dd>
              </div>
              <div>
                <dt className="text-tinta-tenue">Hora</dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums">
                  {reserva.hora} <span className="font-normal text-tinta-suave">· {esp.duracionMin} min</span>
                </dd>
              </div>
              <div>
                <dt className="text-tinta-tenue">Profesional</dt>
                <dd className="mt-0.5 font-medium">{prof?.nombre ?? "—"}</dd>
                {prof && <dd className="text-tinta-suave">{prof.rol}</dd>}
              </div>
              <div>
                <dt className="text-tinta-tenue">Dónde</dt>
                <dd className="mt-0.5 font-medium">{contacto.direccion}</dd>
                <dd className="text-tinta-suave">{contacto.codigoPostal} {contacto.localidad}</dd>
              </div>
            </dl>

            <div className="mx-6 border-t-2 border-dashed border-linea" aria-hidden="true" />

            <dl className="grid grid-cols-2 gap-3 p-6 text-sm">
              <div className="rounded-xl bg-ambar-50 p-3">
                <dt className="text-ambar-700">Anticipo pagado</dt>
                <dd className="text-xl font-semibold tabular-nums text-ambar-600">{formatoEuros(esp.deposito)}</dd>
                {estado === "cancelada" && (
                  <dd className="mt-1 text-xs text-ambar-700">{reserva.reembolso ? "Reembolsado" : "No reembolsable"}</dd>
                )}
              </div>
              <div className="rounded-xl bg-fondo p-3">
                <dt className="text-tinta-suave">{estado === "cancelada" ? "Ya no tienes que pagar" : "A pagar en la clínica"}</dt>
                <dd className={`text-xl font-semibold tabular-nums ${estado === "cancelada" ? "text-tinta-tenue line-through" : ""}`}>
                  {formatoEuros(esp.precio - esp.deposito)}
                </dd>
              </div>
            </dl>

            {activa && (
              <p className="flex gap-2 border-t border-linea px-6 py-4 text-sm text-tinta-suave">
                <span className="text-brand-500">
                  <Icono>
                    <path d="M12 3 5 6v5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-3Z" />
                  </Icono>
                </span>
                <span>
                  <AvisoCancelacion fecha={reserva.fecha} hora={reserva.hora} />
                </span>
              </p>
            )}
          </article>

          {/* ---------- Acciones ---------- */}
          <aside className="space-y-4">
            {activa ? (
              <div className="rounded-2xl bg-white p-2 ring-1 ring-linea">
                <ul className="divide-y divide-linea">
                  <li>
                    {enPlazo ? (
                      <button type="button" onClick={() => setCambiando(true)} className="flex w-full items-center gap-3 rounded-xl p-4 text-left transition hover:bg-brand-50">
                        <span className="text-brand-500">
                          <Icono>
                            <rect x="3" y="4.5" width="18" height="16" rx="2" />
                            <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
                          </Icono>
                        </span>
                        <span>
                          <span className="block font-semibold">Cambiar día u hora</span>
                          <span className="block text-sm text-tinta-tenue">Sin coste</span>
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 p-4 text-tinta-tenue">
                        <Icono>
                          <rect x="3" y="4.5" width="18" height="16" rx="2" />
                          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
                        </Icono>
                        <span>
                          <span className="block font-semibold">Cambiar día u hora</span>
                          <span className="block text-sm">Con menos de 24 h, llama a {contacto.recepcionista}</span>
                        </span>
                      </div>
                    )}
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        descargarIcs({
                          id: reserva.id,
                          titulo: `${esp.nombre} · Policlínico Redondela`,
                          inicio: momentoCita(reserva),
                          duracionMin: esp.duracionMin,
                          descripcion: `Reserva ${reserva.id}${prof ? ` con ${prof.nombre}` : ""}. Pendiente de pago en la clínica: ${formatoEuros(esp.precio - esp.deposito)}.`,
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-xl p-4 text-left transition hover:bg-brand-50"
                    >
                      <span className="text-brand-500">
                        <Icono>
                          <rect x="3" y="4.5" width="18" height="16" rx="2" />
                          <path d="M3 9.5h18M12 13v5M9.5 15.5h5" />
                        </Icono>
                      </span>
                      <span>
                        <span className="block font-semibold">Añadir a mi calendario</span>
                        <span className="block text-sm text-tinta-tenue">Google, Apple u Outlook</span>
                      </span>
                    </button>
                  </li>
                  <li>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl p-4 transition hover:bg-brand-50">
                      <span className="text-brand-500">
                        <Icono>
                          <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
                          <circle cx="12" cy="9.5" r="2.5" />
                        </Icono>
                      </span>
                      <span>
                        <span className="block font-semibold">Cómo llegar</span>
                        <span className="block text-sm text-tinta-tenue">Abrir en Google Maps</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <button type="button" onClick={() => setCancelando(true)} className="flex w-full items-center gap-3 rounded-xl p-4 text-left text-red-700 transition hover:bg-red-50">
                      <Icono>
                        <circle cx="12" cy="12" r="9" />
                        <path d="m9 9 6 6M15 9l-6 6" />
                      </Icono>
                      <span>
                        <span className="block font-semibold">Cancelar cita</span>
                        <span className="block text-sm text-red-700/70">
                          {enPlazo ? `Te devolvemos ${formatoEuros(esp.deposito)}` : "Sin reembolso del anticipo"}
                        </span>
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-6 ring-1 ring-linea">
                <p className="font-semibold">
                  {estado === "cancelada" ? "Esta cita está cancelada" : "Esta cita ya se realizó"}
                </p>
                <p className="mt-1 text-sm text-tinta-suave">
                  {estado === "cancelada"
                    ? reserva.reembolso
                      ? `El anticipo de ${formatoEuros(esp.deposito)} se devuelve en 3–5 días hábiles.`
                      : "Se canceló con menos de 24 horas, así que el anticipo no se devolvió."
                    : "Esperamos que todo fuera bien. ¿Necesitas otra cita?"}
                </p>
                <Link
                  href={`/reservar?especialidad=${esp.id}`}
                  className="mt-4 inline-flex w-full justify-center rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white transition hover:bg-brand-600"
                >
                  Reservar {estado === "cancelada" ? "otra" : "de nuevo"}
                </Link>
              </div>
            )}

            <div className="rounded-2xl bg-white p-5 text-sm ring-1 ring-linea">
              <p className="font-semibold">¿Alguna duda?</p>
              <p className="mt-1 text-tinta-suave">Habla con {contacto.recepcionista} en recepción.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={contacto.whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand-50 px-3 py-2 font-semibold text-brand-600 transition hover:bg-brand-100">
                  WhatsApp
                </a>
                <a href={`tel:${contacto.telefonoHref}`} className="rounded-lg bg-brand-50 px-3 py-2 font-semibold text-brand-600 transition hover:bg-brand-100">
                  {contacto.telefono}
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}

      {cancelando && (
        <DialogoCancelar
          reserva={reserva}
          conReembolso={enPlazo}
          deposito={esp.deposito}
          onCerrar={cerrarCancelar}
          onConfirmar={confirmarCancelacion}
        />
      )}
    </div>
  );
}
