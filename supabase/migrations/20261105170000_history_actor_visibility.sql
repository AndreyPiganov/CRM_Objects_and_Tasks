drop policy profiles_select_visible on public.profiles;

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
  or exists (
    select 1
    from public.task_status_history as h
    join public.tasks as t on t.id = h.task_id
    where h.actor_id = profiles.id
      and t.deleted_at is null
      and t.assignee_id = (select auth.uid())
  )
);

