-- Запускайте этот файл только после создания трёх пользователей в Supabase Auth:
-- manager@example.com, worker1@example.com, worker2@example.com.
-- Пароли задаются в панели Supabase и в репозиторий не добавляются.

do $$
declare
  v_manager uuid;
  v_worker_1 uuid;
  v_worker_2 uuid;
begin
  select id into v_manager from auth.users where email = 'manager@example.com';
  select id into v_worker_1 from auth.users where email = 'worker1@example.com';
  select id into v_worker_2 from auth.users where email = 'worker2@example.com';

  if v_manager is null or v_worker_1 is null or v_worker_2 is null then
    raise exception 'Сначала создайте manager@example.com, worker1@example.com и worker2@example.com';
  end if;

  update public.profiles
  set display_name = case id
      when v_manager then 'Анна Руководитель'
      when v_worker_1 then 'Иван Исполнитель'
      when v_worker_2 then 'Мария Исполнитель'
    end,
    role = case when id = v_manager then 'setter'::public.user_role
      else 'executor'::public.user_role end
  where id in (v_manager, v_worker_1, v_worker_2);

  insert into public.objects (id, name, address, created_by, created_at)
  values
    ('10000000-0000-0000-0000-000000000001', 'ЖК Северный', 'Москва, Северный бульвар, 10', v_manager, now() - interval '14 days'),
    ('10000000-0000-0000-0000-000000000002', 'Бизнес-центр Речной', 'Москва, Речная улица, 7', v_manager, now() - interval '10 days'),
    ('10000000-0000-0000-0000-000000000003', 'Школа № 24', 'Москва, Школьный проезд, 24', v_manager, now() - interval '7 days')
  on conflict (id) do nothing;

  insert into public.tasks (
    id, title, description, object_id, assignee_id, author_id, created_at
  )
  values
    ('20000000-0000-0000-0000-000000000001', 'Проверить поставку бетона', 'Сверить объём поставки с накладными.', '10000000-0000-0000-0000-000000000001', v_worker_1, v_manager, now() - interval '6 days'),
    ('20000000-0000-0000-0000-000000000002', 'Подготовить фотоотчёт', 'Снять текущий этап работ на втором этаже.', '10000000-0000-0000-0000-000000000001', v_worker_2, v_manager, now() - interval '5 days'),
    ('20000000-0000-0000-0000-000000000003', 'Принять электромонтаж', 'Проверить щитовую и маркировку кабелей.', '10000000-0000-0000-0000-000000000002', v_worker_1, v_manager, now() - interval '4 days'),
    ('20000000-0000-0000-0000-000000000004', 'Уточнить размеры проёмов', 'Повторно измерить проёмы и приложить значения.', '10000000-0000-0000-0000-000000000002', v_worker_2, v_manager, now() - interval '3 days'),
    ('20000000-0000-0000-0000-000000000005', 'Согласовать цвет фасада', 'Получить подтверждение выбранного образца.', '10000000-0000-0000-0000-000000000003', v_worker_1, v_manager, now() - interval '2 days')
  on conflict (id) do nothing;

  update public.tasks set status = 'in_progress'
  where id = '20000000-0000-0000-0000-000000000002';
  update public.tasks set status = 'review'
  where id = '20000000-0000-0000-0000-000000000003';
  update public.tasks set status = 'revision'
  where id = '20000000-0000-0000-0000-000000000004';
  update public.tasks set status = 'accepted'
  where id = '20000000-0000-0000-0000-000000000005';

  insert into public.task_status_history (
    id, task_id, actor_id, from_status, to_status, comment, changed_at
  )
  values
    ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', v_worker_2, 'new', 'in_progress', null, now() - interval '4 days'),
    ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', v_worker_1, 'new', 'in_progress', null, now() - interval '3 days 12 hours'),
    ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', v_worker_1, 'in_progress', 'review', null, now() - interval '2 days'),
    ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', v_worker_2, 'new', 'in_progress', null, now() - interval '2 days 12 hours'),
    ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000004', v_worker_2, 'in_progress', 'review', null, now() - interval '1 day 12 hours'),
    ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000004', v_manager, 'review', 'revision', 'Добавьте размеры оконных проёмов.', now() - interval '1 day'),
    ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005', v_worker_1, 'new', 'in_progress', null, now() - interval '1 day 18 hours'),
    ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000005', v_worker_1, 'in_progress', 'review', null, now() - interval '1 day'),
    ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000005', v_manager, 'review', 'accepted', null, now() - interval '12 hours')
  on conflict (id) do nothing;
end;
$$;

