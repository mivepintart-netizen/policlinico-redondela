-- =====================================================================
-- Policlínico Redondela · Emails (paso 3 de la base de datos)
-- Ejecutar UNA VEZ en el editor SQL, después de los dos anteriores.
-- =====================================================================

-- Momento en que se envió el email de confirmación (para no enviarlo dos veces)
alter table public.reservas add column email_confirmacion_at timestamptz;
