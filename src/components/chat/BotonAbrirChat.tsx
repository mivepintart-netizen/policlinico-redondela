"use client";

import { EVENTO_ABRIR_CHAT } from "./ChatMaria";

/** Botón que abre el chat de María desde cualquier parte de la web. */
export default function BotonAbrirChat({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_CHAT))} className={className}>
      {children}
    </button>
  );
}
