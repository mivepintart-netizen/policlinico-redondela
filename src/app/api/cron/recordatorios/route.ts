import { NextResponse } from "next/server";
import { enviarRecordatorios } from "@/lib/servidor/recordatorios";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lo llama Vercel Cron cada tarde (ver vercel.json). Vercel envía
 * "Authorization: Bearer <CRON_SECRET>" si esa variable está configurada.
 */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const r = await enviarRecordatorios(new URL(req.url).origin);
    console.log("recordatorios", r);
    return NextResponse.json(r);
  } catch (e) {
    console.error("recordatorios", e);
    return NextResponse.json({ error: "Error al enviar recordatorios" }, { status: 500 });
  }
}
