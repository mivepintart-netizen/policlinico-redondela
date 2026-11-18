"use client";

import { useCallback, useState } from "react";
import { aISO, fechaLarga } from "@/lib/agenda";
import { usePanel } from "./PanelProvider";
import { Cabecera, Toast, btn, claseCampoBase } from "./ui";

export default function Festivos() {
  const { festivos, anadirFestivo, borrarFestivo, ahora, cargarReservas } = usePanel();
  const hoy = aISO(ahora);
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const proximos = festivos.filter((f) => f.fecha >= hoy);
  const pasados = festivos.filter((f) => f.fecha < hoy).reverse();

  const anadir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fecha) return setError("Elige una fecha.");
    if (!descripcion.trim()) return setError("Escribe una descripción (ej. Fiesta local).");
    if (festivos.some((f) => f.fecha === fecha)) return setError("Ese día ya está marcado como festivo.");
    const err = await anadirFestivo({ fecha, descripcion: descripcion.trim() });
    if (err) return setError(err);
    const citas = (await cargarReservas(fecha, fecha).catch(() => [])).filter((r) => r.estado !== "cancelada").length;
    setAviso(
      citas
        ? `Festivo añadido. Ojo: hay ${citas} citas ese día, revisa la agenda para avisar a los pacientes.`
        : "Festivo añadido"
    );
    setFecha("");
    setDescripcion("");
    setError(null);
  };

  const lista = (items: typeof festivos, titulo: string, borrable: boolean) =>
    items.length > 0 && (
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-tinta-tenue">{titulo}</h2>
        <ul className="divide-y divide-linea rounded-2xl bg-white ring-1 ring-linea">
          {items.map((f) => (
            <li key={f.fecha} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-medium">{fechaLarga(f.fecha)} <span className="font-normal text-tinta-tenue">{f.fecha.slice(0, 4)}</span></p>
                <p className="text-sm text-tinta-suave">{f.descripcion}</p>
              </div>
              {borrable && (
                <button
                  type="button"
                  onClick={async () => {
                    const err = await borrarFestivo(f.fecha);
                    setAviso(err ?? "Festivo eliminado");
                  }}
                  className={btn.fantasma}
                  aria-label={`Eliminar festivo ${f.descripcion}`}
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <>
      <Cabecera titulo="Festivos" texto="Días en que la clínica está cerrada. No se podrán reservar citas." />

      <form onSubmit={anadir} className="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-linea sm:flex-row sm:items-end">
        <div>
          <label htmlFor="f-fecha" className="mb-1 block text-sm font-medium">Fecha</label>
          <input id="f-fecha" type="date" min={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${claseCampoBase} w-full sm:w-auto`} />
        </div>
        <div className="flex-1">
          <label htmlFor="f-desc" className="mb-1 block text-sm font-medium">Descripción</label>
          <input id="f-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Fiesta local de Redondela" className={`${claseCampoBase} w-full`} />
        </div>
        <button type="submit" className={btn.primario}>Añadir festivo</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      {lista(proximos, "Próximos", true)}
      {proximos.length === 0 && <p className="mt-8 text-sm text-tinta-tenue">No hay festivos próximos.</p>}
      {lista(pasados, "Pasados", false)}
      <Toast texto={aviso} onCerrar={cerrarAviso} />
    </>
  );
}
