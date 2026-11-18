"use client";

import { useState } from "react";
import { fechaLarga } from "@/lib/agenda";
import { formatoEuros } from "@/lib/datos";
import { METODOS, anticipoCobrado, type ReservaPanel } from "@/lib/panel";
import { usePanel } from "./PanelProvider";
import { BadgeEstado, Cajon, btn } from "./ui";

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-tinta-tenue">{etiqueta}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-linea">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-tinta-tenue">{titulo}</h3>
      {children}
    </section>
  );
}

export default function DetalleReserva({
  reserva,
  onCerrar,
  onAviso,
}: {
  reserva: ReservaPanel | null;
  onCerrar: () => void;
  onAviso: (texto: string) => void;
}) {
  const { especialidades, profesionales, actualizarReserva, ahora } = usePanel();
  const [cancelando, setCancelando] = useState(false);
  const [devolver, setDevolver] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!reserva) return null;
  const r = reserva;
  const esp = especialidades.find((e) => e.id === r.especialidadId);
  const prof = profesionales.find((p) => p.id === r.profesionalId);
  const precio = r.precio;
  const anticipoPagado = anticipoCobrado(r);
  const enPlazo = new Date(`${r.fecha}T${r.hora}:00`).getTime() - ahora.getTime() > 24 * 3600 * 1000;
  const pasada = new Date(`${r.fecha}T${r.hora}:00`) < ahora;
  const tel = r.paciente.telefono.replace(/\s/g, "");

  const hacer = async (cambios: Partial<ReservaPanel>, texto: string) => {
    setGuardando(true);
    setError(null);
    const err = await actualizarReserva(r, cambios);
    setGuardando(false);
    if (err) return setError(err);
    onAviso(texto);
    setCancelando(false);
    onCerrar();
  };

  const cerrar = () => {
    setCancelando(false);
    setError(null);
    onCerrar();
  };

  const acciones = (() => {
    if (cancelando) {
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold">¿Cancelar esta cita?</p>
          {anticipoPagado > 0 && (
            <fieldset className="space-y-2 text-sm">
              <legend className="sr-only">Anticipo</legend>
              <label className="flex items-center gap-2">
                <input type="radio" checked={devolver} onChange={() => setDevolver(true)} className="accent-brand-500" />
                Devolver el anticipo ({formatoEuros(anticipoPagado)})
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={!devolver} onChange={() => setDevolver(false)} className="accent-brand-500" />
                No devolver {!enPlazo && <span className="text-tinta-tenue">(menos de 24 h)</span>}
              </label>
            </fieldset>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setCancelando(false)} className={`${btn.secundario} flex-1`}>Volver</button>
            <button
              type="button"
              onClick={() =>
                hacer(
                  { estado: "cancelada", reembolso: anticipoPagado > 0 && devolver },
                  `${r.id} cancelada${anticipoPagado > 0 && devolver ? " · anticipo a devolver" : ""}`
                )
              }
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Sí, cancelar
            </button>
          </div>
        </div>
      );
    }
    switch (r.estado) {
      case "confirmada":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => hacer({ estado: "completada" }, `${r.id} marcada como completada`)} className={btn.primario}>
              Paciente atendido
            </button>
            <button type="button" onClick={() => { setDevolver(enPlazo); setCancelando(true); }} className={btn.peligro}>
              Cancelar cita
            </button>
          </div>
        );
      case "sin_deposito":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => hacer({ estado: "confirmada", metodoPago: "recepcion" }, `Anticipo de ${r.id} cobrado en recepción`)} className={btn.primario}>
              Anticipo cobrado
            </button>
            <button type="button" onClick={() => hacer({ estado: "completada" }, `${r.id} marcada como completada`)} className={btn.secundario}>
              Paciente atendido
            </button>
            <button type="button" onClick={() => { setDevolver(false); setCancelando(true); }} className={`${btn.peligro} sm:col-span-2`}>
              Cancelar cita
            </button>
          </div>
        );
      case "completada":
        return (
          <button type="button" onClick={() => hacer({ estado: r.metodoPago ? "confirmada" : "sin_deposito" }, `${r.id} vuelve a estar pendiente`)} className={`${btn.secundario} w-full`}>
            Deshacer: no se atendió
          </button>
        );
      case "cancelada":
        return pasada ? (
          <p className="text-center text-sm text-tinta-tenue">Cita cancelada.</p>
        ) : (
          <button type="button" onClick={() => hacer({ estado: r.metodoPago ? "confirmada" : "sin_deposito", reembolso: false }, `${r.id} reactivada`)} className={`${btn.secundario} w-full`}>
            Reactivar cita
          </button>
        );
    }
  })();

  return (
    <Cajon
      abierto
      titulo={`${r.paciente.nombre} ${r.paciente.apellidos}`}
      subtitulo={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{r.id}</span>
          <BadgeEstado estado={r.estado} />
        </span>
      }
      onCerrar={cerrar}
      pie={
        <fieldset disabled={guardando} className="space-y-3 disabled:opacity-60">
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {acciones}
        </fieldset>
      }
    >
      <div className="space-y-4">
        <Bloque titulo="Cita">
          <dl className="divide-y divide-linea">
            <Fila etiqueta="Especialidad">{esp?.nombre ?? r.especialidadId}</Fila>
            <Fila etiqueta="Profesional">{prof?.nombre ?? r.profesionalId}</Fila>
            <Fila etiqueta="Día">{fechaLarga(r.fecha)}</Fila>
            <Fila etiqueta="Hora">{r.hora} · {esp?.duracionMin} min</Fila>
          </dl>
        </Bloque>

        <Bloque titulo="Paciente">
          <dl className="divide-y divide-linea">
            <Fila etiqueta="DNI / NIE">{r.paciente.dni || "—"}</Fila>
            <Fila etiqueta="Teléfono">{r.paciente.telefono}</Fila>
            <Fila etiqueta="Email"><span className="break-all">{r.paciente.email || "—"}</span></Fila>
          </dl>
          {r.paciente.motivo && (
            <p className="mt-2 rounded-xl bg-fondo p-3 text-sm text-tinta-suave">
              <span className="block text-xs font-medium text-tinta-tenue">Motivo</span>
              {r.paciente.motivo}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:+34${tel}`} className={btn.secundario}>Llamar</a>
            <a href={`https://wa.me/34${tel}`} target="_blank" rel="noopener noreferrer" className={btn.secundario}>WhatsApp</a>
            {r.paciente.email && r.estado !== "cancelada" && (
              <button type="button" onClick={() => onAviso(`Confirmación reenviada a ${r.paciente.email} (simulado)`)} className={btn.secundario}>
                Reenviar email
              </button>
            )}
          </div>
        </Bloque>

        <Bloque titulo="Pago">
          <dl className="divide-y divide-linea">
            <Fila etiqueta="Precio">{formatoEuros(precio)}</Fila>
            <Fila etiqueta="Anticipo">
              {anticipoPagado > 0 ? (
                <span className="text-ambar-600">{formatoEuros(anticipoPagado)} · {METODOS[r.metodoPago!]}</span>
              ) : (
                <span className="text-tinta-tenue">No pagado</span>
              )}
            </Fila>
            {r.estado === "cancelada" ? (
              <Fila etiqueta="Reembolso">{anticipoPagado > 0 ? (r.reembolso ? "Sí, a devolver" : "No") : "—"}</Fila>
            ) : (
              <Fila etiqueta={r.estado === "completada" ? "Cobrado en clínica" : "A cobrar en clínica"}>
                {formatoEuros(precio - anticipoPagado)}
              </Fila>
            )}
          </dl>
        </Bloque>

        <p className="text-xs text-tinta-tenue">
          {r.origen === "web" ? "Reservada por el paciente en la web" : "Creada desde el panel"} el{" "}
          {new Date(r.creadaEl).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}.
        </p>
      </div>
    </Cajon>
  );
}
