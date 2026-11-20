-- =====================================================================
-- Policlínico Redondela · Tarjeta en garantía (paso 5 de la base de datos)
-- Ejecutar UNA VEZ en el editor SQL, después de los anteriores.
--
-- Cambio de modelo: ya no se cobra un anticipo al reservar. El paciente
-- deja su tarjeta guardada (Stripe) y, si no se presenta o cancela con
-- menos de 24 h, recepción puede cobrarle el 50 % del precio.
-- =====================================================================

-- 1. Nuevo estado "no_presentado"
alter table public.reservas drop constraint reservas_estado_check;
alter table public.reservas add constraint reservas_estado_check
  check (estado in ('pendiente_pago', 'confirmada', 'sin_deposito', 'cancelada', 'completada', 'no_presentado'));

-- 2. Datos de la tarjeta guardada y del cobro por ausencia.
--    De la tarjeta solo se guardan referencias de Stripe y "Visa ···· 4242":
--    el número completo nunca pasa por la web ni por la base de datos.
alter table public.reservas
  add column garantia_cliente text,            -- cliente en Stripe (cus_…)
  add column garantia_metodo  text,            -- tarjeta guardada en Stripe (pm_…)
  add column garantia_tarjeta text,            -- texto para mostrar: "Visa ···· 4242"
  add column cancelada_tarde  boolean not null default false,  -- cancelada con < 24 h
  add column cobro_ref        text,            -- pago del cargo por ausencia (pi_…)
  add column cobro_importe    integer,         -- céntimos cobrados
  add column cobro_at         timestamptz,
  add column cobro_devuelto   boolean not null default false,
  add column cobro_error      text;            -- último intento fallido (tarjeta rechazada…)

-- 3. El panel solo puede cambiar estos campos de una reserva. Los de la
--    tarjeta y los cobros los escribe únicamente el servidor de la web.
revoke update on public.reservas from authenticated;
grant update (estado, reembolso, metodo_pago, fecha, hora, profesional_id) on public.reservas to authenticated;

-- 4. Crear reserva: con el cobro online activado la reserva espera a que
--    el paciente deje la tarjeta (35 min). Ya no depende del anticipo.
create or replace function public.crear_reserva(
  p_especialidad_id text,
  p_profesional_id  text,
  p_fecha           date,
  p_hora            text,
  p_nombre          text,
  p_apellidos       text,
  p_dni             text,
  p_telefono        text,
  p_email           text,
  p_motivo          text,
  p_metodo_pago     text
)
returns table (id text, token_acceso text, deposito integer)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_esp   public.especialidades%rowtype;
  v_prof  public.profesionales%rowtype;
  v_ahora timestamp := public.ahora_madrid();
  v_online boolean := coalesce((select a.pago_online from public.ajustes a limit 1), false);
