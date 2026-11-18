-- =====================================================================
-- Policlínico Redondela · Pagos online (paso 2 de la base de datos)
-- Ejecutar UNA VEZ en el editor SQL, después del esquema inicial.
-- =====================================================================

-- 1. Nuevo estado "pendiente_pago": el hueco queda apartado mientras el
--    paciente paga. Si no paga antes de `expira_en`, se libera solo.
alter table public.reservas drop constraint reservas_estado_check;
alter table public.reservas add constraint reservas_estado_check
  check (estado in ('pendiente_pago', 'confirmada', 'sin_deposito', 'cancelada', 'completada'));

alter table public.reservas
  add column expira_en timestamptz,
  add column pago_ref  text,          -- id del pago en la pasarela (para devoluciones)
  add column pago_sesion text;        -- id de la sesión de pago en curso

create index reservas_pendientes_idx on public.reservas (expira_en) where estado = 'pendiente_pago';

-- 1b. Ajustes de la clínica. `pago_online`:
--   false → pago simulado: la reserva web se confirma sin cobrar (pruebas)
--   true  → la reserva queda pendiente hasta que la pasarela confirme el pago
create table public.ajustes (
  id          boolean primary key default true check (id),  -- una sola fila
  pago_online boolean not null default false
);
insert into public.ajustes default values;
alter table public.ajustes enable row level security;
create policy "ajustes: lectura" on public.ajustes for select to anon, authenticated using (true);
create policy "ajustes: admin" on public.ajustes for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- 2. Liberar huecos de pagos no completados
create or replace function public.liberar_pagos_caducados()
returns void language sql volatile security definer set search_path = '' as $$
  update public.reservas
     set estado = 'cancelada'
   where estado = 'pendiente_pago' and expira_en < now();
$$;

-- 3. Huecos ocupados: los pendientes de pago cuentan mientras no caduquen
create or replace function public.horas_ocupadas(p_especialidad_id text, p_desde date, p_hasta date)
returns table (profesional_id text, fecha date, hora text)
language sql stable security definer set search_path = '' as $$
  select r.profesional_id, r.fecha, r.hora
    from public.reservas r
   where r.especialidad_id = p_especialidad_id
     and r.fecha between p_desde and least(p_hasta, p_desde + 92)
     and r.estado <> 'cancelada'
     and not (r.estado = 'pendiente_pago' and r.expira_en < now());
$$;

-- 4. Crear reserva: con pago online nace "pendiente_pago" (35 min para pagar).
--    Con ajustes.pago_online = false (pago simulado) nace confirmada.
drop function public.crear_reserva(text, text, date, text, text, text, text, text, text, text, text);

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
  v_pendiente boolean;
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
  if p_metodo_pago not in ('tarjeta', 'bizum') then
    raise exception 'Método de pago no válido' using errcode = 'P0001';
  end if;

  v_pendiente := v_online and v_esp.deposito > 0;

  begin
    return query
    insert into public.reservas as r (
      especialidad_id, profesional_id, fecha, hora, precio, deposito, estado, metodo_pago, expira_en,
      paciente_nombre, paciente_apellidos, paciente_dni, paciente_telefono, paciente_email, paciente_motivo, origen
    ) values (
      v_esp.id, v_prof.id, p_fecha, p_hora, v_esp.precio, v_esp.deposito,
      case when v_pendiente then 'pendiente_pago' else 'confirmada' end,
      p_metodo_pago,
      case when v_pendiente then now() + interval '35 minutes' else null end,
      left(trim(p_nombre), 80), left(trim(p_apellidos), 120), upper(left(trim(coalesce(p_dni, '')), 12)),
      left(trim(p_telefono), 20), lower(left(trim(p_email), 160)), left(trim(coalesce(p_motivo, '')), 1000), 'web'
    )
    returning r.id, r.token_acceso, r.deposito;
  exception when unique_violation then
    raise exception 'Alguien acaba de reservar ese hueco. Elige otra hora.' using errcode = 'P0001';
  end;
end;
$$;

