import type { Metadata } from "next";
import DetalleCita from "@/components/mi-zona/DetalleCita";

export const metadata: Metadata = {
  title: "Tu cita · Policlínico Redondela",
  // El enlace es personal: que no lo indexen los buscadores
  robots: { index: false, follow: false },
};

export default function CitaPage({ params }: { params: { token: string } }) {
  return (
    <div className="px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <DetalleCita token={decodeURIComponent(params.token)} />
    </div>
  );
}
