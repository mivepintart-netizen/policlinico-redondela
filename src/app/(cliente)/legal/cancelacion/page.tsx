import type { Metadata } from "next";
import PaginaLegal, { Seccion } from "@/components/legal/PaginaLegal";
import { PORCENTAJE_AUSENCIA, contacto, diasReservables } from "@/lib/datos";

export const metadata: Metadata = { title: "Reserva y cancelación · Policlínico Redondela" };

export default function Cancelacion() {
  return (
    <PaginaLegal titulo="Condiciones de reserva y cancelación">
      <Seccion titulo="Cómo funciona la reserva">
        <p>
          Puedes reservar cita online hasta {diasReservables} días vista y con al menos 1 hora de antelación. Al reservar
          eliges especialidad, profesional, día y hora, y nos facilitas tus datos de contacto.
        </p>
        <p>
          La cita queda <strong>confirmada cuando dejas tu tarjeta como garantía</strong>. Mientras la añades, tu hueco
          queda apartado durante 30 minutos; si no terminas en ese tiempo, el hueco se libera.
        </p>
      </Seccion>

      <Seccion titulo="La tarjeta en garantía">
        <p>
          <strong>Al reservar no se te cobra nada.</strong> Solo guardamos tu tarjeta a través de una pasarela de pago
          segura (Stripe) para garantizar la cita. La consulta se paga completa en la clínica el día de la cita.
        </p>
        <p>
          La clínica nunca ve ni guarda el número de tu tarjeta: solo una referencia de la pasarela y sus últimas cuatro
          cifras, para que puedas identificarla.
        </p>
        <p>Sirve para reducir las citas a las que nadie acude y que esos huecos lleguen a quien los necesita.</p>
      </Seccion>

      <Seccion titulo="Cambios, cancelaciones y ausencias">
        <ul>
          <li>
            <strong>Con más de 24 horas de antelación</strong> puedes cambiar el día o la hora, o cancelar la cita, sin
            ningún coste.
          </li>
          <li>
            <strong>Si cancelas con menos de 24 horas de antelación, o no acudes a la cita</strong>, la clínica podrá
            cobrar en tu tarjeta el <strong>{PORCENTAJE_AUSENCIA} % del precio de la cita</strong>. El importe exacto se
            muestra antes de reservar. Si se cobra, te avisaremos por email.
          </li>
          <li>
            Si se debe a una causa justificada (enfermedad, urgencia familiar…), llámanos y lo valoraremos antes de
            cobrar nada.
          </li>
          <li>
            Puedes gestionar tu cita desde el enlace del email de confirmación o desde «Mi cita» con tu código de reserva
            y tu email.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Si la clínica cancela la cita">
        <p>
          Si por cualquier motivo tenemos que cancelar o cambiar tu cita, te avisaremos lo antes posible y no se te
          cobrará nada. Te ofreceremos otra fecha si lo prefieres.
        </p>
      </Seccion>

      <Seccion titulo="Urgencias">
        <p>
          Este sistema es solo para citas programadas. <strong>Si se trata de una urgencia, llama al 112.</strong>
        </p>
      </Seccion>

      <Seccion titulo="Contacto">
        <p>
          Para cualquier duda sobre tu reserva: teléfono {contacto.telefono} o {contacto.email}.
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
