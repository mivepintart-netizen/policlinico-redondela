import Link from "next/link";
import { legal } from "@/lib/datos";

/** Resalta los huecos "[...]" pendientes de rellenar. */
export function Dato({ children }: { children: string }) {
  if (!children.startsWith("[")) return <>{children}</>;
  return <mark className="rounded bg-ambar-100 px-1 text-ambar-700">{children}</mark>;
}

export function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-tinta-suave [&_strong]:font-medium [&_strong]:text-tinta [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export default function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <nav aria-label="Textos legales" className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/legal/cancelacion" className="text-brand-600 hover:underline">Reserva y cancelación</Link>
        <Link href="/legal/privacidad" className="text-brand-600 hover:underline">Privacidad</Link>
        <Link href="/legal/aviso-legal" className="text-brand-600 hover:underline">Aviso legal</Link>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-sm text-tinta-tenue">Última actualización: {legal.actualizado}</p>
      {children}
    </article>
  );
}
