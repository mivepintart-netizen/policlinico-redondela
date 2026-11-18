import { pasos } from "@/lib/datos";

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-500">
            Cómo funciona
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Reserva en cuatro pasos
          </h2>
          <p className="mt-4 text-lg text-tinta-suave">
            Sin registrarte y sin esperar al teléfono. Tardas menos que en hacer la llamada.
          </p>
        </div>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {pasos.map((paso, i) => (
            <li key={paso.titulo} className="relative">
              {/* Conector entre pasos (escritorio) */}
              {i < pasos.length - 1 && (
                <div
                  className="absolute left-14 right-0 top-6 hidden border-t-2 border-dashed border-brand-100 lg:block"
                  aria-hidden="true"
                />
              )}
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-lg font-semibold text-white shadow-sm">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{paso.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
