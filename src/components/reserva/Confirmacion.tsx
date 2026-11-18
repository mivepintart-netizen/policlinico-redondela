import Link from "next/link";
import { fechaLarga } from "@/lib/agenda";
import { contacto, especialidades, formatoEuros, profesionales } from "@/lib/datos";
import { AvisoCancelacion } from "./Resumen";
import type { EstadoReserva } from "./tipos";

export default function Confirmacion({
  estado,
  codigo,
  token,
}: {
  estado: EstadoReserva;
  codigo: string;
  token: string | null;
}) {
  const esp = especialidades.find((e) => e.id === estado.especialidadId)!;
  const prof = profesionales.find((p) => p.id === estado.hueco!.profesionalId)!;
  const { fecha, hueco, datos } = estado;

  return (
    <div className="mx-auto max-w-xl text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white ring-8 ring-brand-500/15">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">¡Cita confirmada!</h1>
      <p className="mt-2 text-tinta-suave">
        Hemos enviado los detalles a <strong className="font-medium text-tinta">{datos.email}</strong>.
      </p>

      <div className="mt-8 overflow-hidden rounded-3xl bg-white text-left shadow-ticket ring-1 ring-linea">
        <div className="flex items-center justify-between bg-brand-500 px-6 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-100">Código de reserva</p>
            <p className="font-mono text-xl font-semibold tracking-wide">{codigo}</p>
          </div>
          <p className="text-right text-sm text-brand-100">{datos.nombre} {datos.apellidos}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-6 text-sm">
          <div className="col-span-2">
            <dt className="text-tinta-tenue">Especialidad</dt>
            <dd className="mt-0.5 text-lg font-semibold">{esp.nombre}</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Día</dt>
            <dd className="mt-0.5 font-medium">{fechaLarga(fecha!)}</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Hora</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{hueco!.hora} · {esp.duracionMin} min</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Profesional</dt>
            <dd className="mt-0.5 font-medium">{prof.nombre}</dd>
          </div>
          <div>
            <dt className="text-tinta-tenue">Dónde</dt>
            <dd className="mt-0.5 font-medium">{contacto.direccion}</dd>
          </div>
        </dl>

        <div className="mx-6 border-t-2 border-dashed border-linea" aria-hidden="true" />

        <dl className="grid grid-cols-2 gap-3 p-6 text-sm">
          <div className="rounded-xl bg-ambar-50 p-3">
            <dt className="text-ambar-700">Anticipo pagado</dt>
            <dd className="text-xl font-semibold tabular-nums text-ambar-600">{formatoEuros(esp.deposito)}</dd>
          </div>
          <div className="rounded-xl bg-fondo p-3">
            <dt className="text-tinta-suave">A pagar en la clínica</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatoEuros(esp.precio - esp.deposito)}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-sm text-tinta-suave">
        <AvisoCancelacion fecha={fecha!} hora={hueco!.hora} /> Puedes gestionar tu cita desde el enlace del email o
        desde Mi zona.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={token ? `/mi-zona/cita/${token}` : "/mi-zona"} className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600">
          Gestionar mi cita
        </Link>
        <a href="/reservar" className="rounded-xl border border-linea bg-white px-6 py-3 font-medium transition hover:border-brand-200">
          Reservar otra cita
        </a>
      </div>
    </div>
  );
}
