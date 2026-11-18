"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../database.types";

let cliente: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente de Supabase para el navegador (guarda la sesión del panel). */
export function supabaseNavegador() {
  if (!cliente) {
    cliente = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return cliente;
}

/** Mensaje legible a partir de un error de Supabase. */
export function mensajeError(e: unknown, porDefecto = "Ha ocurrido un error. Inténtalo de nuevo.") {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
    const m = e.message;
    // Los errores de nuestras funciones vienen en español y son para mostrar
    if (/^[A-ZÁÉÍÓÚ¿¡]/.test(m) && !/^(JWT|Failed|TypeError|NetworkError)/.test(m)) return m;
    if (/fetch|network/i.test(m)) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  }
  return porDefecto;
}
