-- =====================================================================
-- Policlínico Redondela · Recordatorios (paso 4 de la base de datos)
-- Ejecutar UNA VEZ en el editor SQL, después de los anteriores.
-- =====================================================================

-- Momento en que se envió el recordatorio del día anterior (para no repetirlo)
alter table public.reservas add column recordatorio_at timestamptz;
