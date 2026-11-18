"use client";

import { useMemo } from "react";
import IlustracionEspecialidad from "@/components/IlustracionEspecialidad";
import { especialidades, formatoEuros, profesionales, turnos, type DiaSemana } from "@/lib/datos";
import { fechaLarga, huecosDelDia, type Hueco } from "@/lib/agenda";
import Calendario from "./Calendario";
import type { DatosPaciente, MetodoPago } from "./tipos";

/* ================================================================== */
/* Comunes                                                             */
/* ================================================================== */

export function TituloPaso({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{titulo}</h1>
      {texto && <p className="mt-2 text-tinta-suave">{texto}</p>}
    </div>
  );
}

const tarjetaSeleccionable = (activa: boolean) =>
  `w-full rounded-2xl bg-white text-left ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
    activa ? "ring-2 ring-brand-500 shadow-tarjeta" : "ring-linea hover:ring-brand-200 hover:shadow-tarjeta"
  }`;

/* ================================================================== */
/* 1. Especialidad                                                     */
/* ================================================================== */

export function PasoEspecialidad({
  seleccionada,
  onElegir,
}: {
  seleccionada: string | null;
  onElegir: (id: string) => void;
}) {
  return (
    <>
      <TituloPaso titulo="¿Qué necesitas?" texto="Elige la especialidad. Verás el precio y el anticipo antes de confirmar." />
      <ul className="grid gap-3 sm:grid-cols-2">
        {especialidades.map((esp) => (
          <li key={esp.id}>
            <button type="button" onClick={() => onElegir(esp.id)} className={`${tarjetaSeleccionable(seleccionada === esp.id)} flex items-center gap-4 p-3`} aria-pressed={seleccionada === esp.id}>
              <IlustracionEspecialidad id={esp.id} compacta className="h-16 w-16 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{esp.nombre}</span>
                <span className="mt-0.5 block text-sm text-tinta-tenue">
                  {esp.duracionMin} min · {formatoEuros(esp.precio)}
                </span>
                <span className="mt-1 inline-block rounded-md bg-ambar-50 px-1.5 py-0.5 text-xs font-medium text-ambar-700">
                  Anticipo {formatoEuros(esp.deposito)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ================================================================== */
/* 2. Profesional                                                      */
/* ================================================================== */

const NOMBRES_DIA: Record<DiaSemana, string> = {
  lun: "L", mar: "M", mie: "X", jue: "J", vie: "V", sab: "S", dom: "D",
};

function Iniciales({ nombre }: { nombre: string }) {
  const ini = nombre
    .replace(/^(Dra?\.)\s/, "")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-600">
      {ini}
    </span>
  );
}

export function PasoProfesional({
  especialidadId,
  seleccionado,
  onElegir,
}: {
  especialidadId: string;
  seleccionado: string | null | undefined;
  onElegir: (id: string | null) => void;
}) {
  const lista = profesionales.filter((p) => p.especialidadId === especialidadId);

  return (
    <>
      <TituloPaso titulo="¿Con quién?" texto="Si te da igual, elige «el primero disponible» y verás más huecos." />
      <ul className="space-y-3">
        {lista.length > 1 && (
          <li>
            <button type="button" onClick={() => onElegir(null)} className={`${tarjetaSeleccionable(seleccionado === null)} flex items-center gap-4 p-4`} aria-pressed={seleccionado === null}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
                </svg>
              </span>
              <span className="flex-1">
                <span className="block font-semibold">El primero disponible</span>
                <span className="block text-sm text-tinta-tenue">Más huecos, antes</span>
              </span>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600">Recomendado</span>
            </button>
          </li>
        )}
        {lista.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onElegir(p.id)} className={`${tarjetaSeleccionable(seleccionado === p.id)} flex items-center gap-4 p-4`} aria-pressed={seleccionado === p.id}>
              <Iniciales nombre={p.nombre} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.nombre}</span>
                <span className="block text-sm text-tinta-tenue">{p.rol}</span>
              </span>
              <span className="hidden gap-1 sm:flex" aria-label="Días que atiende">
                {(Object.keys(NOMBRES_DIA) as DiaSemana[]).filter((d) => d !== "dom").map((d) => (
                  <span
                    key={d}
                    title={p.horario[d] === "m" ? "Mañana" : p.horario[d] === "t" ? "Tarde" : p.horario[d] === "mt" ? "Mañana y tarde" : "No atiende"}
                    className={`grid h-6 w-6 place-items-center rounded-md text-[11px] font-medium ${
                      p.horario[d] ? "bg-brand-50 text-brand-700" : "text-tinta-tenue/50"
                    }`}
                  >
                    {NOMBRES_DIA[d]}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ================================================================== */
/* 3. Día y hora                                                       */
/* ================================================================== */

export function PasoFecha({
  ahora,
  especialidadId,
  profesionalId,
  fecha,
  hueco,
  onFecha,
  onHueco,
}: {
  ahora: Date;
  especialidadId: string;
  profesionalId: string | null;
  fecha: string | null;
  hueco: Hueco | null;
  onFecha: (iso: string) => void;
  onHueco: (h: Hueco) => void;
}) {
  const esp = especialidades.find((e) => e.id === especialidadId)!;

  // Cache simple de huecos por día para no recalcular en cada render
  const cache = useMemo(() => new Map<string, Hueco[]>(), []);
  const obtener = (iso: string) => {
    const k = `${profesionalId}|${iso}`;
    if (!cache.has(k)) cache.set(k, huecosDelDia(especialidadId, profesionalId, iso, esp.duracionMin, ahora));
    return cache.get(k)!;
  };

  const huecos = fecha ? obtener(fecha) : [];
  const finManana = turnos.m.fin;
  const manana = huecos.filter((h) => h.hora < finManana);
  const tarde = huecos.filter((h) => h.hora >= finManana);

  const grupo = (titulo: string, lista: Hueco[]) =>
    lista.length === 0 ? null : (
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-tinta-tenue">{titulo}</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {lista.map((h) => {
            const activo = hueco?.hora === h.hora;
            return (
              <li key={h.hora}>
                <button
                  type="button"
                  onClick={() => onHueco(h)}
                  aria-pressed={activo}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold tabular-nums transition ${
                    activo ? "bg-brand-500 text-white shadow-sm" : "bg-white text-tinta ring-1 ring-linea hover:ring-brand-300"
                  }`}
                >
                  {h.hora}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <>
      <TituloPaso titulo="Elige día y hora" texto="Los días marcados tienen huecos libres." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Calendario ahora={ahora} seleccionada={fecha} huecosPorDia={(iso) => obtener(iso).length} onElegir={onFecha} />

        <div>
          {!fecha ? (
            <div className="grid h-full min-h-40 place-items-center rounded-2xl border border-dashed border-linea p-6 text-center text-sm text-tinta-tenue">
              Selecciona un día en el calendario para ver las horas libres.
            </div>
          ) : (
            <div className="space-y-5">
              <p className="font-semibold">{fechaLarga(fecha)}</p>
              {grupo("Mañana", manana)}
              {grupo("Tarde", tarde)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ================================================================== */
/* 4. Datos del paciente                                               */
/* ================================================================== */

const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";

export function dniValido(valor: string) {
  const v = valor.toUpperCase().replace(/[\s-]/g, "");
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(v);
  if (!m) return false;
  const [, pre, num, letra] = m;
  if (pre && num.length !== 7) return false;
  if (!pre && num.length !== 8) return false;
  const n = Number((pre ? "XYZ".indexOf(pre) : "") + num);
  return LETRAS_DNI[n % 23] === letra;
}

export function validarDatos(d: DatosPaciente) {
  const e: Partial<Record<keyof DatosPaciente, string>> = {};
  if (!d.nombre.trim()) e.nombre = "Escribe tu nombre";
  if (!d.apellidos.trim()) e.apellidos = "Escribe tus apellidos";
  if (!dniValido(d.dni)) e.dni = "DNI o NIE no válido (ej. 12345678Z)";
  if (!/^[6789]\d{8}$/.test(d.telefono.replace(/[\s+]/g, "").replace(/^34/, "")))
    e.telefono = "Teléfono no válido (9 cifras)";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = "Email no válido";
  if (!d.acepta) e.acepta = "Debes aceptar para continuar";
  return e;
}

function Campo({
  id,
  etiqueta,
  error,
  children,
  opcional,
  ayuda,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  children: React.ReactNode;
  opcional?: boolean;
  ayuda?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {etiqueta} {opcional && <span className="font-normal text-tinta-tenue">(opcional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : ayuda ? (
        <p className="mt-1.5 text-xs text-tinta-tenue">{ayuda}</p>
      ) : null}
    </div>
  );
}

const claseInput = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-3 text-base outline-none transition placeholder:text-tinta-tenue/70 focus:ring-4 ${
    error ? "border-red-400 focus:ring-red-100" : "border-linea focus:border-brand-400 focus:ring-brand-500/10"
  }`;

export function PasoDatos({
  datos,
  onCambiar,
  mostrarErrores,
}: {
  datos: DatosPaciente;
  onCambiar: (d: DatosPaciente) => void;
  mostrarErrores: boolean;
}) {
  const errores = mostrarErrores ? validarDatos(datos) : {};
  const set = <K extends keyof DatosPaciente>(k: K, v: DatosPaciente[K]) => onCambiar({ ...datos, [k]: v });
  const input = (k: "nombre" | "apellidos" | "dni" | "telefono" | "email", props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      id={k}
      value={datos[k]}
      onChange={(e) => set(k, e.target.value)}
      aria-invalid={!!errores[k]}
      aria-describedby={errores[k] ? `${k}-error` : undefined}
      className={claseInput(errores[k])}
      {...props}
    />
  );

  return (
    <>
      <TituloPaso titulo="Tus datos" texto="No necesitas crear una cuenta. Te enviaremos la confirmación por email." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre" error={errores.nombre}>
          {input("nombre", { autoComplete: "given-name" })}
        </Campo>
        <Campo id="apellidos" etiqueta="Apellidos" error={errores.apellidos}>
          {input("apellidos", { autoComplete: "family-name" })}
        </Campo>
        <Campo id="dni" etiqueta="DNI / NIE" error={errores.dni}>
          {input("dni", { placeholder: "12345678Z", autoCapitalize: "characters" })}
        </Campo>
        <Campo id="telefono" etiqueta="Teléfono" error={errores.telefono}>
          {input("telefono", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "600 123 456" })}
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="email" etiqueta="Email" error={errores.email} ayuda="Aquí recibirás la confirmación y el enlace para gestionar tu cita.">
            {input("email", { type: "email", inputMode: "email", autoComplete: "email", placeholder: "tu@email.com" })}
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <Campo id="motivo" etiqueta="Motivo de la consulta" opcional>
            <textarea
              id="motivo"
              rows={3}
              value={datos.motivo}
              onChange={(e) => set("motivo", e.target.value)}
              placeholder="Cuéntanos brevemente qué te pasa. Ayuda al profesional a preparar la cita."
              className={claseInput()}
            />
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer gap-3 rounded-xl bg-white p-4 ring-1 ring-linea">
            <input
              type="checkbox"
              checked={datos.acepta}
              onChange={(e) => set("acepta", e.target.checked)}
              aria-invalid={!!errores.acepta}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand-500"
            />
            <span className="text-sm text-tinta-suave">
              Acepto la <a href="#" className="font-medium text-brand-600 underline">política de privacidad</a> y la{" "}
              <a href="#" className="font-medium text-brand-600 underline">política de cancelación</a>: el anticipo se
              devuelve si cancelo con al menos 24 horas de antelación.
            </span>
          </label>
          {errores.acepta && <p className="mt-1.5 text-sm text-red-600">{errores.acepta}</p>}
        </div>
      </div>
    </>
  );
}

/* ================================================================== */
/* 5. Pago                                                             */
/* ================================================================== */

export function PasoPago({
  deposito,
  metodo,
  onMetodo,
}: {
  deposito: number;
  metodo: MetodoPago;
  onMetodo: (m: MetodoPago) => void;
}) {
  const opciones: { id: MetodoPago; nombre: string; texto: string; icono: React.ReactNode }[] = [
    {
      id: "tarjeta",
      nombre: "Tarjeta",
      texto: "Visa, Mastercard, Maestro",
      icono: (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="M3 10h18M7 15h3" />
        </>
      ),
    },
    {
      id: "bizum",
      nombre: "Bizum",
      texto: "Con tu número de móvil",
      icono: (
        <>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18.5h2" />
        </>
      ),
    },
  ];

  return (
    <>
      <TituloPaso titulo="Paga el anticipo" texto={`Confirmas tu cita pagando ahora ${formatoEuros(deposito)}. El resto lo pagas en la clínica.`} />

      <div className="mb-6 flex items-center justify-between rounded-2xl bg-ambar-50 p-5 ring-1 ring-ambar-100">
        <div>
          <p className="text-sm font-medium text-ambar-700">A pagar ahora</p>
          <p className="text-xs text-ambar-700/80">Reembolsable hasta 24 h antes</p>
        </div>
        <p className="text-3xl font-semibold tabular-nums text-ambar-600">{formatoEuros(deposito)}</p>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Método de pago</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {opciones.map((o) => (
            <label key={o.id} className={`${tarjetaSeleccionable(metodo === o.id)} flex cursor-pointer items-center gap-4 p-4`}>
              <input type="radio" name="metodo" value={o.id} checked={metodo === o.id} onChange={() => onMetodo(o.id)} className="sr-only" />
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${metodo === o.id ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {o.icono}
                </svg>
              </span>
              <span>
                <span className="block font-semibold">{o.nombre}</span>
                <span className="block text-sm text-tinta-tenue">{o.texto}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-6 flex gap-2 rounded-xl bg-white p-4 text-sm text-tinta-suave ring-1 ring-linea">
        <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="9" width="12" height="8" rx="1.5" />
          <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
        </svg>
        <span>
          Al pulsar «Pagar» irás a la pasarela de pago segura de tu banco.{" "}
          <strong className="font-medium text-tinta">Versión de prueba: no se realiza ningún cargo.</strong>
        </span>
      </p>
    </>
  );
}
