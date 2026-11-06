#!/bin/sh
set -eu

psql --set ON_ERROR_STOP=1 <<'SQL'
create schema if not exists crm_migrations;
revoke all on schema crm_migrations from public;

create table if not exists crm_migrations.applied_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now()
);

revoke all on table crm_migrations.applied_migrations from public;
SQL

for migration in /migrations/*.sql; do
  filename="${migration##*/}"
  version="${filename%%_*}"

  case "$version" in
    ''|*[!0-9]*)
      echo "Некорректное имя миграции: $filename" >&2
      exit 1
      ;;
  esac

  applied="$(psql --tuples-only --no-align --command="select 1 from crm_migrations.applied_migrations where version = '$version'")"
  if [ "$applied" = "1" ]; then
    echo "Миграция уже применена: $filename"
    continue
  fi

  echo "Применение миграции: $filename"
  psql --set ON_ERROR_STOP=1 --single-transaction --file="$migration"
  psql --set ON_ERROR_STOP=1 --command="insert into crm_migrations.applied_migrations (version, name) values ('$version', '$filename')"
done
