"use client";

import { useCallback, useState } from "react";
import { aISO, desdeISO, fechaLarga, sumarDias } from "@/lib/agenda";
import { formatoEuros, turnos } from "@/lib/datos";
import type { DiaSemana } from "@/lib/catalogo";
import { ESTADOS, anticipoCobrado, esActiva, type ReservaPanel } from "@/lib/panel";
import DetalleReserva from "./DetalleReserva";
import EnviarEnlace from "./EnviarEnlace";
import NuevaReserva from "./NuevaReserva";
import { usePanel, useReservas } from "./PanelProvider";
import { BadgeEstado, Cabecera, Kpi, Toast, btn, claseCampoBase } from "./ui";

const DIAS: DiaSemana[] = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
const INICIO = 9 * 60; // 09:00
const FIN = 20 * 60 + 30; // 20:30
const PX_MIN = 1.6; // alto de cada minuto en la vista por columnas

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

const COLOR_BLOQUE: Record<ReservaPanel["estado"], string> = {
  pendiente_pago: "bg-white ring-ambar-500/40 hover:ring-ambar-500 border-l-ambar-500 border-dashed text-tinta-suave",
  confirmada: "bg-brand-50 ring-brand-200 hover:ring-brand-400 border-l-brand-500",
  sin_deposito: "bg-ambar-50 ring-ambar-100 hover:ring-ambar-500 border-l-ambar-500",
  completada: "bg-slate-50 ring-slate-200 hover:ring-slate-400 border-l-slate-400 text-tinta-suave",
  cancelada: "bg-red-50/60 ring-red-100 hover:ring-red-300 border-l-red-400 text-tinta-tenue line-through",
};

