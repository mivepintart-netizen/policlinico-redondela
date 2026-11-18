"use client";

import { useCallback, useMemo, useState } from "react";
import { aISO, desdeISO, sumarDias } from "@/lib/agenda";
import { formatoEuros } from "@/lib/datos";
import { ESTADOS, aCSV, type EstadoPanel, type ReservaPanel } from "@/lib/panel";
import DetalleReserva from "./DetalleReserva";
import NuevaReserva from "./NuevaReserva";
import { usePanel } from "./PanelProvider";
import { BadgeEstado, Cabecera, Toast, btn, claseCampoBase } from "./ui";

type Rango = "hoy" | "proximos7" | "mes" | "ultimos30" | "personalizado";
const POR_PAGINA = 20;

const quitarTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Reservas() {
  const { ahora, reservas, especialidades, profesionales } = usePanel();
  const hoy = aISO(ahora);

  const [rango, setRango] = useState<Rango>("proximos7");
  const [desdeP, setDesdeP] = useState(hoy);
  const [hastaP, setHastaP] = useState(aISO(sumarDias(ahora, 14)));
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<EstadoPanel | "">("");
  const [esp, setEsp] = useState("");
  const [prof, setProf] = useState("");
  const [pagina, setPagina] = useState(0);
  const [abierta, setAbierta] = useState<ReservaPanel | null>(null);
  const [nueva, setNueva] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const [desde, hasta] = useMemo((): [string, string] => {
    const d = desdeISO(hoy);
    switch (rango) {
      case "hoy": return [hoy, hoy];
      case "proximos7": return [hoy, aISO(sumarDias(d, 6))];
      case "mes": return [aISO(new Date(d.getFullYear(), d.getMonth(), 1)), aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
      case "ultimos30": return [aISO(sumarDias(d, -30)), aISO(sumarDias(d, -1))];
      case "personalizado": return desdeP <= hastaP ? [desdeP, hastaP] : [hastaP, desdeP];
    }
  }, [rango, hoy, desdeP, hastaP]);

  const todas = useMemo(() => reservas(desde, hasta), [reservas, desde, hasta]);

  const filtradas = useMemo(() => {
    const q = quitarTildes(texto.trim());
    const lista = todas.filter(
      (r) =>
        (!estado || r.estado === estado) &&
        (!esp || r.especialidadId === esp) &&
        (!prof || r.profesionalId === prof) &&
        (!q ||
          quitarTildes(`${r.id} ${r.paciente.nombre} ${r.paciente.apellidos} ${r.paciente.dni} ${r.paciente.telefono} ${r.paciente.email}`).includes(q))
    );
    // Lo pasado, de más reciente a más antiguo
    return rango === "ultimos30" ? lista.reverse() : lista;
  }, [todas, texto, estado, esp, prof, rango]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const pag = Math.min(pagina, paginas - 1);
  const visibles = filtradas.slice(pag * POR_PAGINA, (pag + 1) * POR_PAGINA);

  const conteo = (e: EstadoPanel) => todas.filter((r) => r.estado === e).length;

  const exportar = () => {
    const blob = new Blob([aCSV(filtradas, especialidades, profesionales)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas_${desde}_${hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtro = (f: () => void) => {
    f();
    setPagina(0);
  };

  const fechaCorta = (iso: string) =>
    desdeISO(iso).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

  return (
    <>
      <Cabecera titulo="Reservas" texto={`${filtradas.length} reservas${filtradas.length !== todas.length ? ` de ${todas.length}` : ""}`}>
        <button type="button" onClick={exportar} disabled={!filtradas.length} className={btn.secundario}>Exportar CSV</button>
        <button type="button" onClick={() => setNueva(true)} className={btn.primario}>+ Nueva cita</button>
      </Cabecera>

      {/* Rango */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
        {([
          ["hoy", "Hoy"],
          ["proximos7", "Próximos 7 días"],
          ["mes", "Este mes"],
          ["ultimos30", "Últimos 30 días"],
          ["personalizado", "Personalizado"],
        ] as [Rango, string][]).map(([v, t]) => (
          <button
            key={v}
            type="button"
            onClick={() => filtro(() => setRango(v))}
            aria-pressed={rango === v}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              rango === v ? "bg-brand-500 text-white" : "bg-white text-tinta-suave ring-1 ring-linea hover:ring-brand-200"
            }`}
          >
            {t}
          </button>
        ))}
        {rango === "personalizado" && (
          <span className="flex items-center gap-2 text-sm">
            <input type="date" aria-label="Desde" value={desdeP} onChange={(e) => filtro(() => setDesdeP(e.target.value))} className={`${claseCampoBase} py-1.5`} />
            –
            <input type="date" aria-label="Hasta" value={hastaP} onChange={(e) => filtro(() => setHastaP(e.target.value))} className={`${claseCampoBase} py-1.5`} />
          </span>
        )}
      </div>

      {/* Filtros */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="buscar" className="sr-only">Buscar</label>
          <input
            id="buscar"
            type="search"
            value={texto}
            onChange={(e) => filtro(() => setTexto(e.target.value))}
            placeholder="Buscar por nombre, código, DNI, teléfono o email"
            className={`${claseCampoBase} w-full pl-9`}
          />
          <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-tenue" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="9" cy="9" r="6" />
            <path d="m17 17-3.5-3.5" />
          </svg>
        </div>
        <select aria-label="Estado" value={estado} onChange={(e) => filtro(() => setEstado(e.target.value as EstadoPanel | ""))} className={`${claseCampoBase} w-full`}>
          <option value="">Todos los estados</option>
          {(Object.keys(ESTADOS) as EstadoPanel[]).map((e) => (
            <option key={e} value={e}>{ESTADOS[e].texto} ({conteo(e)})</option>
          ))}
        </select>
        <select aria-label="Especialidad" value={esp} onChange={(e) => filtro(() => { setEsp(e.target.value); setProf(""); })} className={`${claseCampoBase} w-full`}>
          <option value="">Todas las especialidades</option>
          {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select aria-label="Profesional" value={prof} onChange={(e) => filtro(() => setProf(e.target.value))} className={`${claseCampoBase} w-full`}>
          <option value="">Todos los profesionales</option>
          {profesionales.filter((p) => !esp || p.especialidadId === esp).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {/* Tabla (escritorio) */}
      <div className="mt-4 hidden overflow-hidden rounded-2xl bg-white ring-1 ring-linea md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linea bg-fondo/60 text-xs font-medium text-tinta-tenue">
            <tr>
              <th scope="col" className="px-4 py-3">Cita</th>
              <th scope="col" className="px-4 py-3">Paciente</th>
              <th scope="col" className="px-4 py-3">Especialidad</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3 text-right">Anticipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {visibles.map((r) => {
              const e = especialidades.find((x) => x.id === r.especialidadId);
              const p = profesionales.find((x) => x.id === r.profesionalId);
              const pagado = r.estado !== "sin_deposito" && !!r.metodoPago;
              return (
                <tr key={r.id} onClick={() => setAbierta(r)} className="cursor-pointer transition hover:bg-brand-50/50">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setAbierta(r)} className="text-left">
                      <span className="block font-medium capitalize">{fechaCorta(r.fecha)} · <span className="tabular-nums">{r.hora}</span></span>
                      <span className="block font-mono text-xs text-tinta-tenue">{r.id}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{r.paciente.nombre} {r.paciente.apellidos}</span>
                    <span className="block text-xs text-tinta-tenue">{r.paciente.telefono}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{e?.nombre}</span>
                    <span className="block text-xs text-tinta-tenue">{p?.nombre}</span>
                  </td>
                  <td className="px-4 py-3"><BadgeEstado estado={r.estado} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {pagado ? <span className="font-medium text-ambar-600">{formatoEuros(e?.deposito ?? 0)}</span> : <span className="text-tinta-tenue">—</span>}
                    {r.estado === "cancelada" && pagado && (
                      <span className="block text-xs text-tinta-tenue">{r.reembolso ? "a devolver" : "no reembolsado"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibles.length === 0 && <p className="p-10 text-center text-sm text-tinta-tenue">No hay reservas con estos filtros.</p>}
      </div>

      {/* Tarjetas (móvil) */}
      <ul className="mt-4 space-y-2 md:hidden">
        {visibles.map((r) => {
          const e = especialidades.find((x) => x.id === r.especialidadId);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setAbierta(r)} className="w-full rounded-2xl bg-white p-4 text-left ring-1 ring-linea">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-medium">{r.paciente.nombre} {r.paciente.apellidos}</span>
                  <BadgeEstado estado={r.estado} />
                </span>
                <span className="mt-1 block text-sm capitalize text-tinta-suave">{fechaCorta(r.fecha)} · {r.hora} · {e?.nombre}</span>
                <span className="block font-mono text-xs text-tinta-tenue">{r.id}</span>
              </button>
            </li>
          );
        })}
        {visibles.length === 0 && <li className="rounded-2xl bg-white p-8 text-center text-sm text-tinta-tenue ring-1 ring-linea">No hay reservas con estos filtros.</li>}
      </ul>

      {/* Paginación */}
      {paginas > 1 && (
        <nav aria-label="Páginas" className="mt-4 flex items-center justify-between text-sm">
          <button type="button" disabled={pag === 0} onClick={() => setPagina(pag - 1)} className={btn.secundario}>‹ Anterior</button>
          <span className="text-tinta-suave">Página {pag + 1} de {paginas}</span>
          <button type="button" disabled={pag >= paginas - 1} onClick={() => setPagina(pag + 1)} className={btn.secundario}>Siguiente ›</button>
        </nav>
      )}

      <DetalleReserva reserva={abierta} onCerrar={() => setAbierta(null)} onAviso={setAviso} />
      <NuevaReserva
        abierto={nueva}
        onCerrar={() => setNueva(false)}
        onCreada={(r) => {
          setNueva(false);
          setAviso(`Cita ${r.id} creada`);
        }}
      />
      <Toast texto={aviso} onCerrar={cerrarAviso} />
    </>
  );
}
