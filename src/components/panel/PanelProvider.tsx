"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { festivos as festivosBase } from "@/lib/datos";
import { actualizar as actualizarReservaWeb } from "@/lib/reservasDemo";
import {
  especialidadesIniciales,
  profesionalesIniciales,
  reservasEnRango,
  type EspecialidadPanel,
  type FestivoPanel,
  type ProfesionalPanel,
  type ReservaPanel,
  type SesionPanel,
} from "@/lib/panel";

/**
 * Estado del panel en la versión de prueba. Se guarda en localStorage.
 * Con Supabase, cada acción será una consulta a la base de datos.
 */

type Datos = {
  cambios: Record<string, Partial<ReservaPanel>>;
  nuevas: ReservaPanel[];
  profesionales: ProfesionalPanel[];
  especialidades: EspecialidadPanel[];
  festivos: FestivoPanel[];
};

const iniciales: Datos = {
  cambios: {},
  nuevas: [],
  profesionales: profesionalesIniciales,
  especialidades: especialidadesIniciales,
  festivos: festivosBase,
};

const CLAVE_DATOS = "rdn-panel";
const CLAVE_SESION = "rdn-panel-sesion";

type Contexto = Datos & {
  listo: boolean;
  ahora: Date;
  sesion: SesionPanel | null;
  iniciarSesion: (s: SesionPanel) => void;
  cerrarSesion: () => void;
  reservas: (desde: string, hasta: string) => ReservaPanel[];
  actualizarReserva: (r: ReservaPanel, cambios: Partial<ReservaPanel>) => void;
  crearReserva: (r: ReservaPanel) => void;
  guardarProfesionales: (p: ProfesionalPanel[]) => void;
  guardarEspecialidades: (e: EspecialidadPanel[]) => void;
  guardarFestivos: (f: FestivoPanel[]) => void;
  restablecer: () => void;
};

const Ctx = createContext<Contexto | null>(null);

export function usePanel() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePanel debe usarse dentro de <PanelProvider>");
  return c;
}

function leer<T>(almacen: "local" | "session", clave: string): T | null {
  try {
    const v = (almacen === "local" ? localStorage : sessionStorage).getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function escribir(almacen: "local" | "session", clave: string, valor: unknown) {
  try {
    const a = almacen === "local" ? localStorage : sessionStorage;
    if (valor === null) a.removeItem(clave);
    else a.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento disponible */
  }
}

export default function PanelProvider({ children }: { children: React.ReactNode }) {
  const [datos, setDatos] = useState<Datos>(iniciales);
  const [sesion, setSesion] = useState<SesionPanel | null>(null);
  const [listo, setListo] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  // Fuerza recalcular cuando cambian reservas web (guardadas fuera de este estado)
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const guardados = leer<Partial<Datos>>("local", CLAVE_DATOS);
    if (guardados) setDatos({ ...iniciales, ...guardados });
    setSesion(leer<SesionPanel>("session", CLAVE_SESION));
    setAhora(new Date());
    setListo(true);
    // Refrescar la hora cada minuto
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const cambiar = useCallback((f: (d: Datos) => Datos) => {
    setDatos((d) => {
      const n = f(d);
      escribir("local", CLAVE_DATOS, n);
      return n;
    });
  }, []);

  const reservas = useCallback(
    (desde: string, hasta: string) => reservasEnRango(desde, hasta, ahora, datos.cambios, datos.nuevas),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ahora, datos.cambios, datos.nuevas, version]
  );

  const actualizarReserva = useCallback(
    (r: ReservaPanel, c: Partial<ReservaPanel>) => {
      if (r.origen === "panel" && datos.nuevas.some((n) => n.id === r.id)) {
        cambiar((d) => ({ ...d, nuevas: d.nuevas.map((n) => (n.id === r.id ? { ...n, ...c } : n)) }));
        return;
      }
      cambiar((d) => ({ ...d, cambios: { ...d.cambios, [r.id]: { ...d.cambios[r.id], ...c } } }));
      // Si es una reserva del paciente, que también lo vea en Mi zona
      if (r.token) {
        const { estado, reembolso, fecha, hora, profesionalId } = c;
        const paraWeb = Object.fromEntries(
          Object.entries({ estado, reembolso, fecha, hora, profesionalId }).filter(([, v]) => v !== undefined)
        );
        if (paraWeb.estado === "sin_deposito") delete paraWeb.estado;
        actualizarReservaWeb(r.token, paraWeb);
        setVersion((v) => v + 1);
      }
    },
    [cambiar, datos.nuevas]
  );

  const valor: Contexto = useMemo(
    () => ({
      ...datos,
      listo,
      ahora,
      sesion,
      iniciarSesion: (s) => {
        escribir("session", CLAVE_SESION, s);
        setSesion(s);
      },
      cerrarSesion: () => {
        escribir("session", CLAVE_SESION, null);
        setSesion(null);
      },
      reservas,
      actualizarReserva,
      crearReserva: (r) => cambiar((d) => ({ ...d, nuevas: [...d.nuevas, r] })),
      guardarProfesionales: (p) => cambiar((d) => ({ ...d, profesionales: p })),
      guardarEspecialidades: (e) => cambiar((d) => ({ ...d, especialidades: e })),
      guardarFestivos: (f) => cambiar((d) => ({ ...d, festivos: [...f].sort((a, b) => a.fecha.localeCompare(b.fecha)) })),
      restablecer: () => cambiar(() => iniciales),
    }),
    [datos, listo, ahora, sesion, reservas, actualizarReserva, cambiar]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
