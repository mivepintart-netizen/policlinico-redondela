"use client";

import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/cliente";
import { Cajon, btn, claseCampo } from "./ui";

export default function CambiarClave({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => {
    setClave("");
    setRepetida("");
    setError(null);
    setHecho(false);
    onCerrar();
  };

  const guardar = async () => {
    setError(null);
    if (clave.length < 8) return setError("Mínimo 8 caracteres.");
    if (clave !== repetida) return setError("Las dos contraseñas no coinciden.");
    setGuardando(true);
    const { error: e } = await supabaseNavegador().auth.updateUser({ password: clave });
    setGuardando(false);
    if (e) {
      return setError(
        /different from the old/i.test(e.message) ? "La nueva contraseña debe ser distinta de la actual." : /weak|short/i.test(e.message) ? "Contraseña demasiado débil." : "No se pudo cambiar. Inténtalo de nuevo."
      );
    }
    setHecho(true);
  };

  return (
    <Cajon
      abierto={abierto}
      titulo="Cambiar mi contraseña"
      onCerrar={cerrar}
      pie={
        hecho ? (
          <button type="button" onClick={cerrar} className={`${btn.primario} w-full`}>Cerrar</button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={cerrar} className={`${btn.secundario} flex-1`}>Cancelar</button>
            <button type="button" onClick={() => void guardar()} disabled={guardando} className={`${btn.primario} flex-1`}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        )
      }
    >
      {hecho ? (
        <p role="status" className="rounded-2xl bg-brand-50 p-4 text-brand-800">Contraseña cambiada. Úsala la próxima vez que entres.</p>
      ) : (
        <div className="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-linea">
          <div>
            <label htmlFor="cc-1" className="mb-1 block text-sm font-medium">Nueva contraseña</label>
            <input id="cc-1" type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} className={claseCampo} />
          </div>
          <div>
            <label htmlFor="cc-2" className="mb-1 block text-sm font-medium">Repítela</label>
            <input id="cc-2" type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} className={claseCampo} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </Cajon>
  );
}
