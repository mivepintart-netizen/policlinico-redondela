import { fechaLarga, desdeISO, sumarDias } from "@/lib/agenda";
import { formatoEuros } from "@/lib/datos";
import { useCatalogo } from "@/components/CatalogoProvider";
import type { EstadoReserva } from "./tipos";

/**
 * Fecha y hora límite para cancelar gratis (24 h antes de la cita).
 * Devuelve null si la cita es dentro de menos de 24 h (ya no es reembolsable).
 */
export function limiteCancelacion(fecha: string, hora: string, ahora = new Date()) {
  const [h, m] = hora.split(":").map(Number);
  const limite = sumarDias(desdeISO(fecha), -1);
  limite.setHours(h, m, 0, 0);
  if (limite <= ahora) return null;
  const s = limite.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return `${s} a las ${hora}`;
}

/** Texto de la política de cancelación para una cita concreta. */
export function AvisoCancelacion({ fecha, hora }: { fecha: string; hora: string }) {
  const limite = limiteCancelacion(fecha, hora);
  return limite ? (
    <>
      Cancelación gratuita hasta el <strong className="font-medium text-tinta">{limite}</strong>.
    </>
  ) : (
    <>
      <strong className="font-medium text-ambar-700">Tu cita es dentro de menos de 24 horas.</strong> Si la
      cancelas, el anticipo no se devuelve.
    </>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-tinta-tenue">{etiqueta}</dt>
      <dd className="text-right font-medium">{valor}</dd>
    </div>
  );
}

export default function Resumen({ estado }: { estado: EstadoReserva }) {
  const { especialidades, profesionales } = useCatalogo();
  const esp = especialidades.find((e) => e.id === estado.especialidadId);
  const profId = estado.hueco?.profesionalId ?? estado.profesionalId;
  const prof = profesionales.find((p) => p.id === profId);
  const pendiente = <span className="font-normal text-tinta-tenue">—</span>;

  if (!esp) {
    return (
      <div className="rounded-2xl border border-dashed border-linea p-6 text-center text-sm text-tinta-tenue">
        Elige una especialidad para ver el resumen de tu cita.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-tarjeta ring-1 ring-linea">
      <div className="border-b border-linea p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-500">Tu cita</p>
        <p className="mt-1 text-lg font-semibold tracking-tight">{esp.nombre}</p>
        <p className="text-sm text-tinta-suave">{esp.duracionMin} minutos</p>
      </div>

      <dl className="divide-y divide-linea px-5 text-sm">
        <Fila
          etiqueta="Profesional"
          valor={
            prof
              ? prof.nombre
              : estado.profesionalId === null
                ? "El primero disponible"
                : pendiente
          }
        />
        <Fila etiqueta="Día" valor={estado.fecha ? fechaLarga(estado.fecha) : pendiente} />
        <Fila etiqueta="Hora" valor={estado.hueco ? estado.hueco.hora : pendiente} />
      </dl>

      <dl className="space-y-2 border-t border-linea bg-fondo/60 p-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-tinta-suave">Precio total</dt>
          <dd className="font-medium tabular-nums">{formatoEuros(esp.precio)}</dd>
        </div>
        <div className="-mx-2 flex items-center justify-between rounded-lg bg-ambar-50 px-2 py-2">
          <dt className="font-medium text-ambar-700">Anticipo ahora</dt>
          <dd className="text-lg font-semibold tabular-nums text-ambar-600">
            {formatoEuros(esp.deposito)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-tinta-suave">En la clínica</dt>
          <dd className="font-medium tabular-nums">{formatoEuros(esp.precio - esp.deposito)}</dd>
        </div>
      </dl>

      {estado.fecha && estado.hueco && (
        <p className="flex gap-2 border-t border-linea p-5 text-xs leading-relaxed text-tinta-suave">
          <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 2.5 3.5 5v4.5c0 4 2.8 7 6.5 8 3.7-1 6.5-4 6.5-8V5L10 2.5Z" />
            <path d="m7 10 2 2 4-4" />
          </svg>
          <span>
            <AvisoCancelacion fecha={estado.fecha} hora={estado.hueco.hora} />
          </span>
        </p>
      )}
    </div>
  );
}
