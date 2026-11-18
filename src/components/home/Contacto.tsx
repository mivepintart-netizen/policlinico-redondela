import { contacto } from "@/lib/datos";

function MapaEsquematico() {
  return (
    <div className="relative h-full min-h-[280px] overflow-hidden rounded-2xl bg-[#EAF3F1] ring-1 ring-linea">
      <svg
        viewBox="0 0 400 320"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`Mapa esquemático: el policlínico está en ${contacto.direccion}, ${contacto.localidad}`}
      >
        {/* Ría */}
        <path d="M0 250 C 80 230, 140 270, 220 255 S 360 230, 400 245 V320 H0Z" fill="#CFE6EA" />
        <text x="320" y="292" fontSize="11" fill="#6FBDC5" fontStyle="italic">Ría de Vigo</text>

        {/* Manzanas */}
        <g fill="#FFFFFF" opacity="0.9">
          <rect x="20" y="20" width="90" height="60" rx="6" />
          <rect x="130" y="20" width="110" height="60" rx="6" />
          <rect x="260" y="20" width="120" height="60" rx="6" />
          <rect x="20" y="105" width="90" height="70" rx="6" />
          <rect x="260" y="105" width="120" height="70" rx="6" />
          <rect x="20" y="195" width="140" height="30" rx="6" />
          <rect x="260" y="195" width="120" height="30" rx="6" />
        </g>

        {/* Calles */}
        <g stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" fill="none">
          <path d="M0 92 H400" />
          <path d="M120 0 V240" />
          <path d="M250 0 V240" />
        </g>

        {/* Viaducto */}
        <path d="M0 185 H400" stroke="#A6D8DD" strokeWidth="8" />
        <g stroke="#A6D8DD" strokeWidth="3">
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M${20 + i * 45} 189 V205`} />
          ))}
        </g>
        <text x="300" y="180" fontSize="10" fill="#3A9EA9">Viaducto</text>

        {/* Bloque del policlínico */}
        <rect x="130" y="105" width="110" height="70" rx="8" fill="#D2ECEE" />
        <text x="185" y="88" fontSize="10" fill="#4A6670" textAnchor="middle">Rúa do Viaduto</text>
      </svg>

      {/* Marcador */}
      <div className="absolute left-[46%] top-[44%] -translate-x-1/2 -translate-y-full">
        <div className="flex flex-col items-center">
          <span className="whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-xs font-semibold shadow-tarjeta ring-1 ring-linea">
            Policlínico Redondela
          </span>
          <span className="mt-1 grid h-9 w-9 place-items-center rounded-full bg-brand-500 text-white shadow-lg ring-4 ring-brand-500/20">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V9h5.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H15v5.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 20.5V15H3.5A1.5 1.5 0 0 1 2 13.5v-3A1.5 1.5 0 0 1 3.5 9H9V3.5Z" />
            </svg>
          </span>
        </div>
      </div>

      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-brand-600 shadow-tarjeta ring-1 ring-linea transition hover:bg-brand-50"
      >
        Abrir en Google Maps ↗
      </a>
    </div>
  );
}

function Dato({
  icono,
  titulo,
  children,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icono}
        </svg>
      </span>
      <div>
        <p className="text-sm font-medium text-tinta-tenue">{titulo}</p>
        <div className="mt-0.5 text-tinta">{children}</div>
      </div>
    </div>
  );
}

export default function Contacto() {
  return (
    <section id="contacto" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">Contacto</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Ven a vernos o escríbenos
          </h2>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <Dato
              titulo="Dirección"
              icono={
                <>
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </>
              }
            >
              <address className="not-italic">
                {contacto.direccion}
                <br />
                {contacto.codigoPostal} {contacto.localidad} ({contacto.provincia})
              </address>
            </Dato>

            <Dato
              titulo="Teléfono"
              icono={<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />}
            >
              <a href={`tel:${contacto.telefonoHref}`} className="font-medium hover:text-brand-600">
                {contacto.telefono}
              </a>
            </Dato>

            <Dato
              titulo="Email"
              icono={
                <>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </>
              }
            >
              <a href={`mailto:${contacto.email}`} className="font-medium hover:text-brand-600">
                {contacto.email}
              </a>
            </Dato>

            <Dato
              titulo="Horario"
              icono={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </>
              }
            >
              <dl className="space-y-1 text-sm">
                {contacto.horarios.map((h) => (
                  <div key={h.dias} className="flex flex-wrap gap-x-3">
                    <dt className="w-40 text-tinta-suave">{h.dias}</dt>
                    <dd className="font-medium tabular-nums">{h.horas}</dd>
                  </div>
                ))}
              </dl>
            </Dato>
          </div>

          <MapaEsquematico />
        </div>
      </div>
    </section>
  );
}
