/**
 * Lógica del asistente "María" (versión de prueba, respuestas programadas).
 *
 * Detecta la intención del mensaje con palabras clave y devuelve una
 * respuesta con botones de acción. Más adelante se puede sustituir
 * `responder()` por una llamada a un modelo de IA manteniendo la misma
 * interfaz.
 */
import {
  contacto,
  depositoMinimo,
  especialidades,
  formatoEuros,
  profesionales,
  type IlustracionId,
} from "./datos";

export type Accion =
  | { tipo: "enlace"; texto: string; href: string; externo?: boolean }
  | { tipo: "mensaje"; texto: string };

export type RespuestaBot = {
  texto: string;
  acciones?: Accion[];
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * ¿Contiene alguna de las claves? (ya normalizadas)
 * - Frases: se buscan tal cual.
 * - Palabras cortas (≤ 4 letras): palabra exacta, para que "pie" no case con "pierna".
 * - Palabras largas: como raíz, para que "adelgaz" case con "adelgazar".
 */
const contiene = (texto: string, claves: string[]) => {
  const palabras = texto.split(" ");
  return claves.some((c) =>
    c.includes(" ") ? texto.includes(c) : palabras.some((p) => (c.length <= 4 ? p === c : p.startsWith(c)))
  );
};

const esp = (id: IlustracionId) => especialidades.find((e) => e.id === id)!;

const whatsapp: Accion = { tipo: "enlace", texto: `Hablar con ${contacto.recepcionista} por WhatsApp`, href: contacto.whatsappHref, externo: true };
const llamar: Accion = { tipo: "enlace", texto: `Llamar al ${contacto.telefono}`, href: `tel:${contacto.telefonoHref}`, externo: true };
const reservar = (id?: IlustracionId): Accion => ({
  tipo: "enlace",
  texto: id ? `Reservar ${esp(id).nombre.toLowerCase()}` : "Reservar cita",
  href: id ? `/reservar?especialidad=${id}` : "/reservar",
});

/* ------------------------------------------------------------------ */
/* Conocimiento                                                        */
/* ------------------------------------------------------------------ */

/** Síntomas o temas → especialidad recomendada. */
const SINTOMAS: { id: IlustracionId; claves: string[] }[] = [
  { id: "fisioterapia", claves: ["espalda", "lumbar", "lumbago", "cervical", "cuello", "contractura", "ciatica", "hombro", "tendinitis", "rehabilitacion", "masaje", "fisio", "deport", "postura", "pierna", "brazo", "muscul", "agujetas", "tortícolis", "torticolis"] },
  { id: "traumatologia", claves: ["rodilla", "hueso", "fractura", "rotura", "esguince", "ligamento", "menisco", "articulacion", "cadera", "artrosis", "tobillo", "muñeca", "muneca", "trauma", "golpe", "caida"] },
  { id: "psicologia", claves: ["ansiedad", "estres", "depres", "triste", "duelo", "autoestima", "panico", "dormir", "insomnio", "nervios", "psicolog", "terapia", "agobi", "angustia", "pareja"] },
  { id: "podologia", claves: ["pie", "pies", "una encarnada", "unas encarnadas", "unero", "juanete", "plantilla", "pisada", "talon", "callo", "durezas", "hongos", "podolog"] },
  { id: "cardiologia", claves: ["corazon", "tension", "hipertension", "palpitacion", "arritmia", "electro", "colesterol", "cardio", "taquicardia"] },
  { id: "nutricion", claves: ["peso", "adelgaz", "dieta", "comer", "aliment", "nutric", "obesidad", "kilos", "engordar", "diabet", "intolerancia", "celiac"] },
  { id: "medicina-general", claves: ["fiebre", "gripe", "catarro", "resfriado", "tos", "garganta", "receta", "certificado", "analitica", "analisis", "revision", "chequeo", "medico", "cabecera", "malestar", "malestar general", "mareo", "cabeza"] },
];

/** Señales de urgencia: siempre se responde primero con el 112. */
const URGENCIA = [
  "dolor de pecho", "dolor en el pecho", "dolor pecho", "no puedo respirar", "me ahogo", "falta de aire",
  "desmay", "inconsciente", "no respiro", "sangra mucho", "sangrado abundante", "urgencia", "urgente", "emergencia", "ictus",
  "infarto", "convulsion", "suicid", "quitarme la vida", "hacerme dano", "envenen",
];

type Intencion = { id: string; claves: string[]; responder: (t: string) => RespuestaBot };

const INTENCIONES: Intencion[] = [
  {
    id: "humano",
    claves: ["persona", "humano", "hablar con alguien", "recepcion", "maria real", "telefono", "llamar", "whatsapp", "contactar"],
    responder: () => ({
      texto: `Claro. Puedes hablar con ${contacto.recepcionista} en recepción por WhatsApp o por teléfono en horario de apertura.`,
      acciones: [whatsapp, llamar],
    }),
  },
  {
    id: "anticipo",
    claves: ["anticipo", "deposito", "señal", "senal", "pagar", "pago", "reembolso", "devolu", "devolv", "devuelve", "dinero", "bizum", "tarjeta", "efectivo", "cobr"],
    responder: () => ({
      texto: `Al reservar solo pagas un anticipo (desde ${formatoEuros(depositoMinimo)}) con tarjeta o Bizum. El resto lo pagas en la clínica el día de la cita, con tarjeta, Bizum o efectivo.\n\nSi cancelas hasta 24 h antes, te lo devolvemos entero.`,
      acciones: [{ tipo: "enlace", texto: "Más sobre el pago anticipado", href: "/#pago-anticipado" }, reservar()],
    }),
  },
  {
    id: "cancelar",
    claves: ["cancel", "anular", "cambiar", "modificar", "mover la cita", "otra hora", "otro dia", "no puedo ir", "aplazar", "gestionar"],
    responder: () => ({
      texto:
        "Puedes cambiar o cancelar tu cita tú mismo desde Mi zona, con el código de reserva (RDN-…) y tu email, o desde el enlace del email de confirmación.\n\nSi cancelas con más de 24 h de antelación te devolvemos el anticipo completo.",
      acciones: [{ tipo: "enlace", texto: "Ir a Mi zona", href: "/mi-zona" }, whatsapp],
    }),
  },
  {
    id: "horario",
    claves: ["horario", "hora abr", "abris", "abren", "abierto", "cerrado", "cierra", "sabado", "domingo", "festivo", "cuando"],
    responder: () => ({
      texto: `Nuestro horario:\n${contacto.horarios.map((h) => `• ${h.dias}: ${h.horas}`).join("\n")}\n\nCada profesional tiene sus días; al reservar verás solo los huecos libres.`,
      acciones: [reservar()],
    }),
  },
  {
    id: "ubicacion",
    claves: ["donde", "direccion", "ubicacion", "llegar", "aparcar", "aparcamiento", "parking", "mapa", "calle", "estais"],
    responder: () => ({
      texto: `Estamos en ${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad} (${contacto.provincia}).`,
      acciones: [
        {
          tipo: "enlace",
          texto: "Abrir en Google Maps",
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${contacto.direccion}, ${contacto.codigoPostal} ${contacto.localidad}`)}`,
          externo: true,
        },
      ],
    }),
  },
  {
    id: "precios",
    claves: ["precio", "cuanto cuesta", "cuesta", "cuanto vale", "vale", "tarifa", "coste", "caro", "euros"],
    responder: () => ({
      texto: `Estos son nuestros precios:\n${especialidades
        .map((e) => `• ${e.nombre}: ${formatoEuros(e.precio)} (${e.duracionMin} min) · anticipo ${formatoEuros(e.deposito)}`)
        .join("\n")}`,
      acciones: [reservar()],
    }),
  },
  {
    id: "especialidades",
    claves: ["especialidad", "servicio", "que haceis", "que ofreceis", "tratamiento", "consulta"],
    responder: () => ({
      texto: `Tenemos ${especialidades.length} especialidades: ${especialidades.map((e) => e.nombre.toLowerCase()).join(", ")}.\n\nCuéntame qué te pasa y te digo cuál te encaja mejor.`,
      acciones: especialidades.slice(0, 4).map((e) => ({ tipo: "mensaje" as const, texto: e.nombre })),
    }),
  },
  {
    id: "seguro",
    claves: ["seguro", "mutua", "adeslas", "sanitas", "asisa", "dkv", "seguridad social", "sergas"],
    responder: () => ({
      texto: `Somos un centro privado. Para saber si trabajamos con tu seguro o mutua, pregúntale a ${contacto.recepcionista}.`,
      acciones: [whatsapp],
    }),
  },
  {
    id: "reservar",
    claves: ["reserv", "cita", "citas", "pedir", "apuntar", "hueco", "disponib", "turno"],
    responder: () => ({
      texto: "Reservar tarda unos 2 minutos: eliges especialidad, día y hora, y confirmas con un pequeño anticipo. ¿Para qué especialidad la quieres?",
      acciones: [reservar(), { tipo: "mensaje", texto: "No sé qué especialidad necesito" }],
    }),
  },
];

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

export const saludo: RespuestaBot = {
  texto: `¡Hola! Soy ${contacto.recepcionista}, la asistente virtual del Policlínico Redondela. ¿En qué te puedo ayudar?`,
  acciones: [
    { tipo: "mensaje", texto: "Quiero reservar una cita" },
    { tipo: "mensaje", texto: "No sé qué especialidad necesito" },
    { tipo: "mensaje", texto: "Precios" },
    { tipo: "mensaje", texto: "Horario" },
    { tipo: "mensaje", texto: "Cancelar o cambiar mi cita" },
  ],
};

function respuestaEspecialidad(id: IlustracionId, porSintoma: boolean): RespuestaBot {
  const e = esp(id);
  const nombres = profesionales.filter((p) => p.especialidadId === id).map((p) => p.nombre);
  return {
    texto:
      (porSintoma ? `Por lo que me cuentas, te recomiendo ${e.nombre.toLowerCase()}.\n\n` : "") +
      `${e.nombre}: ${e.descripcionCorta}\n\n` +
      `• Duración: ${e.duracionMin} min\n• Precio: ${formatoEuros(e.precio)} (anticipo ${formatoEuros(e.deposito)})\n` +
      (nombres.length ? `• Con: ${nombres.join(" o ")}` : ""),
    acciones: [reservar(id), ...(porSintoma ? [{ tipo: "mensaje" as const, texto: "Otra especialidad" }] : [])],
  };
}

export function responder(mensaje: string): RespuestaBot {
  const t = normalizar(mensaje);

  if (!t) return { texto: "¿Me lo puedes escribir de otra forma?" };

  // 1. Urgencias, siempre primero
  const dolorPecho =
    contiene(t, ["pecho", "torax"]) && contiene(t, ["dolor", "duele", "opresion", "presion", "aprieta", "pinchazo"]);
  const sinAire = contiene(t, ["respirar", "respiro", "ahogo", "ahoga"]) && contiene(t, ["no puedo", "cuesta", "dificultad", "me ahogo", "no respiro"]);
  if (dolorPecho || sinAire || contiene(t, URGENCIA.map(normalizar))) {
    return {
      texto:
        "⚠️ Si es una urgencia o crees que tu vida puede estar en peligro, llama ahora al 112.\n\nNosotros no atendemos urgencias. Si no es grave, puedo ayudarte a pedir cita.",
      acciones: [
        { tipo: "enlace", texto: "Llamar al 112", href: "tel:112", externo: true },
        { tipo: "mensaje", texto: "No es urgente, quiero pedir cita" },
      ],
    };
  }

  // 2. Saludos y agradecimientos
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|ola|bos dias)\b/.test(t) && t.split(" ").length <= 3) {
    return saludo;
  }
  if (contiene(t, ["gracias", "grazas", "perfecto", "genial", "vale gracias"]) && t.split(" ").length <= 4) {
    return { texto: "¡A ti! Si necesitas algo más, aquí estoy. 😊" };
  }

  // 3. Respuestas a los botones especiales
  if (contiene(t, ["no se que especialidad", "no se cual", "que especialidad", "otra especialidad", "orient", "recomiend"])) {
    return {
      texto: "Cuéntame en pocas palabras qué te pasa (por ejemplo: «me duele la espalda» o «quiero perder peso») y te digo qué especialidad te encaja.",
      acciones: [{ tipo: "mensaje", texto: "Me duele la espalda" }, { tipo: "mensaje", texto: "Tengo ansiedad" }, { tipo: "mensaje", texto: "Quiero perder peso" }],
    };
  }
  if (t.startsWith("no es urgente")) return INTENCIONES.find((i) => i.id === "reservar")!.responder(t);

  // 4. Nombre exacto de una especialidad
  const porNombre = especialidades.find((e) => {
    const n = normalizar(e.nombre);
    return t === n || t.includes(n) || (n.length > 6 && t.includes(n.slice(0, -2)));
  });

  // 5. Intenciones (cancelar y anticipo antes que "reservar" o "cita")
  const intencion = INTENCIONES.find((i) => contiene(t, i.claves.map(normalizar)));

  // Si pregunta el precio de una especialidad concreta, responder con su ficha
  if (porNombre && (!intencion || ["precios", "reservar", "especialidades", "horario"].includes(intencion.id))) {
    return respuestaEspecialidad(porNombre.id, false);
  }

  // 6. Síntomas
  const sintoma = SINTOMAS.find((s) => contiene(t, s.claves.map(normalizar)));
  if (sintoma && (!intencion || ["reservar", "especialidades"].includes(intencion.id))) {
    return respuestaEspecialidad(sintoma.id, true);
  }

  if (intencion) return intencion.responder(t);

  // 7. Dolor sin localizar: preguntar dónde
  if (contiene(t, ["duele", "dolor", "molestia", "molesta", "daño", "dano"])) {
    return {
      texto: "Siento que estés así. ¿Dónde te duele o qué te notas exactamente? Así te digo qué especialidad te encaja.",
      acciones: [
        { tipo: "mensaje", texto: "Espalda o cuello" },
        { tipo: "mensaje", texto: "Rodilla o tobillo" },
        { tipo: "mensaje", texto: "Los pies" },
        { tipo: "mensaje", texto: "Malestar general" },
      ],
    };
  }

  // 8. No entendido
  return {
    texto: `Perdona, no estoy segura de haberte entendido. Puedo ayudarte con citas, precios, horarios, el anticipo o cómo llegar. Si prefieres, te paso con ${contacto.recepcionista} en recepción.`,
    acciones: [
      { tipo: "mensaje", texto: "Quiero reservar una cita" },
      { tipo: "mensaje", texto: "Precios" },
      whatsapp,
    ],
  };
}
