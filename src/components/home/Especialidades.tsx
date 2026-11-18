import Link from "next/link";
import IlustracionEspecialidad from "@/components/IlustracionEspecialidad";
import { contacto, especialidades, formatoEuros } from "@/lib/datos";

export default function Especialidades() {
  return (
    <section id="especialidades" className="py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Especialidades
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Todo lo que necesitas, en un mismo centro
          </h2>
          <p className="mt-4 text-lg text-tinta-suave">
            Precios claros desde el principio. Sabes lo que pagas antes de reservar.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {especialidades.map((esp) => (
            <li
              key={esp.id}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-linea transition hover:-translate-y-0.5 hover:ring-brand-200"
            >
              <IlustracionEspecialidad id={esp.id} className="h-36" />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-semibold tracking-tight">{esp.nombre}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-tinta-suave">
                  {esp.descripcionCorta}
                </p>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-linea pt-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-tinta-tenue">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                        <circle cx="10" cy="10" r="7.5" />
                        <path d="M10 6v4l2.5 2" />
                      </svg>
                      {esp.duracionMin} min
                    </p>
                    <p className="mt-0.5 text-xl font-semibold tabular-nums">
                      {formatoEuros(esp.precio)}
                    </p>
                  </div>
                  <Link
                    href={`/reservar?especialidad=${esp.id}`}
                    className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white"
                    aria-label={`Reservar ${esp.nombre}`}
                  >
                    Reservar
                  </Link>
                </div>
              </div>
            </li>
          ))}

          {/* Tarjeta de ayuda: completa la cuadrícula */}
          <li className="flex flex-col justify-between rounded-2xl bg-brand-500 p-6 text-white shadow-tarjeta sm:col-span-2 lg:col-span-2">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                ¿No sabes qué especialidad elegir?
              </h3>
              <p className="mt-2 max-w-md text-brand-100">
                Cuéntale a {contacto.recepcionista} qué te pasa y te orienta hacia el
                profesional adecuado. Sin compromiso.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={contacto.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
              >
                Hablar con {contacto.recepcionista}
              </a>
              <a
                href={`tel:${contacto.telefonoHref}`}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10"
              >
                Llamar al {contacto.telefono}
              </a>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}
