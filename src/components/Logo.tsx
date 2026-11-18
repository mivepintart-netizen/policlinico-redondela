import Link from "next/link";

export function IconoCruz({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V9h5.5a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5H15v5.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 20.5V15H3.5A1.5 1.5 0 0 1 2 13.5v-3A1.5 1.5 0 0 1 3.5 9H9V3.5Z" />
    </svg>
  );
}

export default function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <Link
      href="/reservar"
      className="group flex items-center gap-2.5"
      aria-label="Policlínico Redondela, reservar cita"
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          claro ? "bg-white/15 text-white" : "bg-brand-500 text-white"
        }`}
      >
        <IconoCruz className="h-[18px] w-[18px]" />
      </span>
      <span className="leading-tight">
        <span
          className={`block text-[15px] font-semibold tracking-tight ${
            claro ? "text-white" : "text-tinta"
          }`}
        >
          Policlínico Redondela
        </span>
        <span
          className={`block text-xs ${claro ? "text-brand-100" : "text-tinta-tenue"}`}
        >
          Redondela
        </span>
      </span>
    </Link>
  );
}
