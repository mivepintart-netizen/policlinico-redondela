"use client";

import { useMemo, useState } from "react";
import { aISO, buscarFestivo, limiteReserva, nombreMes } from "@/lib/agenda";
import type { Festivo } from "@/lib/catalogo";

const CABECERA = ["L", "M", "X", "J", "V", "S", "D"];

export default function Calendario({
  ahora,
  festivos,
  seleccionada,
  huecosPorDia,
  onElegir,
}: {
  ahora: Date;
  festivos: Festivo[];
  seleccionada: string | null;
  /** Número de huecos libres de un día (0 = no disponible). */
  huecosPorDia: (iso: string) => number;
  onElegir: (iso: string) => void;
}) {
  const hoy = useMemo(() => new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), [ahora]);
  const limite = useMemo(() => limiteReserva(ahora), [ahora]);
  const [mes, setMes] = useState(() =>
    seleccionada
      ? new Date(Number(seleccionada.slice(0, 4)), Number(seleccionada.slice(5, 7)) - 1, 1)
      : new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  );

  const primerMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ultimoMes = new Date(limite.getFullYear(), limite.getMonth(), 1);
  const puedeAtras = mes > primerMes;
  const puedeAdelante = mes < ultimoMes;

  // Celdas: lunes como primer día de la semana
  const desfase = (mes.getDay() + 6) % 7;
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas: (Date | null)[] = [
    ...Array.from({ length: desfase }, () => null),
    ...Array.from({ length: diasMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
  ];

  const cambiarMes = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1));

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-linea sm:p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          disabled={!puedeAtras}
          aria-label="Mes anterior"
          className="grid h-9 w-9 place-items-center rounded-lg text-tinta-suave transition hover:bg-brand-50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ‹
        </button>
        <p className="font-semibold" aria-live="polite">{nombreMes(mes)}</p>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          disabled={!puedeAdelante}
          aria-label="Mes siguiente"
          className="grid h-9 w-9 place-items-center rounded-lg text-tinta-suave transition hover:bg-brand-50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center" role="grid">
        {CABECERA.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-tinta-tenue" role="columnheader">
            {d}
          </div>
        ))}
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`v${i}`} />;
          const iso = aISO(dia);
          const festivo = buscarFestivo(festivos, iso);
          const fueraDeRango = dia < hoy || dia > limite;
          const libres = fueraDeRango || festivo ? 0 : huecosPorDia(iso);
          const disponible = libres > 0;
          const activo = iso === seleccionada;
          const esHoy = iso === aISO(hoy);

          return (
            <button
              key={iso}
              type="button"
              disabled={!disponible}
              onClick={() => onElegir(iso)}
              title={festivo ? `Festivo: ${festivo.descripcion}` : undefined}
              aria-label={`${dia.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}${
                disponible ? `, ${libres} huecos libres` : ", no disponible"
              }`}
              aria-pressed={activo}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm tabular-nums transition ${
                activo
                  ? "bg-brand-500 font-semibold text-white shadow-sm"
                  : disponible
                    ? "font-medium text-tinta hover:bg-brand-50"
                    : "text-tinta-tenue/50"
              } ${festivo && !fueraDeRango ? "line-through" : ""}`}
            >
              {dia.getDate()}
              {disponible && !activo && (
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-brand-400" aria-hidden="true" />
              )}
              {esHoy && !activo && (
                <span className="absolute inset-1 rounded-lg ring-1 ring-brand-200" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-linea pt-3 text-xs text-tinta-tenue">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> Con huecos libres
        </span>
        <span className="flex items-center gap-1.5">
          <span className="line-through">8</span> Festivo
        </span>
      </div>
    </div>
  );
}

