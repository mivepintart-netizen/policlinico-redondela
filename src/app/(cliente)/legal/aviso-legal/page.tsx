import type { Metadata } from "next";
import PaginaLegal, { Dato, Seccion } from "@/components/legal/PaginaLegal";
import { contacto, legal } from "@/lib/datos";

export const metadata: Metadata = { title: "Aviso legal · Policlínico Redondela" };

export default function AvisoLegal() {
  return (
    <PaginaLegal titulo="Aviso legal">
      <Seccion titulo="Titular de la web">
        <ul>
          <li>Titular: <Dato>{legal.titular}</Dato></li>
          <li>CIF: <Dato>{legal.cif}</Dato></li>
          <li>Domicilio: {legal.domicilio}</li>
          <li>Teléfono: {contacto.telefono} · Email: {contacto.email}</li>
          <li>Registro: <Dato>{legal.registro}</Dato></li>
          <li>Centro sanitario autorizado: <Dato>{legal.autorizacionSanitaria}</Dato></li>
        </ul>
      </Seccion>
      <Seccion titulo="Objeto">
        <p>
          Esta web permite reservar y gestionar citas en el Policlínico Redondela. Su uso implica la aceptación de este
          aviso legal, de las condiciones de reserva y cancelación y de la política de privacidad.
        </p>
      </Seccion>
      <Seccion titulo="Responsabilidad">
        <p>
          La información de esta web es orientativa y no sustituye a la consulta con un profesional sanitario. En caso de
          urgencia, llama al 112.
        </p>
      </Seccion>
      <Seccion titulo="Legislación aplicable">
        <p>Este aviso se rige por la legislación española.</p>
      </Seccion>
    </PaginaLegal>
  );
}
