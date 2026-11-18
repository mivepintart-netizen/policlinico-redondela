"use client";

import { useEffect, useMemo, useState } from "react";
import { contacto, formatoEuros } from "@/lib/datos";
import { usePanel } from "./PanelProvider";
import { Cajon, btn, claseCampo } from "./ui";

/**
 * La secretaria envía al paciente el enlace para reservar y pagar el anticipo.
 * El enlace solo lleva la especialidad (nunca datos personales, que quedarían
 * guardados en historiales y registros).
 */
export default function EnviarEnlace({
  abierto,
  onCerrar,
  onAviso,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onAviso: (t: string) => void;
}) {
  const { especialidades, sesion } = usePanel();
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [espId, setEspId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editado, setEditado] = useState(false);
  const [origen, setOrigen] = useState("");

  useEffect(() => setOrigen(window.location.origin), []);

  const esp = especialidades.find((e) => e.id === espId);
  const tel = telefono.replace(/[\s.-]/g, "").replace(/^(\+34|0034)/, "");
  const telValido = /^[6789]\d{8}$/.test(tel);

  const enlace = `${origen}/reservar${espId ? `?especialidad=${espId}` : ""}`;

  const firma = sesion?.rol === "secretaria" ? sesion.nombre : contacto.recepcionista;

  const mensajeAuto = useMemo(() => {
    const saludo = nombre.trim() ? `Hola ${nombre.trim().split(" ")[0]},` : "Hola,";
    const que = esp ? `tu cita de ${esp.nombre.toLowerCase()}` : "tu cita";
    const anticipo = esp
      ? `Al reservar se paga un anticipo de ${formatoEuros(esp.deposito)} y el resto (${formatoEuros(esp.precio - esp.deposito)}) en la clínica.`
      : "Al reservar se paga una pequeña parte como anticipo y el resto en la clínica.";
    return `${saludo} soy ${firma} del Policlínico Redondela. Para reservar ${que}, entra aquí y elige el día y la hora que mejor te vengan:\n${enlace}\n\n${anticipo} Si cancelas con más de 24 h de antelación, te lo devolvemos.`;
  }, [nombre, esp, enlace, firma]);

  // El mensaje se regenera mientras la secretaria no lo haya editado a mano
  useEffect(() => {
    if (!editado) setMensaje(mensajeAuto);
  }, [mensajeAuto, editado]);

  const reiniciar = () => {
    setTelefono("");
    setNombre("");
    setEspId("");
    setEditado(false);
  };

  const hecho = (texto: string) => {
    onAviso(texto);
    reiniciar();
    onCerrar();
  };

  const copiar = async (texto: string, aviso: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      onAviso(aviso);
    } catch {
      onAviso("No se pudo copiar. Selecciona el texto y cópialo a mano.");
    }
  };

  const textoUrl = encodeURIComponent(mensaje);

  return (
    <Cajon
      abierto={abierto}
      titulo="Enviar enlace de reserva"
      subtitulo="El paciente elige día y hora y paga el anticipo desde su móvil"
      onCerrar={onCerrar}
      pie={
        <div className="grid gap-2 sm:grid-cols-2">
          {telValido ? (
            <>
              <a
                href={`https://wa.me/34${tel}?text=${textoUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => hecho(`Abriendo WhatsApp para ${tel}…`)}
                className={btn.primario}
              >
                Enviar por WhatsApp
              </a>
              <a href={`sms:+34${tel}?&body=${textoUrl}`} onClick={() => hecho(`Abriendo SMS para ${tel}…`)} className={btn.secundario}>
                Enviar por SMS
              </a>
            </>
          ) : (
            <>
              <button type="button" disabled className={btn.primario}>Enviar por WhatsApp</button>
              <button type="button" disabled className={btn.secundario}>Enviar por SMS</button>
            </>
          )}
          <button type="button" onClick={() => copiar(mensaje, "Mensaje copiado")} className={`${btn.fantasma} sm:col-span-2`}>
            Copiar mensaje
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-linea">
          <div>
            <label htmlFor="ee-tel" className="mb-1 block text-sm font-medium">Teléfono del paciente</label>
            <input
              id="ee-tel"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="600 123 456"
              className={`${claseCampo} text-base`}
            />
            {telefono && !telValido && <p className="mt-1 text-xs text-red-600">Escribe un móvil o fijo español de 9 cifras.</p>}
          </div>
          <div>
            <label htmlFor="ee-nombre" className="mb-1 block text-sm font-medium">
              Nombre <span className="font-normal text-tinta-tenue">(opcional)</span>
            </label>
            <input id="ee-nombre" autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ana Pérez" className={claseCampo} />
          </div>
          <div>
            <label htmlFor="ee-esp" className="mb-1 block text-sm font-medium">
              Especialidad <span className="font-normal text-tinta-tenue">(opcional)</span>
            </label>
            <select id="ee-esp" value={espId} onChange={(e) => setEspId(e.target.value)} className={claseCampo}>
              <option value="">Que la elija el paciente</option>
              {especialidades.filter((e) => e.activa).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} · anticipo {formatoEuros(e.deposito)}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 ring-1 ring-linea">
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="ee-msg" className="text-sm font-medium">Mensaje</label>
            {editado && (
              <button type="button" onClick={() => setEditado(false)} className="text-xs font-medium text-brand-600 hover:underline">
                Restaurar
              </button>
            )}
          </div>
          <textarea
            id="ee-msg"
            rows={8}
            value={mensaje}
            onChange={(e) => {
              setMensaje(e.target.value);
              setEditado(true);
            }}
            className={`${claseCampo} leading-relaxed`}
          />
          <div className="mt-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-mono text-xs text-tinta-tenue" title={enlace}>{enlace}</p>
            <button type="button" onClick={() => copiar(enlace, "Enlace copiado")} className="shrink-0 text-xs font-semibold text-brand-600 hover:underline">
              Copiar enlace
            </button>
          </div>
        </section>
      </div>
    </Cajon>
  );
}
