import { contacto } from "@/lib/datos";

/** Genera y descarga un archivo .ics para añadir la cita al calendario. */
export function descargarIcs(opts: {
  id: string;
  titulo: string;
  inicio: Date;
  duracionMin: number;
  descripcion: string;
}) {
  const fin = new Date(opts.inicio.getTime() + opts.duracionMin * 60000);
  const local = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(
      d.getHours()
    ).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
  const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (t: string) => t.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Policlinico Redondela//Citas//ES",
    "BEGIN:VEVENT",
    `UID:${opts.id}@policlinicoredondela.es`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART;TZID=Europe/Madrid:${local(opts.inicio)}`,
    `DTEND;TZID=Europe/Madrid:${local(fin)}`,
    `SUMMARY:${esc(opts.titulo)}`,
    `LOCATION:${esc(`Policlínico Redondela, ${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`)}`,
    `DESCRIPTION:${esc(opts.descripcion)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(opts.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `cita-${opts.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
