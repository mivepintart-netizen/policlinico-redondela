import Link from "next/link";
import {
  contacto,
  depositoMinimo,
  especialidades,
  formatoEuros,
  ticketHero,
} from "@/lib/datos";

function IconoCheck() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 10.5 3 3 7-7" />
    </svg>
  );
}

function TicketFisioterapia() {
  const esp = especialidades.find((e) => e.id === ticketHero.especialidadId)!;
  const resto = esp.precio - esp.deposito;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Brillo de fondo */}
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-brand-50 to-ambar-50 blur-2xl" aria-hidden="true" />

      <div className="rotate-[1.5deg] rounded-3xl bg-white shadow-ticket ring-1 ring-linea">
        {/* Cabecera del ticket */}
        <div className="flex items-start justify-between gap-4 p-6 pb-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-500">
              Próximos huecos
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">{esp.nombre}</h3>
            <p className="mt-0.5 text-sm text-tinta-suave">
              {ticketHero.profesional} · {esp.duracionMin} min
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
            {ticketHero.profesional
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </span>
        </div>

        {/* Huecos */}
        <ul className="grid grid-cols-2 gap-2 px-6">
          {ticketHero.huecos.map((h, i) => (
            <li key={`${h.dia}-${h.hora}`}>
              <span
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm ${
                  i === 0
                    ? "border-brand-500 bg-brand-500 text-white"
                    : "border-linea bg-fondo text-tinta"
                }`}
              >
                <span className={i === 0 ? "text-brand-100" : "text-tinta-tenue"}>{h.dia}</span>
                <span className="font-semibold tabular-nums">{h.hora}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Línea perforada */}
        <div className="relative my-6" aria-hidden="true">
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-fondo ring-1 ring-inset ring-linea [clip-path:inset(0_0_0_50%)]" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-fondo ring-1 ring-inset ring-linea [clip-path:inset(0_50%_0_0)]" />
          <div className="mx-6 border-t-2 border-dashed border-linea" />
        </div>

        {/* Desglose */}
        <dl className="space-y-2.5 px-6 pb-6 text-sm">
          <div className="flex justify-between">
            <dt className="text-tinta-suave">Precio de la sesión</dt>
            <dd className="font-medium tabular-nums">{formatoEuros(esp.precio)}</dd>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-ambar-50 px-3 py-2.5 -mx-3">
            <dt className="font-medium text-ambar-700">Anticipo hoy</dt>
            <dd className="text-lg font-semibold tabular-nums text-ambar-600">
              {formatoEuros(esp.deposito)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-suave">En la clínica</dt>
            <dd className="font-medium tabular-nums">{formatoEuros(resto)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function Hero() {
  const pills = [
    "Cancelación gratis hasta 24 h antes",
    `Anticipo desde ${formatoEuros(depositoMinimo)}`,
    "Reserva en 2 minutos",
  ];

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 lg:pb-24">
      {/* Fondo decorativo */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(60%_60%_at_80%_10%,#D2ECEE_0%,transparent_70%)]" aria-hidden="true" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Policlínico en Redondela, Pontevedra
          </p>

          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Tu cita en Redondela, <span className="text-brand-500">sin llamadas.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-tinta-suave">
            Elige especialidad, día y hora, y confirma con un pequeño anticipo. Siete
            especialidades en un mismo centro, en pleno centro de Redondela.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/reservar"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-600"
            >
              Reservar cita <span aria-hidden="true">→</span>
            </Link>
            <a
              href={contacto.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-linea bg-white px-6 py-3.5 text-base font-medium text-tinta transition hover:border-brand-200 hover:bg-brand-50"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-brand-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12Z" />
              </svg>
              Hablar con {contacto.recepcionista}
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-2">
            {pills.map((pill) => (
              <li
                key={pill}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-tinta-suave ring-1 ring-linea"
              >
                <span className="text-brand-500">
                  <IconoCheck />
                </span>
                {pill}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden lg:block">
          <TicketFisioterapia />
        </div>
      </div>
    </section>
  );
}
