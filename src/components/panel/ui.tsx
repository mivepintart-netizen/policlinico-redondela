"use client";

import { useEffect, useRef } from "react";
import { ESTADOS, type EstadoPanel } from "@/lib/panel";

export function BadgeEstado({ estado }: { estado: EstadoPanel }) {
  const e = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${e.clase}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} aria-hidden="true" />
      {e.texto}
    </span>
  );
}

export function Cabecera({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {texto && <p className="mt-1 text-sm text-tinta-suave">{texto}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Kpi({
  etiqueta,
  valor,
  detalle,
  acento = false,
}: {
  etiqueta: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  acento?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-linea">
      <p className="text-xs font-medium text-tinta-tenue">{etiqueta}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${acento ? "text-ambar-600" : ""}`}>{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-tinta-suave">{detalle}</p>}
    </div>
  );
}

export const btn = {
  primario:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50",
  secundario:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-tinta ring-1 ring-linea transition hover:bg-brand-50 hover:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50",
  peligro:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-50",
  fantasma:
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-tinta-suave transition hover:bg-brand-50 hover:text-tinta",
};

/** Campo de formulario (sin ancho: añadir w-full o w-auto según el caso). */
export const claseCampoBase =
  "rounded-xl border border-linea bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-tinta-tenue/70 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10";

export const claseCampo = `w-full ${claseCampoBase}`;

/** Panel lateral (en móvil ocupa toda la pantalla). */
export function Cajon({
  abierto,
  titulo,
  subtitulo,
  onCerrar,
  children,
  pie,
}: {
  abierto: boolean;
  titulo: string;
  subtitulo?: React.ReactNode;
  onCerrar: () => void;
  children: React.ReactNode;
  pie?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-tinta/30 backdrop-blur-[2px]" onClick={onCerrar}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col bg-fondo shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-linea bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight">{titulo}</h2>
            {subtitulo && <div className="mt-0.5 text-sm text-tinta-suave">{subtitulo}</div>}
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="-m-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-tinta-suave hover:bg-brand-50">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {pie && <div className="border-t border-linea bg-white px-5 py-4">{pie}</div>}
      </div>
    </div>
  );
}

/** Aviso flotante breve tras una acción. */
export function Toast({ texto, onCerrar }: { texto: string | null; onCerrar: () => void }) {
  useEffect(() => {
    if (!texto) return;
    const t = setTimeout(onCerrar, 3500);
    return () => clearTimeout(t);
  }, [texto, onCerrar]);
  if (!texto) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-tinta px-4 py-3 text-sm text-white shadow-lg">
      {texto}
    </div>
  );
}
