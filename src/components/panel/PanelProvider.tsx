"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { aEspecialidad, aProfesional, type Especialidad, type Festivo, type Profesional } from "@/lib/catalogo";
import { aColumnas, desdeFila, type ReservaPanel, type SesionPanel } from "@/lib/panel";
import { mensajeError, supabaseNavegador } from "@/lib/supabase/cliente";

/**
 * Estado del panel conectado a Supabase.
 * La seguridad la ponen las reglas de la base de datos: aunque alguien
 * manipulase esta página, sin ser usuario del panel no puede leer ni
 * modificar nada.
 */

export type NuevaReservaPanel = Omit<ReservaPanel, "id" | "token" | "creadaEl" | "reembolso">;

type Resultado = string | null; // null = sin error; texto = mensaje de error

type Contexto = {
  listo: boolean;
  ahora: Date;
  sesion: SesionPanel | null;
  iniciarSesion: (email: string, clave: string) => Promise<Resultado>;
  cerrarSesion: () => Promise<void>;

  especialidades: Especialidad[];
  profesionales: Profesional[];
  festivos: Festivo[];

  /** Se incrementa tras cada cambio para que las listas se recarguen */
  version: number;
  cargarReservas: (desde: string, hasta: string) => Promise<ReservaPanel[]>;
  actualizarReserva: (r: ReservaPanel, cambios: Partial<ReservaPanel>) => Promise<Resultado>;
  crearReserva: (r: NuevaReservaPanel) => Promise<{ id?: string; error: Resultado }>;

  guardarProfesional: (p: Profesional, nuevo?: boolean) => Promise<Resultado>;
  guardarEspecialidades: (e: Especialidad[]) => Promise<Resultado>;
  anadirFestivo: (f: Festivo) => Promise<Resultado>;
  borrarFestivo: (fecha: string) => Promise<Resultado>;
};

const Ctx = createContext<Contexto | null>(null);

export function usePanel() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePanel debe usarse dentro de <PanelProvider>");
  return c;
}

/** Reservas entre dos fechas, recargadas tras cada cambio y cada minuto. */
export function useReservas(desde: string, hasta: string) {
  const { cargarReservas, version, sesion } = usePanel();
  const [reservas, setReservas] = useState<ReservaPanel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    const alVolver = () => document.visibilityState === "visible" && setTick((n) => n + 1);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  useEffect(() => {
    if (!sesion) return;
    let vigente = true;
    cargarReservas(desde, hasta)
      .then((r) => {
        if (vigente) {
          setReservas(r);
          setError(null);
        }
      })
      .catch((e) => vigente && setError(mensajeError(e, "No se pudieron cargar las reservas.")));
    return () => {
      vigente = false;
    };
  }, [cargarReservas, desde, hasta, version, tick, sesion]);

  // Al cambiar de rango, no mostrar las del rango anterior
  useEffect(() => setReservas(null), [desde, hasta]);

  return { reservas, error, cargando: reservas === null && !error };
}

