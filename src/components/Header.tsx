"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { navegacion } from "@/lib/datos";

export default function Header() {
  const [abierto, setAbierto] = useState(false);

  // Cerrar el menú con Escape y bloquear el scroll mientras está abierto
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-linea/80 bg-fondo/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navegacion.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-tinta-suave transition hover:bg-brand-50 hover:text-brand-600"
                >
                  {item.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/mi-zona"
            className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-tinta transition hover:bg-brand-50 sm:inline-flex"
          >
            Mi zona
          </Link>
          <Link
            href="/reservar"
            className="hidden rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 sm:inline-flex"
          >
            Reservar cita
          </Link>

          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="grid h-10 w-10 place-items-center rounded-lg text-tinta transition hover:bg-brand-50 lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              {abierto ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      <div
        id="menu-movil"
        hidden={!abierto}
        className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-linea bg-fondo lg:hidden"
      >
        <nav aria-label="Móvil" className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <ul className="space-y-1">
            {navegacion.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setAbierto(false)}
                  className="block rounded-xl px-4 py-3.5 text-base font-medium text-tinta transition hover:bg-brand-50"
                >
                  {item.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3 border-t border-linea pt-6">
            <Link
              href="/reservar"
              onClick={() => setAbierto(false)}
              className="rounded-xl bg-brand-500 px-4 py-3.5 text-center text-base font-semibold text-white transition hover:bg-brand-600"
            >
              Reservar cita
            </Link>
            <Link
              href="/mi-zona"
              onClick={() => setAbierto(false)}
              className="rounded-xl border border-linea bg-white px-4 py-3.5 text-center text-base font-medium text-tinta transition hover:border-brand-200"
            >
              Mi zona
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
