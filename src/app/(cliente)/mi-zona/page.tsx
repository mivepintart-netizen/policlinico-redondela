import type { Metadata } from "next";
import Acceso from "@/components/mi-zona/Acceso";

export const metadata: Metadata = {
  title: "Mi zona · Policlínico Redondela",
};

export default function MiZonaPage() {
  return (
    <div className="px-4 pb-20 pt-24 sm:px-6 sm:pt-32">
      <Acceso />
    </div>
  );
}