begin
  perform public.liberar_pagos_caducados();

  select * into v_esp from public.especialidades e where e.id = p_especialidad_id and e.activa;
  if not found then raise exception 'La especialidad no está disponible' using errcode = 'P0001'; end if;

  select * into v_prof from public.profesionales p where p.id = p_profesional_id and p.activo;
  if not found or v_prof.especialidad_id <> v_esp.id then
    raise exception 'El profesional no es válido para esta especialidad' using errcode = 'P0001';
  end if;

  if (p_fecha + p_hora::time) < v_ahora + interval '1 hour' then
    raise exception 'Ese hueco ya no está disponible' using errcode = 'P0001';
  end if;
  if p_fecha > v_ahora::date + 60 then
    raise exception 'Solo se puede reservar hasta 60 días vista' using errcode = 'P0001';
  end if;
  if not public.es_hueco_valido(p_profesional_id, p_fecha, p_hora) then
    raise exception 'Ese hueco no está en el horario' using errcode = 'P0001';
  end if;
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_apellidos), '') = ''
     or coalesce(trim(p_telefono), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'Faltan datos del paciente' using errcode = 'P0001';
  end if;

  begin
    return query
    insert into public.reservas as r (
      especialidad_id, profesional_id, fecha, hora, precio, deposito, estado, metodo_pago, expira_en,
      paciente_nombre, paciente_apellidos, paciente_dni, paciente_telefono, paciente_email, paciente_motivo, origen
    ) values (
      v_esp.id, v_prof.id, p_fecha, p_hora, v_esp.precio, 0,
      case when v_online then 'pendiente_pago' else 'confirmada' end,
      'tarjeta',
      case when v_online then now() + interval '35 minutes' else null end,
      left(trim(p_nombre), 80), left(trim(p_apellidos), 120), upper(left(trim(coalesce(p_dni, '')), 12)),
      left(trim(p_telefono), 20), lower(left(trim(p_email), 160)), left(trim(coalesce(p_motivo, '')), 1000), 'web'
    )
    returning r.id, r.token_acceso, r.deposito;
  exception when unique_violation then
    raise exception 'Alguien acaba de reservar ese hueco. Elige otra hora.' using errcode = 'P0001';
  end;
end;
$$;

-- 5. Lo que ve el paciente de su cita (sin referencias internas de Stripe)
drop function public.obtener_reserva_por_token(text);
create or replace function public.obtener_reserva_por_token(p_token text)
returns table (
  id text, especialidad_id text, profesional_id text, fecha date, hora text,
  precio integer, deposito integer, estado text, metodo_pago text, reembolso boolean,
  paciente_nombre text, paciente_apellidos text, paciente_email text, token_acceso text,
  expira_en timestamptz, garantia_tarjeta text, cancelada_tarde boolean, cobro_importe integer
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.especialidad_id, r.profesional_id, r.fecha, r.hora, r.precio, r.deposito,
         case when r.estado = 'pendiente_pago' and r.expira_en < now() then 'cancelada' else r.estado end,
         r.metodo_pago, r.reembolso, r.paciente_nombre, r.paciente_apellidos,
         r.paciente_email, r.token_acceso, r.expira_en, r.garantia_tarjeta, r.cancelada_tarde,
         case when r.cobro_ref is not null and not r.cobro_devuelto then r.cobro_importe end
    from public.reservas r
   where r.token_acceso = p_token and length(p_token) >= 32;
$$;

-- 6. Cancelar desde el enlace. Devuelve true si es una cancelación tardía
--    (menos de 24 h) de una cita garantizada con tarjeta: la clínica podrá
--    cobrar el 50 %. El paciente lo ve avisado antes de confirmar.
create or replace function public.cancelar_reserva_por_token(p_token text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_r public.reservas%rowtype;
  v_tarde boolean;
begin
  select * into v_r from public.reservas where token_acceso = p_token for update;
  if not found then raise exception 'Cita no encontrada' using errcode = 'P0001'; end if;
  if v_r.estado not in ('confirmada', 'sin_deposito', 'pendiente_pago') then
    raise exception 'Esta cita ya no se puede cancelar' using errcode = 'P0001';
  end if;
  if (v_r.fecha + v_r.hora::time) < public.ahora_madrid() then
    raise exception 'La cita ya ha pasado' using errcode = 'P0001';
  end if;
  v_tarde := v_r.estado = 'confirmada' and v_r.garantia_metodo is not null
             and (v_r.fecha + v_r.hora::time) - public.ahora_madrid() <= interval '24 hours';
  update public.reservas set estado = 'cancelada', reembolso = false, cancelada_tarde = v_tarde where id = v_r.id;
  return v_tarde;
end;
$$;

-- 7. Funciones solo para el servidor de la web (service_role)

-- La tarjeta ya está guardada en Stripe: se confirma la cita. Devuelve:
--   'confirmada' → cita confirmada (o ya lo estaba)
--   'caducada'   → el hueco ya no estaba libre (no se ha cobrado nada)
create or replace function public.confirmar_garantia(
  p_reserva_id text, p_cliente text, p_metodo text, p_tarjeta text
)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v_r public.reservas%rowtype;
begin
  select * into v_r from public.reservas where id = p_reserva_id for update;
  if not found then return 'caducada'; end if;
  if v_r.garantia_metodo = p_metodo then return 'confirmada'; end if;  -- ya aplicado
  if v_r.estado = 'pendiente_pago'
     or (v_r.estado = 'cancelada' and v_r.garantia_metodo is null and not v_r.cancelada_tarde
         and (v_r.fecha + v_r.hora::time) > public.ahora_madrid()) then
    begin
      update public.reservas
         set estado = 'confirmada', expira_en = null, metodo_pago = 'tarjeta',
             garantia_cliente = p_cliente, garantia_metodo = p_metodo, garantia_tarjeta = p_tarjeta
       where id = v_r.id;
      return 'confirmada';
    exception when unique_violation then
      return 'caducada';
    end;
  end if;
  if v_r.estado in ('confirmada', 'sin_deposito') then
    -- Cambió de tarjeta: se guarda la nueva
    update public.reservas
       set garantia_cliente = p_cliente, garantia_metodo = p_metodo, garantia_tarjeta = p_tarjeta,
           metodo_pago = 'tarjeta', estado = 'confirmada'
     where id = v_r.id;
    return 'confirmada';
  end if;
  return 'caducada';
end;
$$;

-- Datos para cobrar la ausencia
create or replace function public.datos_cobro(p_reserva_id text)
returns table (
  estado text, precio integer, fecha date, hora text, cancelada_tarde boolean,
  garantia_cliente text, garantia_metodo text, cobro_ref text, cobro_importe integer, cobro_devuelto boolean,
  paciente_nombre text, paciente_apellidos text, paciente_email text
)
language sql stable security definer set search_path = '' as $$
  select r.estado, r.precio, r.fecha, r.hora, r.cancelada_tarde, r.garantia_cliente, r.garantia_metodo,
         r.cobro_ref, r.cobro_importe, r.cobro_devuelto, r.paciente_nombre, r.paciente_apellidos, r.paciente_email
    from public.reservas r where r.id = p_reserva_id;
$$;

-- Guarda el resultado de un intento de cobro (p_ref null = falló)
create or replace function public.registrar_cobro(p_reserva_id text, p_ref text, p_importe integer, p_error text)
returns void language sql volatile security definer set search_path = '' as $$
  update public.reservas
     set cobro_ref     = coalesce(p_ref, cobro_ref),
         cobro_importe = case when p_ref is not null then p_importe else cobro_importe end,
         cobro_at      = case when p_ref is not null then now() else cobro_at end,
         cobro_devuelto = case when p_ref is not null then false else cobro_devuelto end,
         cobro_error   = p_error
   where id = p_reserva_id;
$$;

create or replace function public.registrar_devolucion_cobro(p_reserva_id text)
returns void language sql volatile security definer set search_path = '' as $$
  update public.reservas set cobro_devuelto = true where id = p_reserva_id;
$$;

-- 8. Permisos
revoke execute on function
  public.confirmar_garantia(text, text, text, text),
  public.datos_cobro(text),
  public.registrar_cobro(text, text, integer, text),
  public.registrar_devolucion_cobro(text)
from public, anon, authenticated;
grant execute on function public.obtener_reserva_por_token(text) to anon, authenticated;
grant execute on function
  public.confirmar_garantia(text, text, text, text),
  public.datos_cobro(text),
  public.registrar_cobro(text, text, integer, text),
  public.registrar_devolucion_cobro(text)
to service_role;
