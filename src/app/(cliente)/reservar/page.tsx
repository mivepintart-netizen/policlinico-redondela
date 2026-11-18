import type { Metadata } from "next";
import Asistente from "@/components/reserva/Asistente";

export const metadata: Metadata = {
  title: "Reservar cita · Policlínico Redondela",
};

export default function ReservarPage({
  searchParams,
}: {
  searchParams: { especialidad?: string };
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <Asistente
        // Reinicia el asistente si se entra con otra especialidad en la URL
        key={searchParams.especialidad ?? "inicio"}
        especialidadInicial={searchParams.especialidad ?? null}
      />
    </div>
  );
}
