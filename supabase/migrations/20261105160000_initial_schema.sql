create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('setter', 'executor');
create type public.task_status as enum (
  'new',
  'in_progress',
  'review',
  'accepted',
  'revision'
);

create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (
    char_length(btrim(display_name)) between 1 and 120
  ),
  role public.user_role not null default 'executor',
  created_at timestamptz not null default now()
);

create table public.objects (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  address text not null check (char_length(btrim(address)) between 1 and 500),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint objects_deletion_pair check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create table public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  object_id uuid not null references public.objects (id),
  assignee_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  author_id uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  constraint tasks_deletion_pair check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  )
);

create table public.task_status_history (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks (id),
  actor_id uuid not null references public.profiles (id),
  from_status public.task_status,
  to_status public.task_status not null,
  comment text check (comment is null or char_length(comment) <= 2000),
  changed_at timestamptz not null default now(),
  constraint history_status_changed check (
    from_status is null or from_status <> to_status
  )
);

create index objects_created_by_idx on public.objects (created_by);
create index objects_active_idx on public.objects (created_at desc)
  where deleted_at is null;
create index tasks_object_idx on public.tasks (object_id, created_at desc);
create index tasks_assignee_idx on public.tasks (assignee_id, created_at desc)
  where deleted_at is null;
create index tasks_status_idx on public.tasks (status)
  where deleted_at is null;
create index task_status_history_task_idx
  on public.task_status_history (task_id, changed_at desc);

create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
$$;

create function private.is_setter()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() = 'setter', false)
$$;

create function private.is_executor(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id and p.role = 'executor'
  )
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Пользователь'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Пользователь'
  )
from auth.users as u
on conflict (id) do nothing;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_objects_updated_at
before update on public.objects
for each row execute function private.set_updated_at();

create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function private.set_updated_at();

create function private.validate_task_relations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_executor(new.assignee_id) then
    raise exception 'Назначенный пользователь должен быть исполнителем'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.objects as o
    where o.id = new.object_id and o.deleted_at is null
  ) then
    raise exception 'Объект не найден или удалён'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger validate_task_relations_on_insert
before insert on public.tasks
for each row execute function private.validate_task_relations();

create trigger validate_task_relations_on_update
before update of object_id, assignee_id on public.tasks
for each row execute function private.validate_task_relations();

create function private.add_initial_task_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_status_history (
    task_id,
    actor_id,
    from_status,
    to_status,
    changed_at
  )
  values (new.id, new.author_id, null, new.status, new.created_at);
  return new;
end;
$$;

create trigger add_initial_task_history
after insert on public.tasks
for each row execute function private.add_initial_task_history();

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

create policy profiles_select_visible
on public.profiles
for select
to authenticated
using (
  private.is_setter()
  or id = (select auth.uid())
  or exists (
    select 1
    from public.tasks as t
    where t.deleted_at is null
      and t.assignee_id = (select auth.uid())
      and (profiles.id = t.author_id or profiles.id = t.assignee_id)
  )
);

create policy objects_select_visible
on public.objects
for select
to authenticated
using (
  deleted_at is null
  and (
    private.is_setter()
    or exists (
      select 1
      from public.tasks as t
      where t.object_id = objects.id
        and t.assignee_id = (select auth.uid())
        and t.deleted_at is null
    )
  )
);

create policy objects_insert_setter
on public.objects
for insert
to authenticated
with check (
  private.is_setter()
  and created_by = (select auth.uid())
  and deleted_at is null
  and deleted_by is null
);

create policy objects_update_setter
on public.objects
for update
to authenticated
using (private.is_setter() and deleted_at is null)
with check (private.is_setter() and deleted_at is null and deleted_by is null);

create policy tasks_select_visible
on public.tasks
for select
to authenticated
using (
  deleted_at is null
  and (private.is_setter() or assignee_id = (select auth.uid()))
);

create policy tasks_insert_setter
on public.tasks
for insert
to authenticated
with check (
  private.is_setter()
  and author_id = (select auth.uid())
  and status = 'new'
  and deleted_at is null
  and deleted_by is null
  and private.is_executor(assignee_id)
  and exists (
    select 1
    from public.objects as o
    where o.id = object_id and o.deleted_at is null
  )
);

create policy tasks_update_setter
on public.tasks
for update
to authenticated
using (private.is_setter() and deleted_at is null)
with check (private.is_setter() and deleted_at is null and deleted_by is null);

create policy task_history_select_visible
on public.task_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.tasks as t
    where t.id = task_status_history.task_id and t.deleted_at is null
  )
);

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.objects from anon, authenticated;
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.task_status_history from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.objects to authenticated;
grant insert (name, address) on table public.objects to authenticated;
grant update (name, address) on table public.objects to authenticated;
grant select on table public.tasks to authenticated;
grant insert (title, description, object_id, assignee_id)
  on table public.tasks to authenticated;
