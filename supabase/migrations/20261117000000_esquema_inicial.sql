-- =====================================================================
-- Policlínico Redondela · Esquema de la base de datos
-- Ejecutar UNA VEZ, completo, en el editor SQL de un proyecto nuevo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

create table public.especialidades (
  id                text primary key,
  nombre            text    not null,
  descripcion_corta text    not null default '',
  duracion_min      integer not null check (duracion_min between 5 and 240),
  precio            integer not null check (precio >= 0),
  deposito          integer not null default 0 check (deposito >= 0),
  activa            boolean not null default true,
  orden             integer not null default 0,
  constraint especialidades_deposito_max check (deposito <= precio)
);

create table public.profesionales (
  id              text primary key,
  nombre          text    not null,
  rol             text    not null,
  especialidad_id text    not null references public.especialidades (id) on update cascade,
  -- {"lun":"mt","mar":"m",...}  m = mañana, t = tarde, mt = ambos
  horario         jsonb   not null default '{}'::jsonb check (jsonb_typeof(horario) = 'object'),
  activo          boolean not null default true,
  orden           integer not null default 0
);
create index profesionales_especialidad_idx on public.profesionales (especialidad_id);

create table public.festivos (
  fecha       date primary key,
  descripcion text not null default ''
);

create table public.usuarios_panel (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text        not null,
  rol        text        not null check (rol in ('admin', 'secretaria')),
  created_at timestamptz not null default now()
);

create table public.reservas (
  id                 text primary key check (id ~ '^RDN-[0-9]{5}$'),
  especialidad_id    text    not null references public.especialidades (id) on update cascade,
  profesional_id     text    not null references public.profesionales (id) on update cascade,
  fecha              date    not null,
  hora               text    not null check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  precio             integer not null check (precio >= 0),
  deposito           integer not null check (deposito >= 0),
  estado             text    not null default 'sin_deposito'
                     check (estado in ('confirmada', 'sin_deposito', 'cancelada', 'completada')),
  metodo_pago        text    check (metodo_pago in ('tarjeta', 'bizum', 'recepcion')),
  reembolso          boolean not null default false,
  paciente_nombre    text    not null,
  paciente_apellidos text    not null,
  paciente_dni       text    not null default '',
  paciente_telefono  text    not null,
  paciente_email     text    not null default '',
  paciente_motivo    text    not null default '',
  origen             text    not null default 'web' check (origen in ('web', 'panel')),
  token_acceso       text    not null unique default gen_random_uuid()::text,
  created_at         timestamptz not null default now()
);

create index reservas_fecha_idx       on public.reservas (fecha, hora);
create index reservas_profesional_idx on public.reservas (profesional_id, fecha);

-- Nunca dos citas activas con el mismo profesional a la misma hora.
create unique index reservas_hueco_unico
  on public.reservas (profesional_id, fecha, hora)
  where estado <> 'cancelada';

-- ---------------------------------------------------------------------
-- 2. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------

create or replace function public.es_usuario_panel()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_panel where id = auth.uid());
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.usuarios_panel where id = auth.uid() and rol = 'admin');
$$;

-- Hora actual en España
create or replace function public.ahora_madrid()
returns timestamp language sql stable set search_path = '' as $$
  select (now() at time zone 'Europe/Madrid');
$$;

-- Código RDN-xxxxx libre
create or replace function public.generar_id_reserva()
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v_id text;
begin
  for i in 1..50 loop
    v_id := 'RDN-' || lpad(floor(random() * 100000)::int::text, 5, '0');
    if not exists (select 1 from public.reservas where id = v_id) then
      return v_id;
    end if;
  end loop;
  raise exception 'No se pudo generar un código de reserva libre';
end;
$$;

alter table public.reservas alter column id set default public.generar_id_reserva();

