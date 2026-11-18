import { PASOS } from "./tipos";

export default function BarraPasos({
  paso,
  onIr,
}: {
  paso: number;
  onIr: (p: number) => void;
}) {
  return (
    <nav aria-label="Pasos de la reserva">
      {/* Móvil: texto + barra */}
      <div className="sm:hidden">
        <p className="text-sm text-tinta-suave">
          Paso {paso + 1} de {PASOS.length} ·{" "}
          <span className="font-semibold text-tinta">{PASOS[paso]}</span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Escritorio: pasos numerados */}
      <ol className="hidden items-center gap-2 sm:flex">
        {PASOS.map((nombre, i) => {
          const hecho = i < paso;
          const actual = i === paso;
          return (
            <li key={nombre} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!hecho}
                onClick={() => onIr(i)}
                aria-current={actual ? "step" : undefined}
                className="flex items-center gap-2 rounded-lg py-1 text-left disabled:cursor-default"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition ${
                    actual
                      ? "bg-brand-500 text-white ring-4 ring-brand-500/15"
                      : hecho
                        ? "bg-brand-100 text-brand-700"
                        : "bg-white text-tinta-tenue ring-1 ring-linea"
                  }`}
                >
                  {hecho ? (
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 10.5 3 3 7-7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`whitespace-nowrap text-sm ${
                    actual ? "font-semibold text-tinta" : hecho ? "text-tinta-suave hover:text-brand-600" : "text-tinta-tenue"
                  }`}
                >
                  {nombre}
                </span>
              </button>
              {i < PASOS.length - 1 && (
                <span className={`h-px flex-1 ${hecho ? "bg-brand-200" : "bg-linea"}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
