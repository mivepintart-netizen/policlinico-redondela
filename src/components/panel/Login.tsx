"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconoCruz } from "@/components/Logo";
import { cuentasDemo } from "@/lib/panel";
import { usePanel } from "./PanelProvider";
import { btn, claseCampo } from "./ui";

export default function Login() {
  const { listo, sesion, iniciarSesion } = usePanel();
  const router = useRouter();
  const params = useSearchParams();
  const volver = params.get("volver");
  const destino = volver && volver.startsWith("/panel") ? volver : "/panel";

  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (listo && sesion) router.replace(destino);
  }, [listo, sesion, router, destino]);

  const entrar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEntrando(true);
    setTimeout(() => {
      const cuenta = cuentasDemo.find((c) => c.email === email.trim().toLowerCase() && c.clave === clave);
      if (!cuenta) {
        setEntrando(false);
        setError("Email o contraseña incorrectos.");
        return;
      }
      const { email: em, nombre, rol } = cuenta;
      iniciarSesion({ email: em, nombre, rol });
    }, 400);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-brand-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
            <IconoCruz className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-white">Panel de gestión</h1>
          <p className="text-sm text-brand-200">Policlínico Redondela</p>
        </div>

        <form onSubmit={entrar} className="rounded-2xl bg-white p-6 shadow-ticket">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={claseCampo} />
            </div>
            <div>
              <label htmlFor="clave" className="mb-1.5 block text-sm font-medium">Contraseña</label>
              <input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} className={claseCampo} />
            </div>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={entrando} className={`${btn.primario} mt-6 w-full py-3`}>
            {entrando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-white/20 p-4 text-sm text-brand-100">
          <p className="font-semibold text-white">Versión de prueba</p>
          <p className="mt-1 text-brand-200">Contraseña: <span className="font-mono text-white">demo1234</span></p>
          <ul className="mt-3 space-y-2">
            {cuentasDemo.map((c) => (
              <li key={c.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(c.email);
                    setClave(c.clave);
                  }}
                  className="w-full rounded-lg bg-white/5 px-3 py-2 text-left transition hover:bg-white/10"
                >
                  <span className="block font-medium text-white">{c.nombre} <span className="font-normal capitalize text-brand-200">· {c.rol}</span></span>
                  <span className="block truncate text-xs text-brand-200">{c.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