grant update (title, description, object_id, assignee_id)
  on table public.tasks to authenticated;
grant select on table public.task_status_history to authenticated;

grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_setter() to authenticated;
grant execute on function private.is_executor(uuid) to authenticated;

create function public.transition_task(
  p_task_id uuid,
  p_target_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role public.user_role;
  v_task public.tasks%rowtype;
  v_from_status public.task_status;
  v_comment text := nullif(btrim(p_comment), '');
begin
  if v_actor_id is null then
    raise exception 'Требуется авторизация' using errcode = '42501';
  end if;

  select p.role into v_role
  from public.profiles as p
  where p.id = v_actor_id;

  if v_role is null then
    raise exception 'Профиль пользователя не найден' using errcode = '42501';
  end if;

  select * into v_task
  from public.tasks as t
  where t.id = p_task_id and t.deleted_at is null
  for update;

  if not found then
    raise exception 'Задача не найдена' using errcode = 'P0002';
  end if;

  v_from_status := v_task.status;

  if v_task.status = 'new' and p_target_status = 'in_progress' then
    if v_role <> 'executor' or v_task.assignee_id <> v_actor_id then
      raise exception 'Переход доступен только назначенному исполнителю'
        using errcode = '42501';
    end if;
  elsif v_task.status = 'in_progress' and p_target_status = 'review' then
    if v_role <> 'executor' or v_task.assignee_id <> v_actor_id then
      raise exception 'Переход доступен только назначенному исполнителю'
        using errcode = '42501';
    end if;
  elsif v_task.status = 'review' and p_target_status = 'accepted' then
    if v_role <> 'setter' then
      raise exception 'Принять задачу может только постановщик'
        using errcode = '42501';
    end if;
  elsif v_task.status = 'review' and p_target_status = 'revision' then
    if v_role <> 'setter' then
      raise exception 'Вернуть задачу может только постановщик'
        using errcode = '42501';
    end if;
    if v_comment is null then
      raise exception 'Комментарий при возврате на доработку обязателен'
        using errcode = '23514';
    end if;
  elsif v_task.status = 'revision' and p_target_status = 'in_progress' then
    if v_role <> 'executor' or v_task.assignee_id <> v_actor_id then
      raise exception 'Переход доступен только назначенному исполнителю'
        using errcode = '42501';
    end if;
  else
    raise exception 'Недопустимый переход статуса: % -> %',
      v_task.status, p_target_status using errcode = '23514';
  end if;

  update public.tasks
  set status = p_target_status
  where id = v_task.id
  returning * into v_task;

  insert into public.task_status_history (
    task_id,
    actor_id,
    from_status,
    to_status,
    comment
  )
  values (
    v_task.id,
    v_actor_id,
    v_from_status,
    p_target_status,
    v_comment
  );

  return v_task;
end;
$$;

create function public.archive_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null or not private.is_setter() then
    raise exception 'Удалить задачу может только постановщик'
      using errcode = '42501';
  end if;

  perform 1
  from public.tasks as t
  where t.id = p_task_id and t.deleted_at is null
  for update;

  if not found then
    raise exception 'Задача не найдена' using errcode = 'P0002';
  end if;

  update public.tasks
  set deleted_at = now(), deleted_by = v_actor_id
  where id = p_task_id;
end;
$$;

create function public.archive_object(p_object_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null or not private.is_setter() then
    raise exception 'Удалить объект может только постановщик'
      using errcode = '42501';
  end if;

  perform 1
  from public.objects as o
  where o.id = p_object_id and o.deleted_at is null
  for update;

  if not found then
    raise exception 'Объект не найден' using errcode = 'P0002';
  end if;

  update public.tasks
  set deleted_at = now(), deleted_by = v_actor_id
  where object_id = p_object_id and deleted_at is null;

  update public.objects
  set deleted_at = now(), deleted_by = v_actor_id
  where id = p_object_id;
end;
$$;

revoke all on function public.transition_task(uuid, public.task_status, text)
  from public, anon;
revoke all on function public.archive_task(uuid) from public, anon;
revoke all on function public.archive_object(uuid) from public, anon;

grant execute on function public.transition_task(uuid, public.task_status, text)
  to authenticated;
grant execute on function public.archive_task(uuid) to authenticated;
grant execute on function public.archive_object(uuid) to authenticated;

comment on function public.transition_task(uuid, public.task_status, text) is
  'Проверяет и атомарно выполняет разрешённый переход статуса задачи.';
comment on table public.task_status_history is
  'Неизменяемая через API история создания и переходов статусов задач.';

