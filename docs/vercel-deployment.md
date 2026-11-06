# Деплой CRM на Vercel

Vercel размещает только статический React/Vite frontend. База данных, Auth и REST API должны работать отдельно: для публичного стенда проще использовать Supabase Cloud, а `docker-compose.yml` оставить для локальной разработки или самостоятельного VPS.

## 1. Подготовить облачный Supabase

1. Создайте проект в [Supabase Dashboard](https://supabase.com/dashboard).
2. В Authentication отключите самостоятельную Email-регистрацию. Пользователей CRM создаёт администратор.
3. Примените миграции из репозитория:

   ```bash
   npx supabase@latest login
   npx supabase@latest link --project-ref YOUR_PROJECT_REF
   npx supabase@latest db push
   ```

4. В Authentication → Users создайте пользователей с подтверждёнными email:

   - `manager@example.com`;
   - `worker1@example.com`;
   - `worker2@example.com`.

5. В SQL Editor выполните `supabase/seed.example.sql`. Скрипт назначит роли и добавит демонстрационные объекты и задачи.
6. В настройках API скопируйте:

   - Project URL вида `https://PROJECT_REF.supabase.co`;
   - публичный publishable key либо legacy `anon` key.

`service_role`, secret key, JWT secret и пароль PostgreSQL для frontend не нужны. Их нельзя добавлять в Vercel-переменные с префиксом `VITE_`, потому что Vite встраивает такие значения в публичный JavaScript.

## 2. Отправить репозиторий в GitHub

В проекте уже подготовлены `vercel.json`, production-сборка и SPA-маршрутизация. Отправьте актуальную ветку `main` в GitHub:

```bash
git push origin main
```

Перед push убедитесь, что `.env`, облачные пароли и закрытые ключи не попали в Git.

## 3. Создать проект Vercel

1. Откройте [Vercel Dashboard](https://vercel.com/new) и выберите Add New → Project.
2. Импортируйте GitHub-репозиторий CRM.
3. Проверьте настройки сборки:

   - Framework Preset: `Vite`;
   - Root Directory: корень репозитория;
   - Build Command: `npm run build`;
   - Output Directory: `dist`;
   - Install Command: `npm ci`.

4. В Environment Variables добавьте для Production и Preview:

   ```dotenv
   VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
   ```

5. Нажмите Deploy.

После изменения любой переменной окружения сделайте Redeploy: Vite читает эти значения во время сборки, поэтому уже созданный deployment сам не обновится.

## 4. Настроить URL авторизации

После первого deployment скопируйте production-домен Vercel. В Supabase откройте Authentication → URL Configuration:

- Site URL: `https://YOUR_PROJECT.vercel.app` либо собственный домен;
- Redirect URLs: production-домен и, если нужны preview-сборки, шаблон Vercel вида `https://*-TEAM_SLUG.vercel.app/**`.

В текущей версии CRM используется вход по email/паролю без OAuth, но корректные URL понадобятся для будущего восстановления пароля и email-ссылок.

## 5. Проверить опубликованный стенд

1. Откройте корень сайта и прямые адреса `/objects` и `/tasks/TEST_ID`: Vercel должен возвращать SPA, а не 404.
2. Войдите постановщиком и создайте объект и задачу.
3. Войдите каждым исполнителем и убедитесь, что видны только назначенные задачи.
4. Проверьте разрешённые переходы статусов, обязательный комментарий доработки и историю.
5. Убедитесь через Network в DevTools, что запросы идут к облачному `PROJECT_REF.supabase.co`, а не к `localhost`.

## Вариант через Vercel CLI

Dashboard можно заменить CLI:

```bash
npx vercel@latest login
npx vercel@latest link
npx vercel@latest env add VITE_SUPABASE_URL production
npx vercel@latest env add VITE_SUPABASE_ANON_KEY production
npx vercel@latest --prod
```

Для Preview добавьте те же переменные с окружением `preview`. Значения CLI запросит интерактивно; не передавайте ключи прямо в командной строке и не сохраняйте их в истории shell.

## Если нужен production в Docker

Технически CRM можно разместить полностью самостоятельно: Compose-стек на VPS, реальные секреты, HTTPS/reverse proxy, резервные копии и мониторинг. Это отдельный вариант эксплуатации и не запускается внутри Vercel. Для тестового задания безопаснее и быстрее связка Vercel + Supabase Cloud.

Официальные материалы: [Vite на Vercel](https://vercel.com/docs/frameworks/frontend/vite), [переменные Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables), [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
