"use client";

import { useState } from "react";
import { fechaLarga } from "@/lib/agenda";
import { PORCENTAJE_AUSENCIA, formatoEuros, importeAusencia } from "@/lib/datos";
import { cobroAusencia, sePuedeCobrar, type ReservaPanel } from "@/lib/panel";
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
  const { especialidades, profesionales, actualizarReserva, cobro, avisarPaciente, ahora } = usePanel();
  const [cancelando, setCancelando] = useState(false);
  const [confirmarCobro, setConfirmarCobro] = useState<"cobrar" | "devolver" | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!reserva) return null;
  const r = reserva;
  const esp = especialidades.find((e) => e.id === r.especialidadId);
  const prof = profesionales.find((p) => p.id === r.profesionalId);
  const precio = r.precio;
  const ausencia = importeAusencia(precio);
  const cobrado = cobroAusencia(r);
  const pasada = new Date(`${r.fecha}T${r.hora}:00`) < ahora;
  const tel = r.paciente.telefono.replace(/\s/g, "");

  const hacer = async (cambios: Partial<ReservaPanel>, textoBase: string) => {
    let texto = textoBase;
    setGuardando(true);
    setError(null);
    const err = await actualizarReserva(r, cambios);
    if (err) {
      setGuardando(false);
      return setError(err);
    }
    // Avisar al paciente de la cancelación (si tiene email y la cita estaba en pie)
    if (cambios.estado === "cancelada" && r.paciente.email && r.estado !== "pendiente_pago") {
      if (await avisarPaciente(r.id, "cancelacion")) texto += " · paciente avisado por email";
    }
    setGuardando(false);
    onAviso(texto);
    setCancelando(false);
    onCerrar();
  };

  const hacerCobro = async (accion: "cobrar" | "devolver") => {
    setGuardando(true);
    setError(null);
    const { error: err, importe } = await cobro(r.id, accion);
    setGuardando(false);
    setConfirmarCobro(null);
    if (err) return setError(err);
    onAviso(
      accion === "cobrar"
        ? `Cobrados ${formatoEuros(importe ?? ausencia)} a ${r.paciente.nombre}${r.paciente.email ? " · avisado por email" : ""}`
        : `Devueltos ${formatoEuros(importe ?? cobrado)} a la tarjeta de ${r.paciente.nombre}`
    );
    onCerrar();
  };

  /** Botones de cobro para no presentados y cancelaciones tardías */
  const botonesCobro = () =>
    confirmarCobro ? (
      <div className="space-y-3 rounded-xl bg-fondo p-3">
        <p className="text-sm">
          {confirmarCobro === "cobrar" ? (
            <>
              Se cobrarán <strong>{formatoEuros(ausencia)}</strong> ({PORCENTAJE_AUSENCIA} % de {formatoEuros(precio)}) a la{" "}
              {r.tarjeta}. El paciente recibirá un email.
            </>
          ) : (
            <>
              Se devolverán <strong>{formatoEuros(cobrado)}</strong> a la {r.tarjeta}. Tarda 5–10 días en verse en su cuenta.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setConfirmarCobro(null)} className={`${btn.secundario} flex-1`}>Volver</button>
          <button type="button" onClick={() => void hacerCobro(confirmarCobro)} className={`${confirmarCobro === "cobrar" ? btn.primario : btn.peligro} flex-1`}>
            {guardando ? "Un momento…" : confirmarCobro === "cobrar" ? `Sí, cobrar ${formatoEuros(ausencia)}` : "Sí, devolver"}
          </button>
        </div>
      </div>
    ) : sePuedeCobrar(r) ? (
      <button type="button" onClick={() => setConfirmarCobro("cobrar")} className={`${btn.primario} w-full`}>
        Cobrar {formatoEuros(ausencia)} ({PORCENTAJE_AUSENCIA} %)
      </button>
    ) : cobrado > 0 ? (
      <button type="button" onClick={() => setConfirmarCobro("devolver")} className={`${btn.secundario} w-full`}>
        Devolver el cobro ({formatoEuros(cobrado)})
      </button>
    ) : null;

  const cerrar = () => {
    setConfirmarCobro(null);
    setCancelando(false);
    setError(null);
    onCerrar();
  };

  const acciones = (() => {
    if (cancelando) {
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold">¿Cancelar esta cita?</p>
          <p className="text-sm text-tinta-suave">
            El hueco queda libre{r.paciente.email ? " y el paciente recibe un email" : ""}. Al cancelarla la clínica, no se le cobra nada.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setCancelando(false)} className={`${btn.secundario} flex-1`}>Volver</button>
            <button
              type="button"
              onClick={() => hacer({ estado: "cancelada", reembolso: false }, `${r.id} cancelada`)}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Sí, cancelar
            </button>
          </div>
        </div>
      );
    }
    switch (r.estado) {
      case "pendiente_pago":
        return (
          <div className="space-y-3">
            <p className="text-sm text-tinta-suave">
              El paciente está añadiendo su tarjeta. Si no termina
              {r.expiraEn ? ` antes de las ${new Date(r.expiraEn).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}, el hueco se libera solo.
            </p>
            <button type="button" onClick={() => hacer({ estado: "cancelada", reembolso: false }, `${r.id} cancelada; el hueco queda libre`)} className={`${btn.peligro} w-full`}>
              Liberar el hueco ahora
            </button>
          </div>
        );
      case "confirmada":
      case "sin_deposito":
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => hacer({ estado: "completada" }, `${r.id} marcada como atendida`)} className={btn.primario}>
              Paciente atendido
            </button>
            {pasada ? (
              <button type="button" onClick={() => hacer({ estado: "no_presentado" }, `${r.id}: no se presentó`)} className={btn.peligro}>
                No se presentó
              </button>
            ) : (
              <button type="button" onClick={() => setCancelando(true)} className={btn.peligro}>
                Cancelar cita
              </button>
            )}
          </div>
        );
      case "completada":
        return (
          <button type="button" onClick={() => hacer({ estado: r.tarjeta || r.origen === "web" ? "confirmada" : "sin_deposito" }, `${r.id} vuelve a estar pendiente`)} className={`${btn.secundario} w-full`}>
            Deshacer: no se atendió
          </button>
        );
      case "no_presentado":
        return (
          <div className="space-y-2">
            {botonesCobro()}
            {!r.tarjeta && <p className="text-center text-sm text-tinta-tenue">No dejó tarjeta en garantía: no se le puede cobrar online.</p>}
            {cobrado === 0 && !confirmarCobro && (
              <button type="button" onClick={() => hacer({ estado: "completada" }, `${r.id} marcada como atendida`)} className={`${btn.secundario} w-full`}>
                Deshacer: sí vino
              </button>
            )}
          </div>
        );
      case "cancelada":
        return (
          <div className="space-y-2">
            {botonesCobro()}
            {pasada || cobrado > 0 || confirmarCobro ? (
              !sePuedeCobrar(r) && cobrado === 0 && <p className="text-center text-sm text-tinta-tenue">Cita cancelada.</p>
            ) : (
              <button type="button" onClick={() => hacer({ estado: r.tarjeta || r.origen === "web" ? "confirmada" : "sin_deposito", reembolso: false }, `${r.id} reactivada`)} className={`${btn.secundario} w-full`}>
                Reactivar cita
              </button>
            )}
          </div>
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
            <Fila etiqueta="Precio (en la clínica)">{formatoEuros(precio)}</Fila>
            <Fila etiqueta="Tarjeta en garantía">
              {r.tarjeta ?? <span className="text-tinta-tenue">{r.estado === "pendiente_pago" ? "Añadiéndola…" : "No"}</span>}
            </Fila>
            {r.tarjeta && (
              <Fila etiqueta={`Si no viene (${PORCENTAJE_AUSENCIA} %)`}>
                <span className="text-ambar-600">{formatoEuros(ausencia)}</span>
              </Fila>
            )}
            {r.canceladaTarde && <Fila etiqueta="Cancelación">Con menos de 24 h</Fila>}
            {r.cobrado !== null && (
              <Fila etiqueta="Cobrado por ausencia">
                {r.cobroDevuelto ? (
                  <span className="text-tinta-tenue line-through">{formatoEuros(r.cobrado)}</span>
                ) : (
                  <span className="text-ambar-600">{formatoEuros(r.cobrado)}</span>
                )}
                <span className="block text-xs font-normal text-tinta-tenue">
                  {r.cobroDevuelto
                    ? "Devuelto"
                    : r.cobroAt && new Date(r.cobroAt).toLocaleString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </span>
              </Fila>
            )}
          </dl>
          {r.cobroError && cobrado === 0 && (
            <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <span className="block font-medium">Último intento de cobro rechazado</span>
              {r.cobroError}
            </p>
          )}
        </Bloque>

        <p className="text-xs text-tinta-tenue">
          {r.origen === "web" ? "Reservada por el paciente en la web" : "Creada desde el panel"} el{" "}
          {new Date(r.creadaEl).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}.
          {r.recordatorioAt && (
            <>
              {" "}Recordatorio enviado el{" "}
              {new Date(r.recordatorioAt).toLocaleString("es-ES", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.
            </>
          )}
        </p>
      </div>
    </Cajon>
  );
}
