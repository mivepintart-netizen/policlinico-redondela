"use client";

import { useEffect, useMemo, useState } from "react";
import { aISO } from "@/lib/agenda";
import { formatoEuros } from "@/lib/datos";
import { horasDelProfesional, nuevoCodigo, type ReservaPanel } from "@/lib/panel";
import { dniValido } from "@/components/reserva/Pasos";
import { usePanel } from "./PanelProvider";
import { Cajon, btn, claseCampo } from "./ui";

const sinClave = (o: Record<string, string>, k: string) => {
  const copia = { ...o };
  delete copia[k];
  return copia;
};

const vacio = { nombre: "", apellidos: "", dni: "", telefono: "", email: "", motivo: "" };

export default function NuevaReserva({
  abierto,
  fechaInicial,
  onCerrar,
  onCreada,
}: {
  abierto: boolean;
  fechaInicial?: string;
  onCerrar: () => void;
  onCreada: (r: ReservaPanel) => void;
}) {
  const { especialidades, profesionales, festivos, reservas, crearReserva, ahora } = usePanel();
  const hoy = aISO(ahora);

  const [espId, setEspId] = useState("");
  const [profId, setProfId] = useState("");
  const [fecha, setFecha] = useState(fechaInicial && fechaInicial >= hoy ? fechaInicial : hoy);
  const [hora, setHora] = useState("");
  const [paciente, setPaciente] = useState(vacio);
  const [pago, setPago] = useState<"sin_deposito" | "recepcion">("sin_deposito");
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Al abrir, proponer el día que se está viendo en la agenda
  useEffect(() => {
    if (abierto && fechaInicial) {
      setFecha(fechaInicial >= hoy ? fechaInicial : hoy);
      setHora("");
    }
  }, [abierto, fechaInicial, hoy]);

  const esp = especialidades.find((e) => e.id === espId);
  const profs = profesionales.filter((p) => p.activo && p.especialidadId === espId);
  const prof = profs.find((p) => p.id === profId);
  const festivo = festivos.find((f) => f.fecha === fecha);

  const horasLibres = useMemo(() => {
    if (!prof || !esp || festivo) return [];
    const ocupadas = new Set(
      reservas(fecha, fecha)
        .filter((r) => r.profesionalId === prof.id && r.estado !== "cancelada")
        .map((r) => r.hora)
    );
    const minimo = fecha === hoy ? `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}` : "";
    return horasDelProfesional(prof, fecha, esp.duracionMin).filter((h) => !ocupadas.has(h) && h > minimo);
  }, [prof, esp, festivo, reservas, fecha, hoy, ahora]);

  const reiniciar = () => {
    setEspId("");
    setProfId("");
    setHora("");
    setPaciente(vacio);
    setPago("sin_deposito");
    setErrores({});
  };

  const guardar = () => {
    const e: Record<string, string> = {};
    if (!esp) e.esp = "Elige especialidad";
    if (!prof) e.prof = "Elige profesional";
    if (!hora) e.hora = "Elige una hora libre";
    if (!paciente.nombre.trim()) e.nombre = "Obligatorio";
    if (!paciente.apellidos.trim()) e.apellidos = "Obligatorio";
    if (!/^[6789]\d{8}$/.test(paciente.telefono.replace(/\s/g, ""))) e.telefono = "9 cifras";
    if (paciente.dni && !dniValido(paciente.dni)) e.dni = "DNI/NIE no válido";
    if (paciente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paciente.email)) e.email = "Email no válido";
    setErrores(e);
    if (Object.keys(e).length) return;

    const existentes = new Set(reservas(hoy, aISO(new Date(ahora.getTime() + 90 * 864e5))).map((r) => r.id));
    const r: ReservaPanel = {
      id: nuevoCodigo(existentes),
      token: null,
      especialidadId: esp!.id,
      profesionalId: prof!.id,
      fecha,
      hora,
      estado: pago === "recepcion" ? "confirmada" : "sin_deposito",
      reembolso: false,
      metodoPago: pago === "recepcion" ? "recepcion" : null,
      paciente: {
        nombre: paciente.nombre.trim(),
        apellidos: paciente.apellidos.trim(),
        dni: paciente.dni.trim().toUpperCase(),
        telefono: paciente.telefono.replace(/\s/g, ""),
        email: paciente.email.trim().toLowerCase(),
        motivo: paciente.motivo.trim(),
      },
      creadaEl: new Date().toISOString(),
      origen: "panel",
    };
    crearReserva(r);
    reiniciar();
    onCreada(r);
  };

  const campoTexto = (k: keyof typeof vacio, etiqueta: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`nr-${k}`} className="mb-1 block text-sm font-medium">{etiqueta}</label>
      <input
        id={`nr-${k}`}
        value={paciente[k]}
        onChange={(ev) => {
          setPaciente({ ...paciente, [k]: ev.target.value });
          if (errores[k]) setErrores((e) => sinClave(e, k));
        }}
        aria-invalid={!!errores[k]}
        className={`${claseCampo} ${errores[k] ? "border-red-400" : ""}`}
        {...props}
      />
      {errores[k] && <p className="mt-1 text-xs text-red-600">{errores[k]}</p>}
    </div>
  );

  return (
    <Cajon
      abierto={abierto}
      titulo="Nueva cita"
      subtitulo="Para citas pedidas por teléfono o en recepción"
      onCerrar={onCerrar}
      pie={
        <div className="flex gap-2">
          <button type="button" onClick={onCerrar} className={`${btn.secundario} flex-1`}>Cancelar</button>
          <button type="button" onClick={guardar} className={`${btn.primario} flex-1`}>Crear cita</button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-linea">
          <div>
            <label htmlFor="nr-esp" className="mb-1 block text-sm font-medium">Especialidad</label>
            <select
              id="nr-esp"
              value={espId}
              onChange={(e) => {
                setEspId(e.target.value);
                const lista = profesionales.filter((p) => p.activo && p.especialidadId === e.target.value);
                setProfId(lista.length === 1 ? lista[0].id : "");
                setHora("");
              }}
              className={claseCampo}
            >
              <option value="">Elige…</option>
              {especialidades.filter((e) => e.activa).map((e) => (
                <option key={e.id} value={e.id}>{e.nombre} · {e.duracionMin} min · {formatoEuros(e.precio)}</option>
              ))}
            </select>
            {errores.esp && <p className="mt-1 text-xs text-red-600">{errores.esp}</p>}
          </div>
          <div>
            <label htmlFor="nr-prof" className="mb-1 block text-sm font-medium">Profesional</label>
            <select id="nr-prof" value={profId} onChange={(e) => { setProfId(e.target.value); setHora(""); }} disabled={!espId} className={claseCampo}>
              <option value="">Elige…</option>
              {profs.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            {errores.prof && <p className="mt-1 text-xs text-red-600">{errores.prof}</p>}
          </div>
          <div>
            <label htmlFor="nr-fecha" className="mb-1 block text-sm font-medium">Día</label>
            <input id="nr-fecha" type="date" min={hoy} value={fecha} onChange={(e) => { setFecha(e.target.value); setHora(""); }} className={claseCampo} />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium">Hora</p>
            {!prof ? (
              <p className="text-sm text-tinta-tenue">Elige especialidad y profesional.</p>
            ) : festivo ? (
              <p className="text-sm text-ambar-700">Festivo: {festivo.descripcion}. La clínica está cerrada.</p>
            ) : horasLibres.length === 0 ? (
              <p className="text-sm text-tinta-tenue">Sin huecos libres este día.</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {horasLibres.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHora(h);
                      setErrores((e) => sinClave(e, "hora"));
                    }}
                    aria-pressed={hora === h}
                    className={`rounded-lg py-2 text-sm font-semibold tabular-nums transition ${
                      hora === h ? "bg-brand-500 text-white" : "bg-fondo ring-1 ring-linea hover:ring-brand-300"
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}
            {errores.hora && <p className="mt-1 text-xs text-red-600">{errores.hora}</p>}
          </div>
        </section>

        <section className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-linea sm:grid-cols-2">
          {campoTexto("nombre", "Nombre", { autoComplete: "off" })}
          {campoTexto("apellidos", "Apellidos", { autoComplete: "off" })}
          {campoTexto("telefono", "Teléfono", { type: "tel", inputMode: "tel" })}
          {campoTexto("dni", "DNI / NIE (opcional)")}
          <div className="sm:col-span-2">{campoTexto("email", "Email (opcional)", { type: "email" })}</div>
          <div className="sm:col-span-2">{campoTexto("motivo", "Motivo (opcional)")}</div>
        </section>

        <fieldset className="space-y-2 rounded-2xl bg-white p-4 ring-1 ring-linea">
          <legend className="sr-only">Anticipo</legend>
          <p className="text-sm font-medium">Anticipo {esp && <span className="text-ambar-600">({formatoEuros(esp.deposito)})</span>}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={pago === "sin_deposito"} onChange={() => setPago("sin_deposito")} className="accent-brand-500" />
            Sin anticipo: paga todo en la clínica
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={pago === "recepcion"} onChange={() => setPago("recepcion")} className="accent-brand-500" />
            Anticipo cobrado ahora en recepción
          </label>
        </fieldset>
      </div>
    </Cajon>
  );
}
