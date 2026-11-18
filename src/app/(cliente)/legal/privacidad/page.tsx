import type { Metadata } from "next";
import PaginaLegal, { Dato, Seccion } from "@/components/legal/PaginaLegal";
import { contacto, legal } from "@/lib/datos";

export const metadata: Metadata = { title: "Política de privacidad · Policlínico Redondela" };

export default function Privacidad() {
  return (
    <PaginaLegal titulo="Política de privacidad">
      <p className="mt-6 rounded-xl bg-ambar-50 p-4 text-sm text-ambar-700">
        Plantilla orientativa. Debe revisarla un asesor de protección de datos antes de publicar la web, y completarse los
        datos resaltados.
      </p>

      <Seccion titulo="1. Responsable del tratamiento">
        <ul>
          <li>Titular: <Dato>{legal.titular}</Dato> («Policlínico Redondela»)</li>
          <li>CIF: <Dato>{legal.cif}</Dato></li>
          <li>Domicilio: {legal.domicilio}</li>
          <li>Teléfono: {contacto.telefono}</li>
          <li>Email de protección de datos: <Dato>{legal.emailPrivacidad}</Dato></li>
          <li>Delegado de Protección de Datos: <Dato>{legal.delegadoProteccionDatos}</Dato></li>
        </ul>
      </Seccion>

      <Seccion titulo="2. Qué datos tratamos">
        <ul>
          <li><strong>Identificación y contacto:</strong> nombre, apellidos, DNI/NIE, teléfono y email.</li>
          <li><strong>Datos de la cita:</strong> especialidad, profesional, fecha, hora y estado de la reserva.</li>
          <li>
            <strong>Motivo de la consulta</strong> (opcional): puede contener datos relativos a tu salud. Solo lo verá el
            personal de la clínica para preparar la cita.
          </li>
          <li>
            <strong>Datos de pago:</strong> el pago lo gestiona la pasarela (Stripe). Nosotros no vemos ni guardamos los
            datos de tu tarjeta; solo una referencia del pago para poder hacer devoluciones.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="3. Para qué y con qué base legal">
        <ul>
          <li>
            <strong>Gestionar tu cita</strong> (reserva, cobro del anticipo, cambios, cancelaciones y devoluciones):
            ejecución de la relación que solicitas (art. 6.1.b del RGPD).
          </li>
          <li>
            <strong>Enviarte los emails de la cita</strong> (confirmación, cambios, cancelación): misma base. No enviamos
            publicidad.
          </li>
          <li>
            <strong>Datos de salud del motivo de consulta</strong>: prestación de asistencia sanitaria (art. 9.2.h del
            RGPD), bajo secreto profesional.
          </li>
          <li><strong>Obligaciones contables y fiscales</strong> de los pagos: obligación legal (art. 6.1.c del RGPD).</li>
        </ul>
      </Seccion>

      <Seccion titulo="4. Cuánto tiempo los conservamos">
        <p>
          Los datos de la reserva se conservan mientras sean necesarios para gestionar la cita y, después, durante los
          plazos legales aplicables (por ejemplo, 6 años para la documentación contable). La información clínica que se
          genere en la consulta se rige por la normativa sanitaria sobre historia clínica.
        </p>
      </Seccion>

      <Seccion titulo="5. Con quién los compartimos">
        <p>No vendemos ni cedemos tus datos. Para prestar el servicio usamos estos proveedores (encargados del tratamiento):</p>
        <ul>
          <li><strong>Supabase</strong>: base de datos donde se guardan las reservas (servidores: <Dato>{legal.regionServidores}</Dato>).</li>
          <li><strong>Stripe</strong>: pasarela de pago.</li>
          <li><strong>Resend</strong>: envío de los emails de la cita.</li>
          <li><strong>Vercel</strong>: alojamiento de la web.</li>
        </ul>
        <p>
          Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo; en ese caso lo hacen con
          las garantías previstas en el RGPD (decisiones de adecuación o cláusulas contractuales tipo).
        </p>
      </Seccion>

      <Seccion titulo="6. Tus derechos">
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo
          a <Dato>{legal.emailPrivacidad}</Dato> o en nuestro domicilio, indicando tu nombre y adjuntando copia de tu
          documento de identidad.
        </p>
        <p>
          Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de
          Datos (www.aepd.es).
        </p>
      </Seccion>

      <Seccion titulo="7. Cookies">
        <p>
          Esta web solo usa el almacenamiento técnico imprescindible para funcionar (por ejemplo, mantener abierta la sesión
          del personal de la clínica). No usamos cookies de publicidad ni de análisis.
        </p>
      </Seccion>
    </PaginaLegal>
  );
}
