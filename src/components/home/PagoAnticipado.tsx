import { ejemploAnticipo, faqAnticipo, formatoEuros } from "@/lib/datos";

export default function PagoAnticipado() {
  const { total, ahora, enCentro } = ejemploAnticipo;
  const porcentaje = Math.round((ahora / total) * 100);

  return (
    <section id="pago-anticipado" className="py-16 lg:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Pago anticipado
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Confirmas con una parte, el resto en la clínica
          </h2>
          <p className="mt-4 text-lg text-tinta-suave">
            Al reservar pagas solo un anticipo. Así guardamos tu hueco y evitamos citas
            vacías. Si cancelas con más de 24 horas, te lo devolvemos entero.
          </p>

          {/* Desglose de ejemplo */}
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-tarjeta ring-1 ring-linea">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium text-tinta-suave">Ejemplo: consulta de nutrición</p>
              <p className="text-2xl font-semibold tabular-nums">{formatoEuros(total)}</p>
            </div>

            <div
              className="mt-5 flex h-3 overflow-hidden rounded-full bg-brand-100"
              role="img"
              aria-label={`${formatoEuros(ahora)} ahora y ${formatoEuros(enCentro)} en el centro`}
            >
              <div className="bg-ambar-500" style={{ width: `${porcentaje}%` }} />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-ambar-50 p-4">
                <dt className="flex items-center gap-2 text-sm font-medium text-ambar-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-ambar-500" />
                  Ahora, online
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ambar-600">
                  {formatoEuros(ahora)}
                </dd>
              </div>
              <div className="rounded-xl bg-brand-50 p-4">
                <dt className="flex items-center gap-2 text-sm font-medium text-brand-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-200" />
                  En el centro
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-tinta">
                  {formatoEuros(enCentro)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold tracking-tight lg:mt-9">Preguntas frecuentes</h3>
          <div className="mt-4 divide-y divide-linea rounded-2xl bg-white ring-1 ring-linea">
            {faqAnticipo.map((item, i) => (
              <details key={item.pregunta} className="group" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition hover:text-brand-600 [&::-webkit-details-marker]:hidden">
                  {item.pregunta}
                  <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-tinta-tenue transition group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-tinta-suave">{item.respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
