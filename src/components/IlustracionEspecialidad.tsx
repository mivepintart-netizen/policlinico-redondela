import type { IlustracionId } from "@/lib/datos";

/**
 * Ilustraciones de línea para cada especialidad.
 * Se dibujan sobre un panel de color con formas de fondo suaves.
 */

const trazos: Record<IlustracionId, React.ReactNode> = {
  "medicina-general": (
    <>
      {/* Estetoscopio */}
      <path d="M26 18v14a12 12 0 0 0 24 0V18" />
      <path d="M22 18h8M46 18h8" />
      <path d="M38 44v8a10 10 0 0 0 20 0v-4" />
      <circle cx="58" cy="44" r="5" />
    </>
  ),
  fisioterapia: (
    <>
      {/* Columna vertebral */}
      <rect x="32" y="12" width="16" height="9" rx="4" />
      <rect x="30" y="25" width="20" height="9" rx="4" />
      <rect x="31" y="38" width="18" height="9" rx="4" />
      <rect x="33" y="51" width="14" height="9" rx="4" />
      <path d="M24 16c-4 8-4 34 0 44M56 16c4 8 4 34 0 44" strokeDasharray="2 5" />
    </>
  ),
  traumatologia: (
    <>
      {/* Hueso */}
      <path d="M28 52 52 28" strokeWidth={7} />
      <circle cx="24" cy="52" r="6" />
      <circle cx="28" cy="58" r="6" />
      <circle cx="52" cy="22" r="6" />
      <circle cx="58" cy="28" r="6" />
    </>
  ),
  psicologia: (
    <>
      {/* Cabeza de perfil con bocadillo */}
      <path d="M44 62V52h4a6 6 0 0 0 6-6v-6l4-2-4-6c0-11-8-18-19-18-10 0-17 8-17 18 0 7 3 12 8 15v15" />
      <path d="M34 30c0-3 2.5-5 5-5s5 2 5 5c0 4-5 4-5 8" />
      <circle cx="39" cy="43" r="0.5" strokeWidth={3} />
    </>
  ),
  podologia: (
    <>
      {/* Huella de pie */}
      <path d="M30 34c-2 10 0 18 2 24 2 5 10 5 12 0 2-5 0-10 2-16 1-4 4-7 4-12 0-6-5-10-10-10-6 0-9 6-10 14Z" />
      <circle cx="56" cy="22" r="3" />
      <circle cx="51" cy="15" r="3" />
      <circle cx="44" cy="11" r="2.6" />
      <circle cx="37" cy="10" r="2.3" />
      <circle cx="30" cy="12" r="2" />
    </>
  ),
  cardiologia: (
    <>
      {/* Corazón con electro */}
      <path d="M40 60S16 46 16 30a11 11 0 0 1 24-5 11 11 0 0 1 24 5c0 16-24 30-24 30Z" />
      <path d="M18 38h10l4-8 6 16 5-12 3 4h16" />
    </>
  ),
  nutricion: (
    <>
      {/* Manzana */}
      <path d="M40 24c-6-4-20-3-20 14 0 14 10 26 20 22 10 4 20-8 20-22 0-17-14-18-20-14Z" />
      <path d="M40 24c0-5 2-9 6-12" />
      <path d="M42 18c4-4 10-4 12-2-2 4-8 5-12 2Z" />
    </>
  ),
};

export default function IlustracionEspecialidad({
  id,
  className = "",
  compacta = false,
}: {
  id: IlustracionId;
  className?: string;
  /** Versión pequeña (iconos de lista): sin formas decorativas y trazo más grueso. */
  compacta?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 ${className}`}
      aria-hidden="true"
    >
      {/* Formas decorativas de fondo */}
      {!compacta && (
        <>
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/50" />
          <div className="absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-brand-200/40" />
        </>
      )}
      <svg
        viewBox="0 0 80 72"
        className={`relative mx-auto h-full w-auto text-brand-600 ${compacta ? "max-w-[80%] p-1.5" : "max-w-[45%]"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={compacta ? 3.5 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {trazos[id]}
      </svg>
    </div>
  );
}
