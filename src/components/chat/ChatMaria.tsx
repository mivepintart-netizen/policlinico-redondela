"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { responder, saludo, type Accion, type RespuestaBot } from "@/lib/chatbot";
import { contacto } from "@/lib/datos";

export const EVENTO_ABRIR_CHAT = "abrir-chat-maria";

type Mensaje = { de: "bot"; r: RespuestaBot } | { de: "yo"; texto: string };

const CLAVE = "rdn-chat";

function Avatar({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-semibold text-white ${
        grande ? "h-10 w-10 text-base" : "h-7 w-7 text-xs"
      }`}
      aria-hidden="true"
    >
      {contacto.recepcionista[0]}
    </span>
  );
}

export default function ChatMaria() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ de: "bot", r: saludo }]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [listo, setListo] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const lanzador = useRef<HTMLButtonElement>(null);

  // Recuperar la conversación de esta visita
  useEffect(() => {
    try {
      const v = sessionStorage.getItem(CLAVE);
      if (v) setMensajes(JSON.parse(v));
    } catch {
      /* sin almacenamiento */
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(mensajes.slice(-40)));
    } catch {
      /* sin almacenamiento */
    }
  }, [mensajes, listo]);

  // Abrir desde cualquier botón "Hablar con María"
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener(EVENTO_ABRIR_CHAT, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_CHAT, abrir);
  }, []);

  // Cerrar al cambiar de página en móvil (el chat ocupa toda la pantalla)
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setAbierto(false);
  }, [ruta]);

  useEffect(() => {
    if (!abierto) return;
    entrada.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        lanzador.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [abierto]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes, escribiendo, abierto]);

  const enviar = useCallback(
    (t: string) => {
      const limpio = t.trim();
      if (!limpio || escribiendo) return;
      setMensajes((m) => [...m, { de: "yo", texto: limpio }]);
      setTexto("");
      setEscribiendo(true);
      // Pequeña pausa para que parezca una conversación
      const pausa = 500 + Math.min(900, limpio.length * 15);
      setTimeout(() => {
        setMensajes((m) => [...m, { de: "bot", r: responder(limpio) }]);
        setEscribiendo(false);
      }, pausa);
    },
    [escribiendo]
  );

  const reiniciar = () => setMensajes([{ de: "bot", r: saludo }]);

  const ultimoBot = mensajes.reduce((idx, m, i) => (m.de === "bot" ? i : idx), -1);

  const boton = (a: Accion, i: number, activo: boolean) => {
    const clase =
      "rounded-full px-3 py-1.5 text-left text-sm font-medium ring-1 transition disabled:opacity-50";
    if (a.tipo === "mensaje") {
      return (
        <button
          key={i}
          type="button"
          disabled={!activo || escribiendo}
          onClick={() => enviar(a.texto)}
          className={`${clase} bg-white text-brand-600 ring-brand-200 hover:bg-brand-50`}
        >
          {a.texto}
        </button>
      );
    }
    const estilo = `${clase} bg-brand-500 text-white ring-brand-500 hover:bg-brand-600`;
    return a.externo ? (
      <a key={i} href={a.href} target={a.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={estilo}>
        {a.texto} {a.href.startsWith("http") && <span aria-hidden="true">↗</span>}
      </a>
    ) : (
      <Link key={i} href={a.href} className={estilo}>
        {a.texto} →
      </Link>
    );
  };

  return (
    <>
      {/* Lanzador */}
      {!abierto && (
        <button
          ref={lanzador}
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-brand-500 py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-ticket transition hover:bg-brand-600 sm:bottom-6 sm:right-6"
          aria-label={`Abrir chat con ${contacto.recepcionista}, asistente virtual`}
        >
          <span className="relative">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12Z" />
              </svg>
            </span>
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-brand-500" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">¿Dudas? Pregunta a {contacto.recepcionista}</span>
          <span className="sm:hidden">{contacto.recepcionista}</span>
        </button>
      )}

      {/* Ventana */}
      {abierto && (
        <div
          role="dialog"
          aria-label={`Chat con ${contacto.recepcionista}, asistente virtual`}
          className="fixed inset-0 z-[60] flex flex-col bg-fondo sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[380px] sm:overflow-hidden sm:rounded-3xl sm:shadow-ticket sm:ring-1 sm:ring-linea"
        >
          <header className="flex items-center gap-3 bg-brand-500 px-4 py-3 text-white">
            <Avatar grande />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{contacto.recepcionista}</p>
              <p className="flex items-center gap-1.5 text-xs text-brand-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                Asistente virtual
              </p>
            </div>
            <button type="button" onClick={reiniciar} className="rounded-lg px-2 py-1 text-xs text-brand-100 hover:bg-white/10 hover:text-white">
              Reiniciar
            </button>
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setTimeout(() => lanzador.current?.focus(), 0);
              }}
              aria-label="Cerrar chat"
              className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Conversación">
            <ul className="space-y-3">
              {mensajes.map((m, i) =>
                m.de === "yo" ? (
                  <li key={i} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-brand-500 px-3.5 py-2 text-sm text-white">{m.texto}</p>
                  </li>
                ) : (
                  <li key={i} className="flex gap-2">
                    <Avatar />
                    <div className="min-w-0 max-w-[85%]">
                      <p className="whitespace-pre-line rounded-2xl rounded-tl-md bg-white px-3.5 py-2 text-sm text-tinta ring-1 ring-linea">{m.r.texto}</p>
                      {m.r.acciones && m.r.acciones.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.r.acciones.map((a, j) => boton(a, j, i === ultimoBot))}
                        </div>
                      )}
                    </div>
                  </li>
                )
              )}
              {escribiendo && (
                <li className="flex gap-2" aria-label={`${contacto.recepcionista} está escribiendo`}>
                  <Avatar />
                  <p className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white px-3.5 py-3 ring-1 ring-linea">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-tinta-tenue" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </p>
                </li>
              )}
            </ul>
            <div ref={fin} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="border-t border-linea bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <label htmlFor="chat-texto" className="sr-only">Escribe tu mensaje</label>
              <input
                ref={entrada}
                id="chat-texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribe tu pregunta…"
                autoComplete="off"
                maxLength={300}
                className="min-w-0 flex-1 rounded-full border border-linea bg-fondo px-4 py-2.5 text-base outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 sm:text-sm"
              />
              <button
                type="submit"
                disabled={!texto.trim() || escribiendo}
                aria-label="Enviar"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-tinta-tenue">
              Asistente automático. No sustituye una consulta médica. Urgencias: 112.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
