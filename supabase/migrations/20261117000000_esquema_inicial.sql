-- =====================================================================
-- Policlínico Redondela · Esquema inicial
-- Ejecutar completo en el editor SQL de Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

create table public.especialidades (
  id                text primary key,
  nombre            text    not null,
  descripcion_corta text    not null default '',
  descripcion_larga text    not null default '',
  duracion_min      integer not null check (duracion_min > 0),
  precio            integer not null check (precio >= 0),
  deposito          integer not null default 0 check (deposito >= 0),
  activa            boolean not null default true,
  constraint especialidades_deposito_max check (deposito <= precio)
);

create table public.profesionales (
  id              text primary key,
  nombre          text    not null,
  rol             text    not null,
  especialidad_id text    not null references public.especialidades (id) on update cascade,
  horario         jsonb   not null default '{}'::jsonb
                  check (jsonb_typeof(horario) = 'object'),
  activo          boolean not null default true
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

-- Genera 'RDN-' + 5 dígitos aleatorios que no existan ya.
-- SECURITY DEFINER para poder comprobar duplicados aunque anon no lea reservas.
create or replace function public.generar_id_reserva()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id text;
begin
  for i in 1..50 loop
    v_id := 'RDN-' || lpad(floor(random() * 100000)::int::text, 5, '0');
    if not exists (select 1 from public.reservas where id = v_id) then
      return v_id;
    end if;
  end loop;
  raise exception 'No se pudo generar un identificador de reserva libre';
end;
$$;

create table public.reservas (
  id                 text primary key default public.generar_id_reserva()
                     check (id ~ '^RDN-[0-9]{5}$'),
  especialidad_id    text    not null references public.especialidades (id) on update cascade,
  profesional_id     text    not null references public.profesionales (id) on update cascade,
  fecha              date    not null,
  hora               text    not null check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  precio             integer not null default 0 check (precio >= 0),
  deposito           integer not null default 0 check (deposito >= 0),
  estado             text    not null default 'sin_deposito'
                     check (estado in ('confirmada', 'sin_deposito', 'cancelada', 'completada')),
  metodo_pago        text,
  reembolso          boolean not null default false,
  paciente_nombre    text    not null,
  paciente_apellidos text    not null,
  paciente_dni       text    not null,
  paciente_telefono  text    not null,
  paciente_email     text    not null,
  paciente_motivo    text,
  token_acceso       text    not null unique default gen_random_uuid()::text
                     check (token_acceso ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  created_at         timestamptz not null default now()
);

create index reservas_fecha_idx        on public.reservas (fecha);
create index reservas_profesional_idx  on public.reservas (profesional_id, fecha);
create index reservas_especialidad_idx on public.reservas (especialidad_id);

-- Impide dos citas activas con el mismo profesional a la misma hora.
create unique index reservas_hueco_unico
  on public.reservas (profesional_id, fecha, hora)
  where estado <> 'cancelada';

-- ---------------------------------------------------------------------
-- 2. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------

-- ¿El usuario actual pertenece al panel de la clínica?
create or replace function public.es_usuario_panel()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.usuarios_panel where id = auth.uid());
$$;

-- ¿El usuario actual es administrador?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.usuarios_panel where id = auth.uid() and rol = 'admin'
  );
$$;

-- Validación y normalización de reservas creadas desde la web pública.
-- Fija precio y depósito desde la especialidad (el paciente no puede alterarlos),
-- comprueba profesional/especialidad, fecha pasada y festivos.
create or replace function public.preparar_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_esp  public.especialidades%rowtype;
  v_prof public.profesionales%rowtype;
begin
  -- El personal del panel puede crear reservas con valores manuales.
  if public.es_usuario_panel() then
    return new;
  end if;

  select * into v_esp from public.especialidades
   where id = new.especialidad_id and activa;
  if not found then
    raise exception 'La especialidad no está disponible';
  end if;

  select * into v_prof from public.profesionales
   where id = new.profesional_id and activo;
  if not found or v_prof.especialidad_id <> new.especialidad_id then
    raise exception 'El profesional no es válido para esta especialidad';
  end if;

  if new.fecha < (now() at time zone 'Europe/Madrid')::date then
    raise exception 'No se puede reservar en una fecha pasada';
  end if;

  if exists (select 1 from public.festivos where fecha = new.fecha) then
    raise exception 'La clínica está cerrada ese día';
  end if;

  new.precio     := v_esp.precio;
  new.deposito   := v_esp.deposito;
  new.reembolso  := false;
  new.created_at := now();
  return new;
