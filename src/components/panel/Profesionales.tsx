"use client";

import { useCallback, useState } from "react";
import type { DiaSemana, Turno } from "@/lib/datos";
import type { ProfesionalPanel } from "@/lib/panel";
import { usePanel } from "./PanelProvider";
import { Cabecera, Cajon, Toast, btn, claseCampo } from "./ui";

const DIAS: { id: DiaSemana; corto: string; largo: string }[] = [
  { id: "lun", corto: "L", largo: "Lunes" },
  { id: "mar", corto: "M", largo: "Martes" },
  { id: "mie", corto: "X", largo: "Miércoles" },
  { id: "jue", corto: "J", largo: "Jueves" },
  { id: "vie", corto: "V", largo: "Viernes" },
  { id: "sab", corto: "S", largo: "Sábado" },
];

/** Ciclo al pulsar: libre → mañana → tarde → mañana y tarde → libre */
const SIGUIENTE: Record<string, Turno | undefined> = { "": "m", m: "t", t: "mt", mt: undefined };
const TEXTO_TURNO: Record<Turno, string> = { m: "Mañana", t: "Tarde", mt: "M + T" };

function Interruptor({ activo, onCambiar, etiqueta }: { activo: boolean; onCambiar: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={onCambiar}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${activo ? "bg-brand-500" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${activo ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function Profesionales() {
  const { profesionales, especialidades, guardarProfesionales } = usePanel();
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: "", rol: "", especialidadId: "" });
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const cambiar = (id: string, f: (p: ProfesionalPanel) => ProfesionalPanel, texto?: string) => {
    guardarProfesionales(profesionales.map((p) => (p.id === id ? f(p) : p)));
    if (texto) setAviso(texto);
  };

  const alternarTurno = (p: ProfesionalPanel, dia: DiaSemana) =>
    cambiar(p.id, (x) => {
      const horario = { ...x.horario };
      const sig = SIGUIENTE[horario[dia] ?? ""];
      if (sig) horario[dia] = sig;
      else delete horario[dia];
      return { ...x, horario };
    });

  const crear = () => {
    if (!form.nombre.trim() || !form.rol.trim() || !form.especialidadId) {
      setError("Rellena nombre, puesto y especialidad.");
      return;
    }
    const base = form.nombre.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^dra?\.\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let id = base;
    for (let i = 2; profesionales.some((p) => p.id === id); i++) id = `${base}-${i}`;
    guardarProfesionales([
      ...profesionales,
      { id, nombre: form.nombre.trim(), rol: form.rol.trim(), especialidadId: form.especialidadId as ProfesionalPanel["especialidadId"], horario: {}, activo: true },
    ]);
    setForm({ nombre: "", rol: "", especialidadId: "" });
    setError(null);
    setNuevo(false);
    setAviso(`${form.nombre.trim()} añadido. Configura su horario.`);
  };

  return (
    <>
      <Cabecera titulo="Profesionales" texto="Pulsa cada día para cambiar el turno: mañana (9:00–14:00), tarde (16:00–20:30) o ambos.">
        <button type="button" onClick={() => setNuevo(true)} className={btn.primario}>+ Añadir profesional</button>
      </Cabecera>

      <div className="space-y-6">
        {especialidades.map((esp) => {
          const lista = profesionales.filter((p) => p.especialidadId === esp.id);
          if (!lista.length) return null;
          return (
            <section key={esp.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-tinta-tenue">{esp.nombre}</h2>
              <ul className="space-y-2">
                {lista.map((p) => (
                  <li key={p.id} className={`flex flex-col gap-4 rounded-2xl bg-white p-4 ring-1 ring-linea lg:flex-row lg:items-center ${p.activo ? "" : "opacity-60"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{p.nombre}</p>
                      <p className="text-sm text-tinta-tenue">{p.rol}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Horario de ${p.nombre}`}>
                      {DIAS.map((d) => {
                        const t = p.horario[d.id];
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => alternarTurno(p, d.id)}
                            disabled={!p.activo}
                            aria-label={`${d.largo}: ${t ? TEXTO_TURNO[t] : "no trabaja"}. Pulsa para cambiar.`}
                            className={`flex w-14 flex-col items-center rounded-xl py-1.5 text-xs transition disabled:cursor-not-allowed ${
                              t === "mt" ? "bg-brand-500 text-white" : t ? "bg-brand-100 text-brand-800" : "bg-fondo text-tinta-tenue ring-1 ring-linea hover:ring-brand-200"
                            }`}
                          >
                            <span className="font-semibold">{d.corto}</span>
                            <span className="text-[10px]">{t ? TEXTO_TURNO[t] : "—"}</span>
                          </button>
                        );
                      })}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-tinta-suave lg:w-28 lg:justify-end">
                      <span>{p.activo ? "Activo" : "Inactivo"}</span>
                      <Interruptor
                        activo={p.activo}
                        etiqueta={`${p.nombre} activo`}
                        onCambiar={() =>
                          cambiar(p.id, (x) => ({ ...x, activo: !x.activo }), p.activo ? `${p.nombre} ya no aparecerá para reservar` : `${p.nombre} vuelve a estar disponible`)
                        }
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-tinta-tenue">
        Los profesionales no se borran para conservar el historial de citas: desactívalos para que dejen de aparecer al reservar.
        En la versión de prueba, estos cambios solo se ven en el panel.
      </p>

      <Cajon
        abierto={nuevo}
        titulo="Añadir profesional"
        onCerrar={() => setNuevo(false)}
        pie={
          <div className="flex gap-2">
            <button type="button" onClick={() => setNuevo(false)} className={`${btn.secundario} flex-1`}>Cancelar</button>
            <button type="button" onClick={crear} className={`${btn.primario} flex-1`}>Añadir</button>
          </div>
        }
      >
        <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-linea">
          <div>
            <label htmlFor="np-nombre" className="mb-1 block text-sm font-medium">Nombre</label>
            <input id="np-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Dra. Nombre Apellido" className={claseCampo} />
          </div>
          <div>
            <label htmlFor="np-rol" className="mb-1 block text-sm font-medium">Puesto</label>
            <input id="np-rol" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} placeholder="Fisioterapeuta" className={claseCampo} />
          </div>
          <div>
            <label htmlFor="np-esp" className="mb-1 block text-sm font-medium">Especialidad</label>
            <select id="np-esp" value={form.especialidadId} onChange={(e) => setForm({ ...form, especialidadId: e.target.value })} className={claseCampo}>
              <option value="">Elige…</option>
              {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      </Cajon>

      <Toast texto={aviso} onCerrar={cerrarAviso} />
    </>
  );
}
