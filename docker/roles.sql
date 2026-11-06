-- Служебные роли Supabase должны использовать пароль локальной базы.
-- Файл выполняется только при создании нового Docker volume.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
