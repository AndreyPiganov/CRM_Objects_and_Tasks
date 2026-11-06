\set ON_ERROR_STOP on

select exists (
  select 1
  from public.objects
  where id = '10000000-0000-0000-0000-000000000001'
) as local_seed_exists \gset

\if :local_seed_exists
  \echo 'Локальные демоданные уже загружены.'
\else
  \ir ../seed/seed.example.sql
\endif
