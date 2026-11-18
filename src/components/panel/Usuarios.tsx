"use client";

import { useCallback, useEffect, useState } from "react";
import type { RolPanel } from "@/lib/database.types";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { Cabecera, Cajon, Toast, btn, claseCampo, claseCampoBase } from "./ui";

type Usuario = { id: string; nombre: string; rol: RolPanel; email: string; ultimoAcceso: string | null; soyYo: boolean };

async function api(metodo: "GET" | "POST" | "PATCH" | "DELETE", cuerpo?: unknown) {
  const { data } = await supabaseNavegador().auth.getSession();
  const res = await fetch("/api/panel/usuarios", {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  }).catch(() => null);
  const json = (await res?.json().catch(() => ({}))) as { error?: string; usuarios?: Usuario[] };
  if (!res?.ok) throw new Error(json.error ?? "No hay conexión");
  return json;
}

const ROLES: { id: RolPanel; texto: string; ayuda: string }[] = [
  { id: "secretaria", texto: "Secretaria", ayuda: "Agenda, reservas, citas telefónicas y festivos" },
  { id: "admin", texto: "Administrador", ayuda: "Todo, también precios, profesionales y usuarios" },
];

/** Contraseña aleatoria fácil de dictar (sin caracteres que se confunden). */
function claveAleatoria() {
  const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = new Uint32Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => c[n % c.length]).join("");
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const cerrarAviso = useCallback(() => setAviso(null), []);

  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ email: "", nombre: "", rol: "secretaria" as RolPanel, clave: "" });
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [claveCreada, setClaveCreada] = useState<{ email: string; clave: string } | null>(null);

  const cargar = useCallback(() => {
    api("GET")
      .then((r) => setUsuarios(r.usuarios ?? []))
      .catch((e: Error) => setErrorCarga(e.message));
  }, []);
  useEffect(cargar, [cargar]);

  const crear = async () => {
    setGuardando(true);
    setErrorForm(null);
    try {
      await api("POST", form);
      setClaveCreada({ email: form.email.trim().toLowerCase(), clave: form.clave });
      setNuevo(false);
      setForm({ email: "", nombre: "", rol: "secretaria", clave: "" });
      cargar();
    } catch (e) {
      setErrorForm((e as Error).message);
    }
    setGuardando(false);
  };

  const cambiarRol = async (u: Usuario, rol: RolPanel) => {
    try {
      await api("PATCH", { id: u.id, rol });
      setAviso(`${u.nombre} ahora es ${rol === "admin" ? "administrador" : "secretaria"}`);
      cargar();
    } catch (e) {
      setAviso((e as Error).message);
    }
  };

  const restablecer = async (u: Usuario) => {
    const clave = claveAleatoria();
    if (!confirm(`¿Poner una contraseña nueva a ${u.nombre}? La actual dejará de funcionar.`)) return;
    try {
      await api("PATCH", { id: u.id, clave });
      setClaveCreada({ email: u.email, clave });
    } catch (e) {
      setAviso((e as Error).message);
    }
  };

  const quitar = async (u: Usuario) => {
    if (!confirm(`¿Quitar el acceso al panel a ${u.nombre} (${u.email})? No podrá volver a entrar.`)) return;
    try {
      await api("DELETE", { id: u.id });
      setAviso(`${u.nombre} ya no tiene acceso`);
      cargar();
    } catch (e) {
      setAviso((e as Error).message);
    }
  };

  return (
    <>
      <Cabecera titulo="Usuarios" texto="Personal de la clínica con acceso a este panel.">
        <button
          type="button"
          onClick={() => {
            setForm((f) => ({ ...f, clave: claveAleatoria() }));
            setNuevo(true);
          }}
          className={btn.primario}
        >
          + Añadir usuario
        </button>
      </Cabecera>

      {claveCreada && (
        <div role="status" className="mb-6 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100">
          <p className="font-semibold text-brand-800">Contraseña lista. Pásasela a la persona en mano o por teléfono:</p>
          <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
            <dt className="text-tinta-suave">Email</dt>
            <dd className="font-medium">{claveCreada.email}</dd>
            <dt className="text-tinta-suave">Contraseña</dt>
            <dd className="font-mono text-lg font-semibold tracking-wider">{claveCreada.clave}</dd>
          </dl>
          <p className="mt-3 text-xs text-tinta-suave">
            No se volverá a mostrar. Al entrar, puede cambiarla en «Cambiar mi contraseña».
          </p>
          <button type="button" onClick={() => setClaveCreada(null)} className={`${btn.secundario} mt-3`}>
            Ya la he apuntado
          </button>
        </div>
      )}

      {errorCarga && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {errorCarga}. Comprueba que la clave secreta de Supabase está bien en Vercel.
        </p>
      )}
      {!usuarios && !errorCarga && <p className="text-sm text-tinta-tenue">Cargando…</p>}

      {usuarios && (
        <ul className="divide-y divide-linea rounded-2xl bg-white ring-1 ring-linea">
          {usuarios.map((u) => (
            <li key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {u.nombre} {u.soyYo && <span className="ml-1 rounded-md bg-fondo px-1.5 py-0.5 text-xs font-medium text-tinta-suave">tú</span>}
                </p>
                <p className="truncate text-sm text-tinta-suave">{u.email}</p>
                <p className="text-xs text-tinta-tenue">
                  {u.ultimoAcceso
                    ? `Último acceso: ${new Date(u.ultimoAcceso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                    : "Aún no ha entrado"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`rol-${u.id}`}>Rol de {u.nombre}</label>
                <select
                  id={`rol-${u.id}`}
                  value={u.rol}
                  disabled={u.soyYo}
                  onChange={(e) => void cambiarRol(u, e.target.value as RolPanel)}
                  className={`${claseCampoBase} w-auto py-2`}
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.texto}</option>
                  ))}
                </select>
                {!u.soyYo && (
                  <>
                    <button type="button" onClick={() => void restablecer(u)} className={btn.fantasma}>
                      Nueva contraseña
                    </button>
                    <button type="button" onClick={() => void quitar(u)} className={`${btn.fantasma} text-red-700 hover:bg-red-50 hover:text-red-700`}>
                      Quitar acceso
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Cajon
        abierto={nuevo}
        titulo="Añadir usuario"
        subtitulo="Podrá entrar al panel con este email y contraseña"
        onCerrar={() => setNuevo(false)}
        pie={
          <div className="flex gap-2">
            <button type="button" onClick={() => setNuevo(false)} className={`${btn.secundario} flex-1`}>Cancelar</button>
            <button type="button" onClick={() => void crear()} disabled={guardando} className={`${btn.primario} flex-1`}>
              {guardando ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-linea">
          <div>
            <label htmlFor="nu-nombre" className="mb-1 block text-sm font-medium">Nombre</label>
            <input id="nu-nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="María" className={claseCampo} />
          </div>
          <div>
            <label htmlFor="nu-email" className="mb-1 block text-sm font-medium">Email</label>
            <input id="nu-email" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@clinica.es" className={claseCampo} />
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Rol</legend>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-start gap-2 rounded-xl p-2 ring-1 ring-linea has-[:checked]:ring-brand-400">
                  <input type="radio" name="rol" checked={form.rol === r.id} onChange={() => setForm({ ...form, rol: r.id })} className="mt-1 accent-brand-500" />
                  <span>
                    <span className="block text-sm font-medium">{r.texto}</span>
                    <span className="block text-xs text-tinta-suave">{r.ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="nu-clave" className="mb-1 block text-sm font-medium">Contraseña inicial</label>
            <div className="flex gap-2">
              <input id="nu-clave" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} className={`${claseCampo} font-mono`} autoComplete="new-password" />
              <button type="button" onClick={() => setForm({ ...form, clave: claveAleatoria() })} className={`${btn.secundario} shrink-0`}>Otra</button>
            </div>
            <p className="mt-1 text-xs text-tinta-tenue">Mínimo 8 caracteres. Luego podrá cambiarla.</p>
          </div>
          {errorForm && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorForm}</p>}
        </div>
      </Cajon>

      <Toast texto={aviso} onCerrar={cerrarAviso} />
    </>
  );
}
