import { redirect } from "next/navigation";

/** La web va directa a la reserva: los pacientes llegan con el enlace que les envía la clínica. */
export default function Inicio() {
  redirect("/reservar");
}
