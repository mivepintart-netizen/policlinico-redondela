import Logo from "./Logo";
import { contacto, navegacion } from "@/lib/datos";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-brand-900 text-brand-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo claro />
            <p className="mt-4 text-sm text-brand-200">
              {contacto.direccion} · {contacto.codigoPostal} {contacto.localidad} ({contacto.provincia})
            </p>
          </div>
          <nav aria-label="Pie de página">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {navegacion.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-white">
                    {item.etiqueta}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/mi-zona" className="transition hover:text-white">
                  Mi zona
                </Link>
              </li>
              <li>
                <Link href="/reservar" className="transition hover:text-white">
                  Reservar cita
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-brand-300 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Policlínico Redondela. Todos los derechos reservados.</p>
          <p>
            Desarrollado por <span className="font-medium text-brand-100">MV Automatizaciones</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
