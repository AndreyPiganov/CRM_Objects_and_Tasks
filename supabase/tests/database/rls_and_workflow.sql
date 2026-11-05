begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(28);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'manager-test@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Тестовый постановщик"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'worker-1-test@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Первый исполнитель"}'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'worker-2-test@example.com',
    extensions.crypt('password', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Второй исполнитель"}'
  );

update public.profiles
set role = 'setter'
where id = 'a0000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.objects (name, address) values ('Создан через API', 'Тестовый адрес')$$,
  'постановщик может создать объект разрешёнными полями'
);

reset role;

insert into public.objects (id, name, address, created_by)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    'Объект первого исполнителя',
    'Адрес 1',
    'a0000000-0000-0000-0000-000000000001'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Объект второго исполнителя',
    'Адрес 2',
    'a0000000-0000-0000-0000-000000000001'
  );

insert into public.tasks (
  id,
  title,
  description,
  object_id,
  assignee_id,
  author_id
)
values
  (
    'c0000000-0000-0000-0000-000000000001',
    'Задача первого исполнителя',
    '',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Задача второго исполнителя',
    '',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001'
  );

select is(
  (select count(*) from public.task_status_history),
  2::bigint,
  'создание задач автоматически записано в историю'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', true);

select is((select count(*) from public.tasks), 1::bigint, 'исполнитель видит только свою задачу');
select is((select count(*) from public.objects), 1::bigint, 'исполнитель видит только связанный объект');
select is((select count(*) from public.profiles), 2::bigint, 'исполнитель видит только нужные профили');

select is(
  (
    with changed as (
      update public.tasks
      set title = 'Чужое изменение'
      where id = 'c0000000-0000-0000-0000-000000000001'
      returning 1
    )
    select count(*) from changed
  ),
  0::bigint,
  'исполнитель не может редактировать поля задачи напрямую'
);

select throws_ok(
  $$update public.tasks set status = 'accepted' where id = 'c0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'прямое изменение статуса запрещено привилегиями столбца'
);

select lives_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000001', 'in_progress', null)$$,
  'назначенный исполнитель берёт задачу в работу'
);

select throws_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000002', 'in_progress', null)$$,
  '42501',
  'Переход доступен только назначенному исполнителю',
  'исполнитель не может перевести чужую задачу'
);

select lives_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000001', 'review', null)$$,
  'назначенный исполнитель отправляет задачу на проверку'
);

select is(
  (select count(*) from public.task_status_history where task_id = 'c0000000-0000-0000-0000-000000000001'),
  3::bigint,
  'исполнитель видит полную историю доступной задачи'
);

select throws_ok(
  $$insert into public.task_status_history (task_id, actor_id, to_status) values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'accepted')$$,
  '42501',
  null,
  'исполнитель не может подделать историю'
);

select throws_ok(
  $$delete from public.task_status_history where task_id = 'c0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'исполнитель не может удалить историю'
);

select throws_ok(
  $$update public.task_status_history set comment = 'Подмена' where task_id = 'c0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'исполнитель не может изменить историю'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', true);

select lives_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000002', 'in_progress', null)$$,
  'второй исполнитель берёт свою задачу в работу'
);
select lives_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000002', 'review', null)$$,
  'второй исполнитель отправляет свою задачу на проверку'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);

select is((select count(*) from public.tasks), 2::bigint, 'постановщик видит все активные задачи');

select throws_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000002', 'revision', '   ')$$,
  '23514',
  'Комментарий при возврате на доработку обязателен',
  'пустой комментарий доработки отклоняется базой'
);

select lives_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000002', 'revision', 'Исправьте результат')$$,
  'постановщик возвращает задачу с комментарием'
);

select lives_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000001', 'accepted', null)$$,
  'постановщик принимает задачу'
);

select throws_ok(
  $$select public.transition_task('c0000000-0000-0000-0000-000000000001', 'revision', 'Повторно')$$,
  '23514',
  'Недопустимый переход статуса: accepted -> revision',
  'переход из конечного статуса запрещён'
);

select throws_ok(
  $$delete from public.task_status_history where task_id = 'c0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'постановщик также не может удалить историю через API'
);

select lives_ok(
  $$select public.archive_task('c0000000-0000-0000-0000-000000000001')$$,
  'постановщик мягко удаляет задачу'
);

select is((select count(*) from public.tasks), 1::bigint, 'архивная задача скрыта политикой RLS');

select lives_ok(
  $$select public.archive_object('b0000000-0000-0000-0000-000000000002')$$,
  'удаление объекта каскадно архивирует его задачи'
);

reset role;

select ok(
  (
    select deleted_at is not null
    from public.tasks
    where id = 'c0000000-0000-0000-0000-000000000001'
  ),
  'мягко удалённая задача сохранена в базе'
);

select is(
  (select count(*) from public.task_status_history where task_id = 'c0000000-0000-0000-0000-000000000001'),
  4::bigint,
  'история мягко удалённой задачи полностью сохранена'
);

select ok(
  (
    select deleted_at is not null
    from public.tasks
    where id = 'c0000000-0000-0000-0000-000000000002'
  ),
  'архивирование объекта мягко удалило связанную задачу'
);

select * from finish();
rollback;