-- 5. El paciente ve también los pendientes de pago (para reintentar el pago)
--    y si la reserva caducó, se muestra cancelada.
drop function public.obtener_reserva_por_token(text);
create or replace function public.obtener_reserva_por_token(p_token text)
returns table (
  id text, especialidad_id text, profesional_id text, fecha date, hora text,
  precio integer, deposito integer, estado text, metodo_pago text, reembolso boolean,
  paciente_nombre text, paciente_apellidos text, paciente_email text, token_acceso text,
  expira_en timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.especialidad_id, r.profesional_id, r.fecha, r.hora, r.precio, r.deposito,
         case when r.estado = 'pendiente_pago' and r.expira_en < now() then 'cancelada' else r.estado end,
         r.metodo_pago, r.reembolso, r.paciente_nombre, r.paciente_apellidos,
         r.paciente_email, r.token_acceso, r.expira_en
    from public.reservas r
   where r.token_acceso = p_token and length(p_token) >= 32;
$$;

-- 6. Cancelar desde el enlace: también los pendientes de pago (sin reembolso).
--    Devuelve si hay que devolver el anticipo; la devolución en la pasarela
--    la hace el servidor de la web.
create or replace function public.cancelar_reserva_por_token(p_token text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_r public.reservas%rowtype;
  v_reembolso boolean;
begin
  select * into v_r from public.reservas where token_acceso = p_token for update;
  if not found then raise exception 'Cita no encontrada' using errcode = 'P0001'; end if;
  if v_r.estado not in ('confirmada', 'sin_deposito', 'pendiente_pago') then
    raise exception 'Esta cita ya no se puede cancelar' using errcode = 'P0001';
  end if;
  if (v_r.fecha + v_r.hora::time) < public.ahora_madrid() then
    raise exception 'La cita ya ha pasado' using errcode = 'P0001';
  end if;
  v_reembolso := v_r.estado = 'confirmada' and v_r.metodo_pago in ('tarjeta', 'bizum')
                 and (v_r.fecha + v_r.hora::time) - public.ahora_madrid() > interval '24 hours';
  update public.reservas set estado = 'cancelada', reembolso = v_reembolso where id = v_r.id;
  return v_reembolso;
end;
$$;

-- 6b. Cambiar día/hora: liberar antes los pagos caducados
create or replace function public.cambiar_reserva_por_token(p_token text, p_fecha date, p_hora text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_r public.reservas%rowtype;
  v_ahora timestamp := public.ahora_madrid();
begin
  perform public.liberar_pagos_caducados();
  select * into v_r from public.reservas where token_acceso = p_token for update;
  if not found then raise exception 'Cita no encontrada' using errcode = 'P0001'; end if;
  if v_r.estado not in ('confirmada', 'sin_deposito') then
    raise exception 'Esta cita ya no se puede cambiar' using errcode = 'P0001';
  end if;
  if (v_r.fecha + v_r.hora::time) - v_ahora <= interval '24 hours' then
    raise exception 'Con menos de 24 h, llama a la clínica para cambiarla' using errcode = 'P0001';
  end if;
  if (p_fecha + p_hora::time) < v_ahora + interval '1 hour' or p_fecha > v_ahora::date + 60 then
    raise exception 'Fecha no disponible' using errcode = 'P0001';
  end if;
  if not public.es_hueco_valido(v_r.profesional_id, p_fecha, p_hora) then
    raise exception 'Ese hueco no está en el horario' using errcode = 'P0001';
  end if;
  begin
    update public.reservas set fecha = p_fecha, hora = p_hora where id = v_r.id;
  exception when unique_violation then
    raise exception 'Ese hueco ya está ocupado. Elige otra hora.' using errcode = 'P0001';
  end;
end;
$$;

-- 7. Funciones solo para el servidor de la web (clave secreta / service_role)
-- Al abrir una sesión de pago se alarga la reserva del hueco (Stripe da 30 min).
-- Devuelve false si la reserva ya no está pendiente (caducada o cancelada).
create or replace function public.registrar_sesion_pago(p_reserva_id text, p_sesion text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.reservas
     set pago_sesion = p_sesion,
         expira_en = greatest(expira_en, now() + interval '35 minutes')
   where id = p_reserva_id and estado = 'pendiente_pago' and expira_en > now();
  return found;
end;
$$;

-- Confirma el pago. Devuelve:
--   'confirmada'  → pago aplicado (o ya lo estaba)
--   'caducada'    → la reserva había caducado/cancelado: hay que devolver el dinero
create or replace function public.confirmar_pago(p_reserva_id text, p_pago_ref text, p_metodo text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v_r public.reservas%rowtype;
begin
  select * into v_r from public.reservas where id = p_reserva_id for update;
  if not found then return 'caducada'; end if;
  if v_r.pago_ref = p_pago_ref then return 'confirmada'; end if;  -- ya aplicado (idempotente)
  if v_r.estado = 'pendiente_pago' then
    begin
      update public.reservas
         set estado = 'confirmada', pago_ref = p_pago_ref, expira_en = null,
             metodo_pago = coalesce(p_metodo, metodo_pago)
       where id = v_r.id;
      return 'confirmada';
    exception when unique_violation then
      return 'caducada';
    end;
  end if;
  if v_r.estado = 'cancelada' and v_r.pago_ref is null then
    -- Pagó tarde: si el hueco sigue libre, se recupera la cita
    begin
      update public.reservas
         set estado = 'confirmada', pago_ref = p_pago_ref, expira_en = null, reembolso = false
       where id = v_r.id;
      return 'confirmada';
    exception when unique_violation then
      update public.reservas set pago_ref = p_pago_ref, reembolso = true where id = v_r.id;
      return 'caducada';
    end;
  end if;
  return 'confirmada';
end;
$$;

-- Datos para hacer una devolución (pago_ref) de una reserva
create or replace function public.datos_reembolso(p_reserva_id text)
returns table (pago_ref text, deposito integer, reembolso boolean, estado text)
language sql stable security definer set search_path = '' as $$
  select r.pago_ref, r.deposito, r.reembolso, r.estado from public.reservas r where r.id = p_reserva_id;
$$;

-- 8. Permisos
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.horas_ocupadas(text, date, date),
  public.crear_reserva(text, text, date, text, text, text, text, text, text, text, text),
  public.obtener_reserva_por_token(text),
  public.buscar_reserva(text, text),
  public.cancelar_reserva_por_token(text),
  public.cambiar_reserva_por_token(text, date, text)
to anon, authenticated;
grant execute on function public.es_usuario_panel(), public.es_admin(), public.generar_id_reserva() to anon, authenticated;
-- El panel también libera caducados al cargar
grant execute on function public.liberar_pagos_caducados() to authenticated;
-- Solo el servidor (service_role)
grant execute on function
  public.registrar_sesion_pago(text, text),
  public.confirmar_pago(text, text, text),
  public.datos_reembolso(text),
  public.liberar_pagos_caducados()
to service_role;
