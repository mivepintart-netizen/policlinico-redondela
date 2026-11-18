import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/servidor/admin";
import { usuarioDePeticion } from "@/lib/servidor/auth";
import type { RolPanel } from "@/lib/database.types";

/**
 * Gestión de los usuarios del panel (solo administradores).
 * GET: lista · POST: alta · PATCH: cambiar nombre/rol/contraseña · DELETE: quitar acceso
 */

const ROLES: RolPanel[] = ["admin", "secretaria"];
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const claveValida = (c: string) => typeof c === "string" && c.length >= 8;
const error = (mensaje: string, estado = 400) => NextResponse.json({ error: mensaje }, { status: estado });

async function soloAdmin(req: Request) {
  const u = await usuarioDePeticion(req);
  if (!u) return { respuesta: error("Inicia sesión de nuevo", 401) };
  if (!u.esAdmin) return { respuesta: error("Solo el administrador puede gestionar usuarios", 403) };
  return { yo: u };
}

async function numeroDeAdmins() {
  const { count } = await supabaseAdmin().from("usuarios_panel").select("id", { count: "exact", head: true }).eq("rol", "admin");
  return count ?? 0;
}

export async function GET(req: Request) {
  const { respuesta, yo } = await soloAdmin(req);
  if (respuesta) return respuesta;
  const sb = supabaseAdmin();
  const [{ data: fichas, error: e1 }, { data: auth, error: e2 }] = await Promise.all([
    sb.from("usuarios_panel").select("*").order("created_at"),
    sb.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (e1 || e2) return error("No se pudieron cargar los usuarios", 500);
  const usuarios = (fichas ?? []).map((f) => {
    const a = auth.users.find((x) => x.id === f.id);
    return { id: f.id, nombre: f.nombre, rol: f.rol, email: a?.email ?? "", ultimoAcceso: a?.last_sign_in_at ?? null, soyYo: f.id === yo!.id };
  });
  return NextResponse.json({ usuarios });
}

export async function POST(req: Request) {
  const { respuesta } = await soloAdmin(req);
  if (respuesta) return respuesta;
  const { email, nombre, rol, clave } = (await req.json().catch(() => ({}))) as Record<string, string>;
  const e = (email ?? "").trim().toLowerCase();
  if (!emailValido(e)) return error("Email no válido");
  if (!nombre?.trim()) return error("Escribe el nombre");
  if (!ROLES.includes(rol as RolPanel)) return error("Rol no válido");
  if (!claveValida(clave)) return error("La contraseña debe tener al menos 8 caracteres");

  const sb = supabaseAdmin();
  // ¿Ya existe ese email en Authentication? Entonces solo le damos acceso
  const { data: lista } = await sb.auth.admin.listUsers({ perPage: 1000 });
  let id = lista?.users.find((u) => u.email?.toLowerCase() === e)?.id;
  if (id) {
    const { data: ficha } = await sb.from("usuarios_panel").select("id").eq("id", id).maybeSingle();
    if (ficha) return error("Ese email ya tiene acceso al panel");
    await sb.auth.admin.updateUserById(id, { password: clave });
  } else {
    const { data: creado, error: errCrear } = await sb.auth.admin.createUser({ email: e, password: clave, email_confirm: true });
    if (errCrear || !creado.user) return error(errCrear?.message.includes("Password") ? "Contraseña demasiado débil" : "No se pudo crear el usuario", 400);
    id = creado.user.id;
  }
  const { error: errFicha } = await sb.from("usuarios_panel").insert({ id, nombre: nombre.trim(), rol: rol as RolPanel });
  if (errFicha) return error("No se pudo dar acceso al panel", 500);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { respuesta, yo } = await soloAdmin(req);
  if (respuesta) return respuesta;
  const { id, nombre, rol, clave } = (await req.json().catch(() => ({}))) as Record<string, string>;
  if (!id) return error("Falta el usuario");
  const sb = supabaseAdmin();

  if (rol !== undefined) {
    if (!ROLES.includes(rol as RolPanel)) return error("Rol no válido");
    if (id === yo!.id && rol !== "admin") return error("No puedes quitarte a ti mismo el rol de administrador");
  }
  const cambios: { nombre?: string; rol?: RolPanel } = {};
  if (nombre !== undefined) {
    if (!nombre.trim()) return error("El nombre no puede estar vacío");
    cambios.nombre = nombre.trim();
  }
  if (rol !== undefined) cambios.rol = rol as RolPanel;
  if (Object.keys(cambios).length) {
    const { error: e } = await sb.from("usuarios_panel").update(cambios).eq("id", id);
    if (e) return error("No se pudo guardar", 500);
  }
  if (clave !== undefined) {
    if (!claveValida(clave)) return error("La contraseña debe tener al menos 8 caracteres");
    const { error: e } = await sb.auth.admin.updateUserById(id, { password: clave });
    if (e) return error("No se pudo cambiar la contraseña", 500);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { respuesta, yo } = await soloAdmin(req);
  if (respuesta) return respuesta;
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return error("Falta el usuario");
  if (id === yo!.id) return error("No puedes quitarte el acceso a ti mismo");
  const sb = supabaseAdmin();
  const { data: ficha } = await sb.from("usuarios_panel").select("rol").eq("id", id).maybeSingle();
  if (ficha?.rol === "admin" && (await numeroDeAdmins()) <= 1) return error("Debe quedar al menos un administrador");
  await sb.from("usuarios_panel").delete().eq("id", id);
  // Borrar también la cuenta: así no puede volver a iniciar sesión
  await sb.auth.admin.deleteUser(id).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
