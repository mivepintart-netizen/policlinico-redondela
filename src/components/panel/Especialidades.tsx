"use client";

import { useCallback, useEffect, useState } from "react";
import { formatoEuros } from "@/lib/datos";
import type { Especialidad } from "@/lib/catalogo";
import { usePanel } from "./PanelProvider";
import { Cabecera, Toast, btn, claseCampoBase } from "./ui";
import AjustesPago from "./AjustesPago";

type Campo = "duracionMin" | "precio" | "deposito";

export default function Especialidades() {
  const { especialidades, guardarEspecialidades } = usePanel();
  const [borrador, setBorrador] = useState<Especialidad[]>(especialidades);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  useEffect(() => setBorrador(especialidades), [especialidades]);

  const errores = borrador.map((e) => {
    if (!Number.isInteger(e.duracionMin) || e.duracionMin < 5) return "La duración mínima es 5 min";
    if (!Number.isFinite(e.precio) || e.precio < 0) return "Precio no válido";
    if (!Number.isFinite(e.deposito) || e.deposito < 0) return "Anticipo no válido";
    if (e.deposito > e.precio) return "El anticipo no puede superar el precio";
    return null;
  });
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(especialidades);
  const hayErrores = errores.some(Boolean);

  const set = (i: number, cambios: Partial<Especialidad>) =>
    setBorrador(borrador.map((e, j) => (j === i ? { ...e, ...cambios } : e)));

  const numero = (i: number, campo: Campo, sufijo: string) => (
    <div className="relative">
      <input
        type="number"
        min={0}
        step={campo === "duracionMin" ? 5 : 1}
        inputMode="numeric"
        value={Number.isNaN(borrador[i][campo]) ? "" : borrador[i][campo]}
        onChange={(e) => set(i, { [campo]: e.target.value === "" ? NaN : Number(e.target.value) })}
        aria-label={`${borrador[i].nombre}: ${campo === "duracionMin" ? "duración" : campo}`}
        className={`${claseCampoBase} w-full pr-10 text-right tabular-nums ${errores[i] ? "border-red-300" : ""}`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tinta-tenue">{sufijo}</span>
    </div>
  );

  return (
    <>
      <Cabecera titulo="Especialidades y precios" texto="Duración de cada cita, precio total y anticipo que se paga al reservar.">
        <button type="button" disabled={!hayCambios} onClick={() => setBorrador(especialidades)} className={btn.fantasma}>Descartar</button>
        <button
          type="button"
          disabled={!hayCambios || hayErrores}
          onClick={async () => {
            const err = await guardarEspecialidades(borrador);
            setAviso(err ?? "Cambios guardados");
          }}
          className={btn.primario}
        >
          Guardar cambios
        </button>
      </Cabecera>

      <AjustesPago onAviso={setAviso} />

      <div className="space-y-2">
        <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 text-xs font-medium text-tinta-tenue md:grid">
          <span>Especialidad</span>
          <span className="text-right">Duración</span>
          <span className="text-right">Precio</span>
          <span className="text-right">Anticipo</span>
          <span className="text-right">En clínica</span>
          <span className="w-16 text-right">Activa</span>
        </div>
        {borrador.map((e, i) => (
          <div key={e.id} className={`rounded-2xl bg-white p-4 ring-1 ${errores[i] ? "ring-red-200" : "ring-linea"} ${e.activa ? "" : "opacity-60"}`}>
            <div className="grid grid-cols-2 items-center gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
              <p className="col-span-2 font-semibold md:col-span-1">{e.nombre}</p>
              <label className="text-xs text-tinta-tenue md:contents">
                <span className="mb-1 block md:hidden">Duración</span>
                {numero(i, "duracionMin", "min")}
              </label>
              <label className="text-xs text-tinta-tenue md:contents">
                <span className="mb-1 block md:hidden">Precio</span>
                {numero(i, "precio", "€")}
              </label>
              <label className="text-xs text-tinta-tenue md:contents">
                <span className="mb-1 block md:hidden">Anticipo</span>
                {numero(i, "deposito", "€")}
              </label>
              <p className="text-right text-sm tabular-nums text-tinta-suave">
                <span className="mr-1 text-xs text-tinta-tenue md:hidden">En clínica:</span>
                {Number.isFinite(e.precio - e.deposito) ? formatoEuros(e.precio - e.deposito) : "—"}
              </p>
              <label className="flex items-center justify-end gap-2 md:w-16">
                <span className="text-xs text-tinta-tenue md:sr-only">Activa</span>
                <input type="checkbox" checked={e.activa} onChange={(ev) => set(i, { activa: ev.target.checked })} className="h-5 w-5 accent-brand-500" aria-label={`${e.nombre} activa`} />
              </label>
            </div>
            {errores[i] && <p className="mt-2 text-sm text-red-600">{errores[i]}</p>}
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-tinta-tenue">
        Los cambios de precio afectan a las reservas nuevas, no a las ya hechas. En la versión de prueba, solo se ven en el panel.
      </p>
      <Toast texto={aviso} onCerrar={cerrarAviso} />
    </>
  );
}