-- ¿Es (fecha, hora) un hueco válido del horario del profesional?
-- Turnos: mañana 09:00–14:00, tarde 16:00–20:30. Las citas empiezan
-- al inicio del turno y se encadenan cada `duracion_min` minutos.
create or replace function public.es_hueco_valido(p_profesional_id text, p_fecha date, p_hora text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_prof  public.profesionales%rowtype;
  v_dur   integer;
  v_turno text;
  v_min   integer;
  v_dia   text;
begin
  select * into v_prof from public.profesionales where id = p_profesional_id and activo;
  if not found then return false; end if;
  select duracion_min into v_dur from public.especialidades where id = v_prof.especialidad_id and activa;
  if not found then return false; end if;
  if exists (select 1 from public.festivos where fecha = p_fecha) then return false; end if;

  v_dia := (array['dom','lun','mar','mie','jue','vie','sab'])[extract(dow from p_fecha)::int + 1];
  v_turno := v_prof.horario ->> v_dia;
  if v_turno is null then return false; end if;

  v_min := split_part(p_hora, ':', 1)::int * 60 + split_part(p_hora, ':', 2)::int;

  if v_turno in ('m', 'mt') and v_min >= 540 and v_min + v_dur <= 840 and (v_min - 540) % v_dur = 0 then
    return true;
  end if;
  if v_turno in ('t', 'mt') and v_min >= 960 and v_min + v_dur <= 1230 and (v_min - 960) % v_dur = 0 then
    return true;
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. FUNCIONES PÚBLICAS (web del paciente, sin cuenta)
-- ---------------------------------------------------------------------

-- Huecos ocupados de una especialidad (sin datos de pacientes)
create or replace function public.horas_ocupadas(p_especialidad_id text, p_desde date, p_hasta date)
returns table (profesional_id text, fecha date, hora text)
language sql stable security definer set search_path = '' as $$
  select r.profesional_id, r.fecha, r.hora
    from public.reservas r
   where r.especialidad_id = p_especialidad_id
     and r.fecha between p_desde and least(p_hasta, p_desde + 92)
     and r.estado <> 'cancelada';
$$;

-- Crear una reserva desde la web. Devuelve el código y el token de acceso.
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
returns table (id text, token_acceso text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_esp   public.especialidades%rowtype;
  v_prof  public.profesionales%rowtype;
  v_ahora timestamp := public.ahora_madrid();
begin
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

  begin
    return query
    insert into public.reservas as r (
      especialidad_id, profesional_id, fecha, hora, precio, deposito, estado, metodo_pago,
      paciente_nombre, paciente_apellidos, paciente_dni, paciente_telefono, paciente_email, paciente_motivo, origen
    ) values (
      v_esp.id, v_prof.id, p_fecha, p_hora, v_esp.precio, v_esp.deposito,
      -- PAGO SIMULADO: cuando haya pasarela, la reserva nacerá 'sin_deposito'
      -- y pasará a 'confirmada' cuando la pasarela confirme el cobro.
      'confirmada', p_metodo_pago,
      left(trim(p_nombre), 80), left(trim(p_apellidos), 120), upper(left(trim(coalesce(p_dni, '')), 12)),
      left(trim(p_telefono), 20), lower(left(trim(p_email), 160)), left(trim(coalesce(p_motivo, '')), 1000), 'web'
    )
    returning r.id, r.token_acceso;
  exception when unique_violation then
    raise exception 'Alguien acaba de reservar ese hueco. Elige otra hora.' using errcode = 'P0001';
  end;
end;
$$;

-- Datos de una cita a partir de su token (enlace del email)
create or replace function public.obtener_reserva_por_token(p_token text)
returns table (
  id text, especialidad_id text, profesional_id text, fecha date, hora text,
  precio integer, deposito integer, estado text, metodo_pago text, reembolso boolean,
  paciente_nombre text, paciente_apellidos text, paciente_email text, token_acceso text
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.especialidad_id, r.profesional_id, r.fecha, r.hora, r.precio, r.deposito,
         r.estado, r.metodo_pago, r.reembolso, r.paciente_nombre, r.paciente_apellidos,
         r.paciente_email, r.token_acceso
    from public.reservas r
   where r.token_acceso = p_token and length(p_token) >= 32;
$$;

-- Buscar el token con el código + email (para quien no tiene el enlace)
create or replace function public.buscar_reserva(p_codigo text, p_email text)
returns text language sql stable security definer set search_path = '' as $$
  select r.token_acceso
    from public.reservas r
   where r.id = upper(trim(p_codigo))
     and r.paciente_email <> ''
     and r.paciente_email = lower(trim(p_email))
   limit 1;
$$;

-- Cancelar desde el enlace. Devuelve si se reembolsa el anticipo.
create or replace function public.cancelar_reserva_por_token(p_token text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_r public.reservas%rowtype;
  v_reembolso boolean;
begin
  select * into v_r from public.reservas where token_acceso = p_token for update;
  if not found then raise exception 'Cita no encontrada' using errcode = 'P0001'; end if;
  if v_r.estado not in ('confirmada', 'sin_deposito') then
    raise exception 'Esta cita ya no se puede cancelar' using errcode = 'P0001';
  end if;
  if (v_r.fecha + v_r.hora::time) < public.ahora_madrid() then
    raise exception 'La cita ya ha pasado' using errcode = 'P0001';
  end if;
  v_reembolso := v_r.estado = 'confirmada'
                 and (v_r.fecha + v_r.hora::time) - public.ahora_madrid() > interval '24 hours';
  update public.reservas set estado = 'cancelada', reembolso = v_reembolso where id = v_r.id;
  return v_reembolso;
end;
$$;

-- Cambiar día/hora desde el enlace (solo con más de 24 h, mismo profesional)
create or replace function public.cambiar_reserva_por_token(p_token text, p_fecha date, p_hora text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_r public.reservas%rowtype;
  v_ahora timestamp := public.ahora_madrid();
begin
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

-- ---------------------------------------------------------------------
-- 4. SEGURIDAD (Row Level Security)
-- ---------------------------------------------------------------------

alter table public.especialidades enable row level security;
alter table public.profesionales  enable row level security;
alter table public.festivos       enable row level security;
alter table public.reservas       enable row level security;
alter table public.usuarios_panel enable row level security;

-- Especialidades y profesionales: lectura pública de lo activo; el panel ve todo; el admin edita.
create policy "especialidades: lectura" on public.especialidades for select to anon, authenticated
  using (activa or public.es_usuario_panel());
create policy "especialidades: admin" on public.especialidades for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy "profesionales: lectura" on public.profesionales for select to anon, authenticated
  using (activo or public.es_usuario_panel());
create policy "profesionales: admin" on public.profesionales for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Festivos: lectura pública; el personal del panel los gestiona.
create policy "festivos: lectura" on public.festivos for select to anon, authenticated using (true);
create policy "festivos: panel" on public.festivos for all to authenticated
  using (public.es_usuario_panel()) with check (public.es_usuario_panel());

-- Reservas: SOLO el personal del panel. Los pacientes usan las funciones de arriba.
create policy "reservas: panel lee" on public.reservas for select to authenticated
  using (public.es_usuario_panel());
create policy "reservas: panel crea" on public.reservas for insert to authenticated
  with check (public.es_usuario_panel());
create policy "reservas: panel modifica" on public.reservas for update to authenticated
  using (public.es_usuario_panel()) with check (public.es_usuario_panel());
create policy "reservas: admin borra" on public.reservas for delete to authenticated
  using (public.es_admin());

-- Usuarios del panel: cada uno ve su ficha; el admin gestiona.
create policy "usuarios_panel: ver" on public.usuarios_panel for select to authenticated
  using (id = auth.uid() or public.es_admin());
create policy "usuarios_panel: admin" on public.usuarios_panel for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Permisos de las funciones: las públicas para todos, las internas solo para el sistema
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.horas_ocupadas(text, date, date),
  public.crear_reserva(text, text, date, text, text, text, text, text, text, text, text),
  public.obtener_reserva_por_token(text),
  public.buscar_reserva(text, text),
  public.cancelar_reserva_por_token(text),
  public.cambiar_reserva_por_token(text, date, text)
to anon, authenticated;
-- Necesarias para evaluar las reglas de seguridad y los valores por defecto
grant execute on function public.es_usuario_panel(), public.es_admin(), public.generar_id_reserva() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. DATOS INICIALES (provisionales: cámbialos desde el panel)
-- ---------------------------------------------------------------------

insert into public.especialidades (id, nombre, descripcion_corta, duracion_min, precio, deposito, orden) values
  ('medicina-general', 'Medicina general', 'Consultas, revisiones, certificados y seguimiento de tu salud del día a día.', 20, 35, 8, 1),
  ('fisioterapia',     'Fisioterapia',     'Dolor de espalda, cervicales, lesiones deportivas y recuperación tras una operación.', 45, 40, 10, 2),
  ('traumatologia',    'Traumatología',    'Diagnóstico y tratamiento de lesiones de huesos, articulaciones y ligamentos.', 30, 60, 15, 3),
  ('psicologia',       'Psicología',       'Ansiedad, estrés, duelo o autoestima. Terapia para adultos y adolescentes.', 50, 55, 15, 4),
  ('podologia',        'Podología',        'Quiropodia, uñas encarnadas, plantillas a medida y estudio de la pisada.', 30, 35, 8, 5),
  ('cardiologia',      'Cardiología',      'Electrocardiograma, control de la tensión y revisiones cardiovasculares.', 30, 70, 20, 6),
  ('nutricion',        'Nutrición',        'Planes de alimentación personalizados para perder peso, deporte o patologías.', 45, 50, 15, 7);

insert into public.profesionales (id, nombre, rol, especialidad_id, horario, orden) values
  ('carmen-otero',  'Dra. Carmen Otero',  'Médica de familia',        'medicina-general', '{"lun":"mt","mar":"mt","mie":"mt","jue":"mt","vie":"m"}', 1),
  ('xose-lago',     'Dr. Xosé Lago',      'Médico de familia',        'medicina-general', '{"lun":"t","mar":"m","mie":"t","jue":"m","vie":"mt","sab":"m"}', 2),
  ('laura-mendez',  'Laura Méndez',       'Fisioterapeuta',           'fisioterapia',     '{"lun":"mt","mar":"mt","mie":"m","jue":"mt","vie":"mt","sab":"m"}', 3),
  ('iago-pereira',  'Iago Pereira',       'Fisioterapeuta deportivo', 'fisioterapia',     '{"lun":"t","mar":"t","mie":"mt","jue":"t","vie":"m"}', 4),
  ('andres-covelo', 'Dr. Andrés Covelo',  'Traumatólogo',             'traumatologia',    '{"mar":"t","jue":"mt"}', 5),
  ('noa-rial',      'Noa Rial',           'Psicóloga sanitaria',      'psicologia',       '{"lun":"mt","mie":"mt","vie":"m"}', 6),
  ('sara-iglesias', 'Sara Iglesias',      'Podóloga',                 'podologia',        '{"mar":"m","jue":"mt","sab":"m"}', 7),
  ('elena-bouzas',  'Dra. Elena Bouzas',  'Cardióloga',               'cardiologia',      '{"lun":"m","mie":"m"}', 8),
  ('marta-souto',   'Marta Souto',        'Dietista-nutricionista',   'nutricion',        '{"mar":"mt","jue":"t","vie":"m"}', 9);

insert into public.festivos (fecha, descripcion) values
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-01-06', 'Reyes');

-- ---------------------------------------------------------------------
-- 6. USUARIOS DEL PANEL (ejecutar aparte, después de crearlos en
--    Authentication → Users → Add user, con "Auto Confirm User"):
--
-- insert into public.usuarios_panel (id, nombre, rol)
-- select id, 'Admin', 'admin' from auth.users where email = 'TU_EMAIL_DE_ADMIN';
--
-- insert into public.usuarios_panel (id, nombre, rol)
-- select id, 'María', 'secretaria' from auth.users where email = 'EMAIL_DE_MARIA';
-- ---------------------------------------------------------------------
