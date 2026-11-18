"use client";

import { createContext, useContext } from "react";
import type { Catalogo } from "@/lib/catalogo";

const Ctx = createContext<Catalogo | null>(null);

/** Pone el catálogo (cargado en el servidor) al alcance de las páginas del paciente. */
export default function CatalogoProvider({ catalogo, children }: { catalogo: Catalogo; children: React.ReactNode }) {
  return <Ctx.Provider value={catalogo}>{children}</Ctx.Provider>;
}

export function useCatalogo() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCatalogo debe usarse dentro de <CatalogoProvider>");
  return c;
}