export default function PanelProvider({ children }: { children: React.ReactNode }) {
  const sb = supabaseNavegador();
  const [sesion, setSesion] = useState<SesionPanel | null>(null);
  const [listo, setListo] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [version, setVersion] = useState(0);

  const recargarCatalogo = useCallback(async () => {
    const [e, p, f] = await Promise.all([
      sb.from("especialidades").select("*").order("orden").order("nombre"),
      sb.from("profesionales").select("*").order("orden").order("nombre"),
      sb.from("festivos").select("*").order("fecha"),
    ]);
    if (e.data) setEspecialidades(e.data.map(aEspecialidad));
    if (p.data) setProfesionales(p.data.map(aProfesional));
    if (f.data) setFestivos(f.data);
  }, [sb]);

  /** Comprueba que el usuario con sesión es del panel y carga su ficha. */
  const cargarSesion = useCallback(async (): Promise<SesionPanel | null> => {
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return null;
    const { data: ficha } = await sb.from("usuarios_panel").select("*").eq("id", u.user.id).maybeSingle();
    if (!ficha) return null;
    return { id: ficha.id, email: u.user.email ?? "", nombre: ficha.nombre, rol: ficha.rol };
  }, [sb]);

  useEffect(() => {
    let vigente = true;
    cargarSesion().then(async (s) => {
      if (!vigente) return;
      setSesion(s);
      if (s) await recargarCatalogo();
      setListo(true);
    });
    // Si la sesión caduca o se cierra en otra pestaña
    const { data: sub } = sb.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") setSesion(null);
    });
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => {
      vigente = false;
      sub.subscription.unsubscribe();
      clearInterval(t);
    };
  }, [sb, cargarSesion, recargarCatalogo]);

  const iniciarSesion = useCallback(
    async (email: string, clave: string): Promise<Resultado> => {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: clave });
      if (error) {
        if (/invalid login/i.test(error.message)) return "Email o contraseña incorrectos.";
        if (/email not confirmed/i.test(error.message)) return "Este usuario no está confirmado. Confírmalo en Supabase (Authentication → Users).";
        return mensajeError(error, "No se pudo iniciar sesión.");
      }
      const s = await cargarSesion();
      if (!s) {
        await sb.auth.signOut();
        return "Este usuario no tiene acceso al panel. Pide al administrador que lo dé de alta.";
      }
      await recargarCatalogo();
      setSesion(s);
      return null;
    },
    [sb, cargarSesion, recargarCatalogo]
  );

  const cerrarSesion = useCallback(async () => {
    await sb.auth.signOut();
    setSesion(null);
  }, [sb]);

  const cargarReservas = useCallback(
    async (desde: string, hasta: string) => {
      // Paginado: Supabase devuelve como máximo 1000 filas por consulta
      const filas: ReservaPanel[] = [];
      for (let desdeFilaN = 0; ; desdeFilaN += 1000) {
        const { data, error } = await sb
          .from("reservas")
          .select("*")
          .gte("fecha", desde)
          .lte("fecha", hasta)
          .order("fecha")
          .order("hora")
          .range(desdeFilaN, desdeFilaN + 999);
        if (error) throw error;
        filas.push(...(data ?? []).map(desdeFila));
        if (!data || data.length < 1000) break;
      }
      return filas;
    },
    [sb]
  );

  const tras = useCallback(<T extends { error: unknown }>(r: T, porDefecto: string): Resultado => {
    if (r.error) return mensajeError(r.error, porDefecto);
    setVersion((v) => v + 1);
    return null;
  }, []);

  const valor: Contexto = useMemo(
    () => ({
      listo,
      ahora,
      sesion,
      iniciarSesion,
      cerrarSesion,
      especialidades,
      profesionales,
      festivos,
      version,
      cargarReservas,

      actualizarReserva: async (r, cambios) => {
        const res = await sb.from("reservas").update(aColumnas(cambios)).eq("id", r.id);
        if (res.error?.code === "23505") return "Ese hueco ya está ocupado.";
        return tras(res, "No se pudo guardar el cambio.");
      },

      crearReserva: async (r) => {
        const res = await sb
          .from("reservas")
          .insert({
            especialidad_id: r.especialidadId,
            profesional_id: r.profesionalId,
            fecha: r.fecha,
            hora: r.hora,
            precio: r.precio,
            deposito: r.deposito,
            estado: r.estado,
            metodo_pago: r.metodoPago,
            paciente_nombre: r.paciente.nombre,
            paciente_apellidos: r.paciente.apellidos,
            paciente_dni: r.paciente.dni,
            paciente_telefono: r.paciente.telefono,
            paciente_email: r.paciente.email,
            paciente_motivo: r.paciente.motivo,
            origen: "panel",
          })
          .select("id")
          .single();
        if (res.error?.code === "23505") return { error: "Alguien acaba de ocupar ese hueco. Elige otra hora." };
        const error = tras(res, "No se pudo crear la cita.");
        return { id: res.data?.id, error };
      },

      guardarProfesional: async (p, nuevo = false) => {
        const fila = {
          id: p.id,
          nombre: p.nombre,
          rol: p.rol,
          especialidad_id: p.especialidadId,
          horario: p.horario,
          activo: p.activo,
          orden: p.orden,
        };
        const res = nuevo ? await sb.from("profesionales").insert(fila) : await sb.from("profesionales").update(fila).eq("id", p.id);
        const error = tras(res, "No se pudo guardar el profesional.");
        if (!error) setProfesionales((l) => (nuevo ? [...l, p] : l.map((x) => (x.id === p.id ? p : x))));
        return error;
      },

      guardarEspecialidades: async (lista) => {
        const res = await sb.from("especialidades").upsert(
          lista.map((e) => ({
            id: e.id,
            nombre: e.nombre,
            descripcion_corta: e.descripcionCorta,
            duracion_min: e.duracionMin,
            precio: e.precio,
            deposito: e.deposito,
            activa: e.activa,
            orden: e.orden,
          }))
        );
        const error = tras(res, "No se pudieron guardar los cambios.");
        if (!error) setEspecialidades(lista);
        return error;
      },

      anadirFestivo: async (f) => {
        const res = await sb.from("festivos").insert(f);
        if (res.error?.code === "23505") return "Ese día ya está marcado como festivo.";
        const error = tras(res, "No se pudo añadir el festivo.");
        if (!error) setFestivos((l) => [...l, f].sort((a, b) => a.fecha.localeCompare(b.fecha)));
        return error;
      },

      borrarFestivo: async (fecha) => {
        const res = await sb.from("festivos").delete().eq("fecha", fecha);
        const error = tras(res, "No se pudo eliminar el festivo.");
        if (!error) setFestivos((l) => l.filter((x) => x.fecha !== fecha));
        return error;
      },
    }),
    [sb, listo, ahora, sesion, iniciarSesion, cerrarSesion, especialidades, profesionales, festivos, version, cargarReservas, tras]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
