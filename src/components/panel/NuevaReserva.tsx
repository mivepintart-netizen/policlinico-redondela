"use client";

import { useEffect, useMemo, useState } from "react";
import { aISO, horasDelProfesional, momento } from "@/lib/agenda";
import { formatoEuros } from "@/lib/datos";

import { dniValido } from "@/components/reserva/Pasos";
import { usePanel, useReservas, type NuevaReservaPanel } from "./PanelProvider";
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
  onCreada: (r: NuevaReservaPanel & { id: string }) => void;
}) {
  const { especialidades, profesionales, festivos, crearReserva, ahora } = usePanel();
  const hoy = aISO(ahora);

  const [espId, setEspId] = useState("");
  const [profId, setProfId] = useState("");
  const [fecha, setFecha] = useState(fechaInicial && fechaInicial >= hoy ? fechaInicial : hoy);
  const [hora, setHora] = useState("");
  const [paciente, setPaciente] = useState(vacio);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const { reservas: delDia } = useReservas(fecha, fecha);

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
    if (!prof || !esp || festivo || !delDia) return [];
    const ocupadas = new Set(
      delDia.filter((r) => r.profesionalId === prof.id && r.estado !== "cancelada").map((r) => r.hora)
    );
    return horasDelProfesional(prof, fecha, esp.duracionMin).filter((h) => !ocupadas.has(h) && momento(fecha, h) > ahora);
  }, [prof, esp, festivo, delDia, fecha, ahora]);

  const reiniciar = () => {
    setEspId("");
    setProfId("");
    setHora("");
    setPaciente(vacio);
    setErrores({});
  };

  const guardar = async () => {
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

    const r: NuevaReservaPanel = {
      especialidadId: esp!.id,
      profesionalId: prof!.id,
      fecha,
      hora,
      // Precio actual de la especialidad
      precio: esp!.precio,
      deposito: 0,
      // Sin tarjeta en garantía: el paciente paga todo en la clínica
      estado: "sin_deposito",
      metodoPago: null,
      paciente: {
        nombre: paciente.nombre.trim(),
        apellidos: paciente.apellidos.trim(),
        dni: paciente.dni.trim().toUpperCase(),
        telefono: paciente.telefono.replace(/\s/g, ""),
        email: paciente.email.trim().toLowerCase(),
        motivo: paciente.motivo.trim(),
      },
      origen: "panel",
    };
    setGuardando(true);
    setErrorGuardar(null);
    const { id, error } = await crearReserva(r);
    setGuardando(false);
    if (error || !id) {
      setErrorGuardar(error ?? "No se pudo crear la cita.");
      setHora("");
      return;
    }
    reiniciar();
    onCreada({ ...r, id });
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
          <button type="button" onClick={() => void guardar()} disabled={guardando} className={`${btn.primario} flex-1`}>
            {guardando ? "Guardando…" : "Crear cita"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {errorGuardar && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorGuardar}</p>}
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

        <p className="rounded-2xl bg-ambar-50 p-4 text-sm text-ambar-700 ring-1 ring-ambar-100">
          Las citas creadas aquí <strong className="font-semibold">no tienen tarjeta en garantía</strong>
          {esp && <> (el paciente paga {formatoEuros(esp.precio)} en la clínica)</>}. Si quieres que deje su tarjeta, usa
          «Enviar enlace de reserva».
        </p>
      </div>
    </Cajon>
  );
}
