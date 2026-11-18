"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconoCruz } from "@/components/Logo";
import { usePanel } from "./PanelProvider";

type Item = { href: string; texto: string; soloAdmin?: boolean; icono: React.ReactNode };

const MENU: Item[] = [
  { href: "/panel", texto: "Agenda", icono: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></> },
  { href: "/panel/reservas", texto: "Reservas", icono: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></> },
  { href: "/panel/profesionales", texto: "Profesionales", soloAdmin: true, icono: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></> },
  { href: "/panel/especialidades", texto: "Especialidades y precios", soloAdmin: true, icono: <><path d="M20 12.5 12.5 20a2 2 0 0 1-2.8 0L3 13.3V3h10.3l6.7 6.7a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></> },
  { href: "/panel/festivos", texto: "Festivos", icono: <><path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" /><circle cx="12" cy="12" r="4" /></> },
];

function Icono({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const { listo, sesion, cerrarSesion } = usePanel();
  const router = useRouter();
  const ruta = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const saliendo = useRef(false);

  useEffect(() => {
    if (!listo || sesion) return;
    // Al cerrar sesión no hace falta recordar la página para volver
    router.replace(saliendo.current ? "/panel/login" : `/panel/login?volver=${encodeURIComponent(ruta)}`);
  }, [listo, sesion, router, ruta]);

  useEffect(() => setMenuAbierto(false), [ruta]);

  const items = MENU.filter((i) => !i.soloAdmin || sesion?.rol === "admin");
  const item = MENU.find((i) => (i.href === "/panel" ? ruta === "/panel" : ruta.startsWith(i.href)));
  const permitido = !item?.soloAdmin || sesion?.rol === "admin";

  if (!listo || !sesion) {
    return <div className="grid min-h-screen place-items-center text-sm text-tinta-tenue">Cargando…</div>;
  }

  const navegacion = (
    <nav aria-label="Panel" className="flex flex-1 flex-col gap-1 p-3">
      {items.map((i) => {
        const activo = i === item;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={activo ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              activo ? "bg-white/10 text-white" : "text-brand-100 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icono>{i.icono}</Icono>
            {i.texto}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-white/10 pt-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">
            {sesion.nombre[0]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{sesion.nombre}</span>
            <span className="block text-xs capitalize text-brand-200">{sesion.rol}</span>
          </span>
        </div>
        <Link href="/reservar" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-brand-100 transition hover:bg-white/5 hover:text-white">
          <Icono><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Icono>
          Ver página de reserva
        </Link>
        <button
          type="button"
          onClick={() => {
            saliendo.current = true;
            void cerrarSesion();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-brand-100 transition hover:bg-white/5 hover:text-white"
        >
          <Icono><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" /></Icono>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );

  const marca = (
    <Link href="/panel" className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white">
        <IconoCruz className="h-4 w-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-white">Policlínico Redondela</span>
        <span className="block text-xs text-brand-200">Panel de gestión</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-brand-900 lg:flex">
        <div className="px-5 py-5">{marca}</div>
        {navegacion}
      </aside>

      {/* Barra superior (móvil) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-brand-900 px-4 lg:hidden">
        {marca}
        <button
          type="button"
          onClick={() => setMenuAbierto((v) => !v)}
          aria-expanded={menuAbierto}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          className="grid h-10 w-10 place-items-center rounded-lg text-white hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>
      {menuAbierto && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-brand-900 lg:hidden">{navegacion}</div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {permitido ? (
          children
        ) : (
          <div className="mx-auto max-w-md py-16 text-center">
            <h1 className="text-xl font-semibold">Sin permiso</h1>
            <p className="mt-2 text-sm text-tinta-suave">Esta sección solo está disponible para administradores.</p>
            <Link href="/panel" className="mt-6 inline-block text-sm font-semibold text-brand-600">Volver a la agenda</Link>
          </div>
        )}
      </main>
    </div>
  );
}
