"use client";

import { useEffect, useRef, useState } from "react";
import { formatoEuros } from "@/lib/datos";
import type { Hueco } from "@/lib/agenda";
import { mensajeError, supabaseNavegador } from "@/lib/supabase/cliente";
import { useCatalogo } from "@/components/CatalogoProvider";
import BarraPasos from "./BarraPasos";
import Resumen from "./Resumen";
import Confirmacion from "./Confirmacion";
import { PasoDatos, PasoEspecialidad, PasoFecha, PasoPago, PasoProfesional, validarDatos } from "./Pasos";
import { datosVacios, type EstadoReserva } from "./tipos";

export default function Asistente({ especialidadInicial }: { especialidadInicial: string | null }) {
  const { especialidades: todasEsp, profesionales: todosProf, pagoOnline } = useCatalogo();
  const especialidades = todasEsp.filter((e) => e.activa);
  const profesionales = todosProf.filter((p) => p.activo);
  const valida = especialidades.some((e) => e.id === especialidadInicial) ? especialidadInicial : null;

  const [estado, setEstado] = useState<EstadoReserva>({
    especialidadId: valida,
    profesionalId: undefined,
    fecha: null,
    hueco: null,
    datos: datosVacios,
    metodoPago: "tarjeta",
  });
  const [paso, setPaso] = useState(valida ? 1 : 0);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [recargaHuecos, setRecargaHuecos] = useState(0);

  // La fecha actual solo se conoce en el navegador (evita desajustes con el servidor)
  const [ahora, setAhora] = useState<Date | null>(null);
  useEffect(() => setAhora(new Date()), []);

  // Al cambiar de paso, subir al principio
  const arriba = useRef<HTMLDivElement>(null);
  const primerRender = useRef(true);
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    arriba.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [paso, codigo]);

  const esp = especialidades.find((e) => e.id === estado.especialidadId);
  const soloUnProfesional =
    !!esp && profesionales.filter((p) => p.especialidadId === esp.id).length === 1;

  /* ----- Acciones ----- */

  const elegirEspecialidad = (id: string) => {
    if (id !== estado.especialidadId) {
      setEstado((s) => ({ ...s, especialidadId: id, profesionalId: undefined, fecha: null, hueco: null }));
    }
    setPaso(1);
  };

  const elegirProfesional = (id: string | null) => {
    if (id !== estado.profesionalId) {
      setEstado((s) => ({ ...s, profesionalId: id, fecha: null, hueco: null }));
    }
    setPaso(2);
  };

  const elegirFecha = (iso: string) =>
    setEstado((s) => ({ ...s, fecha: iso, hueco: s.fecha === iso ? s.hueco : null }));

  const elegirHueco = (h: Hueco) => setEstado((s) => ({ ...s, hueco: h }));

  const pagar = async () => {
    setPagando(true);
    setErrorPago(null);
    const { datos } = estado;
    // PAGO SIMULADO: aquí irá la pasarela (Redsys/Stripe). De momento se
    // registra la reserva directamente como confirmada.
    const { data, error } = await supabaseNavegador().rpc("crear_reserva", {
      p_especialidad_id: estado.especialidadId!,
      p_profesional_id: estado.hueco!.profesionalId,
      p_fecha: estado.fecha!,
      p_hora: estado.hueco!.hora,
      p_nombre: datos.nombre.trim(),
      p_apellidos: datos.apellidos.trim(),
      p_dni: datos.dni.trim().toUpperCase(),
      p_telefono: datos.telefono.replace(/\s/g, ""),
      p_email: datos.email.trim().toLowerCase(),
      p_motivo: datos.motivo.trim(),
      p_metodo_pago: estado.metodoPago,
    });
    const fila = data?.[0];
    if (error || !fila) {
      setPagando(false);
      const texto = mensajeError(error, "No se pudo completar la reserva. Inténtalo de nuevo.");
      // Si el hueco ya no está libre, volver a elegir hora con los huecos actualizados
      if (/hueco|disponible|horario/i.test(texto)) {
        setEstado((s) => ({ ...s, hueco: null }));
        setRecargaHuecos((n) => n + 1);
        setPaso(2);
      }
      setErrorPago(texto);
      return;
    }
    // ¿Hay que cobrar online? (lo decide la base de datos según los ajustes)
    const { data: cita } = await supabaseNavegador().rpc("obtener_reserva_por_token", { p_token: fila.token_acceso });
    if (cita?.[0]?.estado === "pendiente_pago") {
      const res = await fetch("/api/pago/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: fila.token_acceso }),
      }).catch(() => null);
      const cuerpo = (await res?.json().catch(() => ({}))) as { url?: string; error?: string } | undefined;
      if (res?.ok && cuerpo?.url) {
        window.location.href = cuerpo.url; // a la página de pago de Stripe
        return;
      }
      setPagando(false);
      setErrorPago(
        `${cuerpo?.error ?? "No se pudo abrir la página de pago."} Tu hueco está apartado 30 minutos: puedes reintentar el pago desde «Mi cita» con el código ${fila.id}.`
      );
      setToken(fila.token_acceso);
      return;
    }

    setPagando(false);
    setToken(fila.token_acceso);
    setCodigo(fila.id);
    // Email de confirmación (si falla, la reserva sigue hecha)
    void fetch("/api/cita/confirmada", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: fila.token_acceso }),
    }).catch(() => undefined);
  };

  const siguiente = () => {
    if (paso === 3) {
      if (Object.keys(validarDatos(estado.datos)).length > 0) {
        setMostrarErrores(true);
        // Llevar el foco al primer campo con error
        requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
        return;
      }
    }
    if (paso === 4) return void pagar();
    setErrorPago(null);
    setPaso((p) => p + 1);
  };

  const atras = () => {
    // Si solo hay un profesional, el paso 2 se salta también hacia atrás
    if (paso === 2 && soloUnProfesional) return setPaso(0);
    setPaso((p) => Math.max(0, p - 1));
  };

  // Con un único profesional, elegirlo automáticamente
  const unicoId = soloUnProfesional ? profesionales.find((p) => p.especialidadId === esp?.id)?.id : undefined;
  useEffect(() => {
    if (paso === 1 && unicoId) {
      setEstado((s) => (s.profesionalId === unicoId ? s : { ...s, profesionalId: unicoId, fecha: null, hueco: null }));
      setPaso(2);
    }
  }, [paso, unicoId]);

  /* ----- Render ----- */

  if (codigo) {
    return (
      <div ref={arriba} className="scroll-mt-24 py-6">
        <Confirmacion estado={estado} codigo={codigo} token={token} />
      </div>
    );
  }

  const puedeSeguir =
    (paso === 2 && !!estado.hueco) || paso === 3 || paso === 4;
  const textoBoton =
    paso === 4
      ? pagando
        ? pagoOnline
          ? "Abriendo el pago seguro…"
          : "Confirmando…"
        : `Pagar ${formatoEuros(esp?.deposito ?? 0)}${pagoOnline ? "" : " y confirmar"}`
      : "Continuar";

  return (
    <div ref={arriba} className="scroll-mt-24">
      <BarraPasos paso={paso} onIr={setPaso} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
        <div className="min-w-0">
          {/* Resumen compacto en móvil */}
          {esp && (
            <details className="group mb-6 rounded-2xl bg-white ring-1 ring-linea lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm [&::-webkit-details-marker]:hidden">
                <span>
                  <span className="font-semibold">{esp.nombre}</span>
                  {estado.hueco && <span className="text-tinta-suave"> · {estado.hueco.hora}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="rounded-md bg-ambar-50 px-2 py-0.5 font-semibold tabular-nums text-ambar-600">
                    {formatoEuros(esp.deposito)}
                  </span>
                  <span className="text-tinta-tenue transition group-open:rotate-180" aria-hidden="true">▾</span>
                </span>
              </summary>
              <div className="border-t border-linea p-2">
                <Resumen estado={estado} />
              </div>
            </details>
          )}

          {paso === 0 && <PasoEspecialidad seleccionada={estado.especialidadId} onElegir={elegirEspecialidad} />}
          {paso === 1 && esp && (
            <PasoProfesional especialidadId={esp.id} seleccionado={estado.profesionalId} onElegir={elegirProfesional} />
          )}
          {paso === 2 && esp && estado.profesionalId !== undefined && (
            ahora ? (
              <PasoFecha
                ahora={ahora}
                especialidadId={esp.id}
                profesionalId={estado.profesionalId}
                fecha={estado.fecha}
                hueco={estado.hueco}
                onFecha={elegirFecha}
                onHueco={elegirHueco}
                recarga={recargaHuecos}
              />
            ) : (
              <div className="h-96 animate-pulse rounded-2xl bg-white ring-1 ring-linea" />
            )
          )}
          {paso === 3 && (
            <PasoDatos
              datos={estado.datos}
              onCambiar={(d) => setEstado((s) => ({ ...s, datos: d }))}
              mostrarErrores={mostrarErrores}
            />
          )}
          {paso === 4 && esp && (
            <PasoPago
              deposito={esp.deposito}
              metodo={estado.metodoPago}
              onMetodo={(m) => setEstado((s) => ({ ...s, metodoPago: m }))}
            />
          )}

          {errorPago && (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {errorPago}
              {token && (
                <a href={`/mi-zona/cita/${token}`} className="mt-2 block font-semibold underline">
                  Ir a Mi cita para pagar
                </a>
              )}
            </p>
          )}

          {/* Navegación */}
          {paso > 0 && (
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-linea pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={atras}
                disabled={pagando}
                className="rounded-xl px-5 py-3 font-medium text-tinta-suave transition hover:bg-brand-50 hover:text-tinta disabled:opacity-50"
              >
                ← Atrás
              </button>
              {paso >= 2 && (
                <button
                  type="button"
                  onClick={siguiente}
                  disabled={!puedeSeguir || pagando}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-tinta-tenue/40 disabled:shadow-none ${
                    paso === 4 ? "bg-ambar-500 hover:bg-ambar-600" : "bg-brand-500 hover:bg-brand-600"
                  }`}
                >
                  {pagando && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                  )}
                  {textoBoton}
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Resumen estado={estado} />
          </div>
        </aside>
      </div>
    </div>
  );
}