end;
$$;

create trigger reservas_preparar
  before insert on public.reservas
  for each row execute function public.preparar_reserva();

-- Horas ya ocupadas de un profesional en un rango de fechas
-- (para pintar la disponibilidad sin exponer datos de pacientes).
create or replace function public.horas_ocupadas(
  p_profesional_id text,
  p_desde date,
  p_hasta date
)
returns table (fecha date, hora text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.fecha, r.hora
    from public.reservas r
   where r.profesional_id = p_profesional_id
     and r.fecha between p_desde and p_hasta
     and r.estado <> 'cancelada'
   order by r.fecha, r.hora;
$$;

-- Lectura de una reserva por su token (gestión de cita sin cuenta).
create or replace function public.obtener_reserva_por_token(p_token text)
returns setof public.reservas
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.reservas where token_acceso = p_token limit 1;
$$;

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.especialidades enable row level security;
alter table public.profesionales  enable row level security;
alter table public.festivos       enable row level security;
alter table public.reservas       enable row level security;
alter table public.usuarios_panel enable row level security;

-- ESPECIALIDADES: lectura pública de las activas; el panel ve todas; admin edita.
create policy "especialidades: lectura publica"
  on public.especialidades for select
  to anon, authenticated
  using (activa or public.es_usuario_panel());

create policy "especialidades: admin inserta"
  on public.especialidades for insert to authenticated
  with check (public.es_admin());
create policy "especialidades: admin actualiza"
  on public.especialidades for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "especialidades: admin borra"
  on public.especialidades for delete to authenticated
  using (public.es_admin());

-- PROFESIONALES: lectura pública de los activos; el panel ve todos; admin edita.
create policy "profesionales: lectura publica"
  on public.profesionales for select
  to anon, authenticated
  using (activo or public.es_usuario_panel());

create policy "profesionales: admin inserta"
  on public.profesionales for insert to authenticated
  with check (public.es_admin());
create policy "profesionales: admin actualiza"
  on public.profesionales for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "profesionales: admin borra"
  on public.profesionales for delete to authenticated
  using (public.es_admin());

-- FESTIVOS: lectura pública (el calendario los necesita); panel edita.
create policy "festivos: lectura publica"
  on public.festivos for select
  to anon, authenticated
  using (true);

create policy "festivos: panel inserta"
  on public.festivos for insert to authenticated
  with check (public.es_usuario_panel());
create policy "festivos: panel actualiza"
  on public.festivos for update to authenticated
  using (public.es_usuario_panel()) with check (public.es_usuario_panel());
create policy "festivos: panel borra"
  on public.festivos for delete to authenticated
  using (public.es_usuario_panel());

-- RESERVAS
-- Cualquiera puede crear una reserva (solo en estados iniciales).
-- No hay política SELECT para anon: el paciente lee su cita
-- con la función obtener_reserva_por_token().
create policy "reservas: insercion publica"
  on public.reservas for insert
  to anon, authenticated
  with check (
    public.es_usuario_panel()
    or (estado in ('confirmada', 'sin_deposito') and reembolso = false)
  );

create policy "reservas: panel lee"
  on public.reservas for select to authenticated
  using (public.es_usuario_panel());
create policy "reservas: panel actualiza"
  on public.reservas for update to authenticated
  using (public.es_usuario_panel()) with check (public.es_usuario_panel());
create policy "reservas: admin borra"
  on public.reservas for delete to authenticated
  using (public.es_admin());

-- USUARIOS_PANEL: cada uno ve su fila; admin gestiona todo.
create policy "usuarios_panel: ver propio o admin"
  on public.usuarios_panel for select to authenticated
  using (id = auth.uid() or public.es_admin());
create policy "usuarios_panel: admin inserta"
  on public.usuarios_panel for insert to authenticated
  with check (public.es_admin());
create policy "usuarios_panel: admin actualiza"
  on public.usuarios_panel for update to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "usuarios_panel: admin borra"
  on public.usuarios_panel for delete to authenticated
  using (public.es_admin());

-- ---------------------------------------------------------------------
-- 4. DATOS INICIALES
-- ⚠ PROVISIONALES: descripciones, duraciones, precios, depósitos,
--   profesionales y horarios deben sustituirse por los del prototipo.
-- Horario: claves lun..dom; valores 'm' (mañana), 't' (tarde), 'mt' (ambos).
-- ---------------------------------------------------------------------

insert into public.especialidades
  (id, nombre, descripcion_corta, descripcion_larga, duracion_min, precio, deposito)
values
  ('fisioterapia',  'Fisioterapia',  'Tratamiento de lesiones y dolor muscular.',        'PENDIENTE', 45, 40, 10),
  ('traumatologia', 'Traumatología', 'Diagnóstico de lesiones óseas y articulares.',     'PENDIENTE', 30, 60, 15),
  ('psicologia',    'Psicología',    'Terapia individual para adultos y adolescentes.',  'PENDIENTE', 50, 55, 15),
  ('podologia',     'Podología',     'Cuidado y tratamiento de problemas del pie.',      'PENDIENTE', 30, 35, 10),
  ('cardiologia',   'Cardiología',   'Revisión y prevención cardiovascular.',            'PENDIENTE', 30, 70, 20),
  ('nutricion',     'Nutrición',     'Planes de alimentación personalizados.',           'PENDIENTE', 45, 45, 10)
on conflict (id) do update set
  nombre            = excluded.nombre,
  descripcion_corta = excluded.descripcion_corta,
  descripcion_larga = excluded.descripcion_larga,
  duracion_min      = excluded.duracion_min,
  precio            = excluded.precio,
  deposito          = excluded.deposito;

insert into public.profesionales (id, nombre, rol, especialidad_id, horario)
values
  ('fisio-1',   'PENDIENTE · Fisioterapia',  'Fisioterapeuta',   'fisioterapia',  '{"lun":"mt","mar":"mt","mie":"m","jue":"mt","vie":"mt","sab":"m"}'),
  ('trauma-1',  'PENDIENTE · Traumatología', 'Traumatólogo/a',   'traumatologia', '{"lun":"mt","mar":"mt","mie":"m","jue":"mt","vie":"mt","sab":"m"}'),
  ('psico-1',   'PENDIENTE · Psicología',    'Psicólogo/a',      'psicologia',    '{"lun":"mt","mar":"mt","mie":"m","jue":"mt","vie":"mt","sab":"m"}'),
  ('podo-1',    'PENDIENTE · Podología',     'Podólogo/a',       'podologia',     '{"lun":"mt","mar":"mt","mie":"m","jue":"mt","vie":"mt","sab":"m"}'),
  ('cardio-1',  'PENDIENTE · Cardiología',   'Cardiólogo/a',     'cardiologia',   '{"lun":"mt","mar":"mt","mie":"m","jue":"mt","vie":"mt","sab":"m"}'),
  ('nutri-1',   'PENDIENTE · Nutrición',     'Nutricionista',    'nutricion',     '{"lun":"mt","mar":"mt","mie":"m","jue":"mt","vie":"mt","sab":"m"}')
on conflict (id) do update set
  nombre          = excluded.nombre,
  rol             = excluded.rol,
  especialidad_id = excluded.especialidad_id,
  horario         = excluded.horario;

-- ---------------------------------------------------------------------
-- 5. PRIMER ADMINISTRADOR (ejecutar aparte, tras crear el usuario en
--    Authentication → Users y copiar su UUID):
--
-- insert into public.usuarios_panel (id, nombre, rol)
-- values ('UUID-DEL-USUARIO', 'Nombre Apellido', 'admin');
-- ---------------------------------------------------------------------
