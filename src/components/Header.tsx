import Link from "next/link";
import Logo from "./Logo";
import { contacto } from "@/lib/datos";

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-linea/80 bg-fondo/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href={`tel:${contacto.telefonoHref}`}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-tinta-suave transition hover:bg-brand-50 hover:text-tinta sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
            </svg>
            {contacto.telefono}
          </a>
          <Link
            href="/mi-zona"
            className="rounded-lg px-3 py-2 text-sm font-medium text-tinta transition hover:bg-brand-50"
          >
            Mi cita
          </Link>
        </div>
      </div>
    </header>
  );
}