export default function Agenda() {
  const { ahora, especialidades, profesionales, festivos } = usePanel();
  const hoy = aISO(ahora);
  const [fecha, setFecha] = useState(hoy);
  const [filtroEsp, setFiltroEsp] = useState("");
  const [verCanceladas, setVerCanceladas] = useState(false);
  const [abierta, setAbierta] = useState<ReservaPanel | null>(null);
  const [nueva, setNueva] = useState(false);
  const [enlace, setEnlace] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const { reservas: cargadas, error: errorCarga, cargando } = useReservas(fecha, fecha);
  const delDia = cargadas ?? [];
  const festivo = festivos.find((f) => f.fecha === fecha);
  const dia = DIAS[desdeISO(fecha).getDay()];

  // Profesionales que trabajan ese día (o que tienen citas)
  const columnas = profesionales.filter(
    (p) =>
      (!filtroEsp || p.especialidadId === filtroEsp) &&
      ((p.activo && p.horario[dia]) || delDia.some((r) => r.profesionalId === p.id))
  );

  const visibles = delDia.filter(
    (r) => (verCanceladas || esActiva(r)) && (!filtroEsp || r.especialidadId === filtroEsp)
  );

  // Cifras del día
  const activas = delDia.filter(esActiva);
  const cobradoAnticipos = activas.reduce((s, r) => s + anticipoCobrado(r), 0);
  const pendienteClinica = activas.filter((r) => r.estado !== "completada").reduce((s, r) => s + r.precio - anticipoCobrado(r), 0);
  const completadas = activas.filter((r) => r.estado === "completada").length;
  const sinAnticipo = activas.filter((r) => r.estado === "sin_deposito").length;
  const canceladas = delDia.length - activas.length;

  const minutoAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const mostrarLinea = fecha === hoy && minutoAhora >= INICIO && minutoAhora <= FIN;

  const etiquetaDia =
    fecha === hoy ? "Hoy" : fecha === aISO(sumarDias(ahora, 1)) ? "Mañana" : fecha === aISO(sumarDias(ahora, -1)) ? "Ayer" : null;

  return (
    <>
      <Cabecera
        titulo="Agenda"
        texto={
          <>
            {etiquetaDia && <span className="font-semibold text-brand-600">{etiquetaDia} · </span>}
            {fechaLarga(fecha)}
          </>
        }
      >
        <div className="flex items-center rounded-xl bg-white ring-1 ring-linea">
          <button type="button" onClick={() => setFecha(aISO(sumarDias(desdeISO(fecha), -1)))} aria-label="Día anterior" className="grid h-10 w-10 place-items-center rounded-l-xl text-tinta-suave hover:bg-brand-50">‹</button>
          <button type="button" onClick={() => setFecha(hoy)} className="h-10 border-x border-linea px-3 text-sm font-medium hover:bg-brand-50">Hoy</button>
          <button type="button" onClick={() => setFecha(aISO(sumarDias(desdeISO(fecha), 1)))} aria-label="Día siguiente" className="grid h-10 w-10 place-items-center rounded-r-xl text-tinta-suave hover:bg-brand-50">›</button>
        </div>
        <label className="sr-only" htmlFor="agenda-fecha">Ir a fecha</label>
        <input id="agenda-fecha" type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className={`${claseCampoBase} w-auto`} />
        <button type="button" onClick={() => setNueva(true)} className={btn.secundario}>+ Nueva cita</button>
        <button type="button" onClick={() => setEnlace(true)} className={btn.primario}>Enviar enlace de reserva</button>
      </Cabecera>

      {/* Cifras */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Citas" valor={activas.length} detalle={`${completadas} ${completadas === 1 ? "atendida" : "atendidas"}${canceladas ? ` · ${canceladas} ${canceladas === 1 ? "cancelada" : "canceladas"}` : ""}`} />
        <Kpi etiqueta="Anticipos cobrados" valor={formatoEuros(cobradoAnticipos)} acento detalle="Pagados online o en recepción" />
        <Kpi etiqueta="Pendiente de cobro" valor={formatoEuros(pendienteClinica)} detalle="A cobrar en la clínica" />
        <Kpi etiqueta="Sin anticipo" valor={sinAnticipo} detalle={sinAnticipo ? "Cobrar todo en la clínica" : "Todas con anticipo"} />
      </div>

      {festivo && (
        <p className="mt-4 rounded-xl bg-ambar-50 p-3 text-sm text-ambar-700 ring-1 ring-ambar-100">
          <strong className="font-semibold">Festivo:</strong> {festivo.descripcion}. La clínica está cerrada.
        </p>
      )}

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="agenda-esp">Especialidad</label>
        <select id="agenda-esp" value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)} className={`${claseCampoBase} w-auto`}>
          <option value="">Todas las especialidades</option>
          {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-tinta-suave">
          <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} className="h-4 w-4 accent-brand-500" />
          Mostrar canceladas
        </label>
        <div className="ml-auto hidden flex-wrap gap-3 text-xs text-tinta-suave sm:flex">
          {(["confirmada", "sin_deposito", "completada"] as const).map((e) => (
            <span key={e} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${ESTADOS[e].punto}`} />
              {ESTADOS[e].texto}
            </span>
          ))}
        </div>
      </div>

      {errorCarga && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorCarga}</p>
      )}
      {cargando && <p className="mt-4 text-sm text-tinta-tenue" aria-live="polite">Cargando citas…</p>}

      {/* Vista por columnas (escritorio) */}
      {columnas.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white p-10 text-center text-sm text-tinta-tenue ring-1 ring-linea">
          Nadie pasa consulta este día.
        </p>
      ) : (
        <div className="mt-4 hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-linea md:block">
          <div className="flex min-w-max">
            {/* Eje de horas */}
            <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-linea bg-white">
              <div className="h-14 border-b border-linea" />
              <div className="relative" style={{ height: (FIN - INICIO) * PX_MIN }}>
                {Array.from({ length: Math.floor((FIN - INICIO) / 60) + 1 }, (_, i) => INICIO + i * 60).map((m) => (
                  <span key={m} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-tinta-tenue" style={{ top: (m - INICIO) * PX_MIN }}>
                    {String(m / 60).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
            </div>

            {columnas.map((p) => {
              const esp = especialidades.find((e) => e.id === p.especialidadId);
              const turno = p.activo ? p.horario[dia] : undefined;
              const franjas = !turno || festivo ? [] : turno === "mt" ? [turnos.m, turnos.t] : [turnos[turno]];
              const citas = visibles.filter((r) => r.profesionalId === p.id);
              return (
                <div key={p.id} className="w-48 shrink-0 border-r border-linea last:border-r-0 lg:w-auto lg:min-w-[11rem] lg:flex-1">
                  <div className="sticky top-0 h-14 border-b border-linea px-3 py-2">
                    <p className="truncate text-sm font-semibold">{p.nombre}</p>
                    <p className="truncate text-xs text-tinta-tenue">
                      {esp?.nombre} · {citas.filter(esActiva).length} citas
                    </p>
                  </div>
                  <div className="relative bg-[repeating-linear-gradient(135deg,#F6FBFB_0,#F6FBFB_6px,#EEF5F5_6px,#EEF5F5_7px)]" style={{ height: (FIN - INICIO) * PX_MIN }}>
                    {/* Horario de trabajo */}
                    {franjas.map((f) => (
                      <div key={f.inicio} className="absolute inset-x-0 bg-white" style={{ top: (aMin(f.inicio) - INICIO) * PX_MIN, height: (aMin(f.fin) - aMin(f.inicio)) * PX_MIN }} />
                    ))}
                    {/* Líneas de hora */}
                    {Array.from({ length: Math.floor((FIN - INICIO) / 60) }, (_, i) => (
                      <div key={i} className="absolute inset-x-0 border-t border-linea/70" style={{ top: (i + 1) * 60 * PX_MIN }} />
                    ))}
                    {/* Citas */}
                    {citas.map((r) => {
                      const dur = esp?.duracionMin ?? 30;
                      const alto = dur * PX_MIN - 3;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setAbierta(r)}
                          className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left ring-1 transition ${COLOR_BLOQUE[r.estado]}`}
                          style={{ top: (aMin(r.hora) - INICIO) * PX_MIN + 1, height: alto }}
                          title={`${r.hora} · ${r.paciente.nombre} ${r.paciente.apellidos} · ${ESTADOS[r.estado].texto}`}
                        >
                          <span className="block truncate text-xs font-semibold">
                            <span className="tabular-nums">{r.hora}</span> {r.paciente.nombre} {r.paciente.apellidos.split(" ")[0]}
                          </span>
                          {alto > 40 && r.paciente.motivo && (
                            <span className="block truncate text-[11px] text-tinta-suave">{r.paciente.motivo}</span>
                          )}
                        </button>
                      );
                    })}
                    {mostrarLinea && (
                      <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500" style={{ top: (minutoAhora - INICIO) * PX_MIN }}>
                        <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-red-500" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vista de lista (móvil) */}
      <ul className="mt-4 space-y-2 md:hidden">
        {visibles.length === 0 && columnas.length > 0 && (
          <li className="rounded-2xl bg-white p-8 text-center text-sm text-tinta-tenue ring-1 ring-linea">Sin citas este día.</li>
        )}
        {visibles.map((r) => {
          const p = profesionales.find((x) => x.id === r.profesionalId);
          const e = especialidades.find((x) => x.id === r.especialidadId);
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setAbierta(r)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-linea">
                <span className="w-12 shrink-0 text-center text-sm font-semibold tabular-nums">{r.hora}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{r.paciente.nombre} {r.paciente.apellidos}</span>
                  <span className="block truncate text-xs text-tinta-tenue">{e?.nombre} · {p?.nombre}</span>
                </span>
                <BadgeEstado estado={r.estado} />
              </button>
            </li>
          );
        })}
      </ul>

      <DetalleReserva reserva={abierta} onCerrar={() => setAbierta(null)} onAviso={setAviso} />
      <NuevaReserva
        abierto={nueva}
        fechaInicial={fecha}
        onCerrar={() => setNueva(false)}
        onCreada={(r) => {
          setNueva(false);
          setFecha(r.fecha);
          setAviso(`Cita ${r.id} creada para el ${fechaLarga(r.fecha).toLowerCase()} a las ${r.hora}`);
        }}
      />
      <EnviarEnlace abierto={enlace} onCerrar={() => setEnlace(false)} onAviso={setAviso} />
      <Toast texto={aviso} onCerrar={cerrarAviso} />
    </>
  );
}
