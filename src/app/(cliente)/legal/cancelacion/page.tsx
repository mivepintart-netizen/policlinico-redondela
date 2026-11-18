import type { Metadata } from "next";
import PaginaLegal, { Seccion } from "@/components/legal/PaginaLegal";
import { contacto, diasReservables } from "@/lib/datos";

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
          La cita queda <strong>confirmada cuando se paga el anticipo</strong>. Mientras completas el pago, tu hueco queda
          apartado durante 30 minutos; si no se completa en ese tiempo, el hueco se libera.
        </p>
      </Seccion>

      <Seccion titulo="El anticipo">
        <p>
          El anticipo es una parte del precio de la consulta que se paga al reservar con tarjeta a través de una pasarela de
          pago segura. <strong>El resto se paga en la clínica el día de la cita.</strong> El importe del anticipo y el
          precio total se muestran antes de pagar.
        </p>
        <p>Sirve para reducir las citas a las que nadie acude y que esos huecos lleguen a quien los necesita.</p>
      </Seccion>

      <Seccion titulo="Cambios y cancelaciones">
        <ul>
          <li>
            <strong>Con más de 24 horas de antelación</strong> puedes cambiar el día o la hora, o cancelar la cita, sin
            coste. Si cancelas, te devolvemos el anticipo completo por el mismo medio de pago. La devolución puede tardar
            entre 5 y 10 días hábiles en reflejarse, según tu banco.
          </li>
          <li>
            <strong>Con menos de 24 horas de antelación</strong>, o si no acudes a la cita, el anticipo no se devuelve.
            Si se debe a una causa justificada (enfermedad, urgencia familiar…), llámanos y lo valoraremos.
          </li>
          <li>
            Puedes gestionar tu cita desde el enlace del email de confirmación o desde «Mi cita» con tu código de reserva
            y tu email.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Si la clínica cancela la cita">
        <p>
          Si por cualquier motivo tenemos que cancelar o cambiar tu cita, te avisaremos lo antes posible y te
          devolveremos el anticipo íntegro, o te ofreceremos otra fecha si lo prefieres.
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
