import { contacto } from "@/lib/datos";

export default function Footer() {
  return (
    <footer className="border-t border-linea bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-tinta-suave sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-medium text-tinta">Policlínico Redondela</span> · {contacto.direccion}, {contacto.codigoPostal}{" "}
          {contacto.localidad} ·{" "}
          <a href={`tel:${contacto.telefonoHref}`} className="hover:text-brand-600">{contacto.telefono}</a>
        </p>
        <nav aria-label="Textos legales" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <a href="/legal/cancelacion" className="hover:text-brand-600">Reserva y cancelación</a>
          <a href="/legal/privacidad" className="hover:text-brand-600">Privacidad</a>
          <a href="/legal/aviso-legal" className="hover:text-brand-600">Aviso legal</a>
        </nav>
        <p className="text-xs text-tinta-tenue">
          Desarrollado por <span className="font-medium text-tinta-suave">MV Automatizaciones</span>
        </p>
      </div>
    </footer>
  );
}
