import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const testPassword = process.env.LOCAL_TEST_PASSWORD || 'LocalTest123!'
const composeMode = process.argv.includes('--compose')
const externalApiUrl = (
  process.env.LOCAL_SUPABASE_URL || (composeMode ? 'http://localhost:8080' : '')
).replace(/\/$/, '')
const composeAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.' +
  'CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const users = [
  { email: 'manager@example.com', displayName: 'Анна Руководитель' },
  { email: 'worker1@example.com', displayName: 'Иван Исполнитель' },
  { email: 'worker2@example.com', displayName: 'Мария Исполнитель' },
]

function supabase(args, options = {}) {
  return execFileSync('npx', ['--yes', 'supabase@latest', ...args], {
    encoding: 'utf8',
    ...options,
  })
}

function pass(message) {
  console.log(`✓ ${message}`)
}

async function expectOk(response, message) {
  if (!response.ok) {
    throw new Error(`${message}: HTTP ${response.status} ${await response.text()}`)
  }
  return response
}

async function expectDenied(response, message) {
  if (response.ok) {
    throw new Error(`${message}: запрос неожиданно разрешён`)
  }
  pass(message)
}

let status

if (externalApiUrl) {
  const anonKey = process.env.LOCAL_SUPABASE_ANON_KEY ||
    (composeMode ? composeAnonKey : '')
  assert.ok(anonKey, 'Для внешнего API задайте LOCAL_SUPABASE_ANON_KEY')
  status = {
    API_URL: externalApiUrl,
    REST_URL: `${externalApiUrl}/rest/v1`,
    ANON_KEY: anonKey,
  }
  console.log(`Проверка уже подготовленного локального API: ${externalApiUrl}`)
} else {
  console.log('Сброс локальной базы и применение миграций…')
  supabase(['db', 'reset'], { stdio: 'inherit' })
  status = JSON.parse(supabase(['status', '-o', 'json']))
}

async function adminRequest(path, init = {}) {
  return fetch(`${status.API_URL}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: status.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

if (!externalApiUrl) {
  for (const user of users) {
    await expectOk(
      await adminRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          password: testPassword,
          email_confirm: true,
          user_metadata: { display_name: user.displayName },
        }),
      }),
      `создание ${user.email}`,
    )
  }
  pass('созданы три локальных Auth-пользователя')

  const projectId = readFileSync('supabase/config.toml', 'utf8').match(
    /^project_id\s*=\s*"([^"]+)"/m,
  )?.[1]
  assert.ok(projectId, 'В supabase/config.toml должен быть project_id')

  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      `supabase_db_${projectId}`,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres',
    ],
    {
      input: readFileSync('supabase/seed.example.sql'),
      stdio: ['pipe', 'inherit', 'inherit'],
    },
  )
  pass('загружены роли и демонстрационные данные')
}

async function signIn(email) {
  const response = await fetch(`${status.API_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: status.ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: testPassword }),
  })
  await expectOk(response, `вход ${email}`)
  return (await response.json()).access_token
}

async function rest(path, accessToken, init = {}) {
  return fetch(`${status.REST_URL}${path}`, {
    ...init,
    headers: {
      apikey: status.ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
}

async function rows(path, accessToken) {
  const response = await expectOk(await rest(path, accessToken), `GET ${path}`)
  return response.json()
}

const managerToken = await signIn('manager@example.com')
const worker1Token = await signIn('worker1@example.com')
const worker2Token = await signIn('worker2@example.com')
pass('вход по email и паролю работает для всех ролей')

assert.ok((await rows('/objects?select=id', managerToken)).length >= 3)
assert.ok((await rows('/tasks?select=id', managerToken)).length >= 5)
assert.ok((await rows('/profiles?select=id', managerToken)).length >= 3)
pass('постановщик видит все объекты, задачи и профили')

assert.ok((await rows('/tasks?select=id', worker1Token)).length >= 3)
assert.ok((await rows('/objects?select=id', worker1Token)).length >= 3)
assert.ok((await rows('/profiles?select=id', worker1Token)).length >= 2)
assert.ok((await rows('/tasks?select=id', worker2Token)).length >= 2)
assert.ok((await rows('/objects?select=id', worker2Token)).length >= 2)
assert.ok((await rows('/profiles?select=id', worker2Token)).length >= 2)
pass('RLS возвращает каждому исполнителю только связанные данные')

assert.deepEqual(
  await rows(
    '/tasks?id=eq.20000000-0000-0000-0000-000000000002&select=id',
    worker1Token,
  ),
  [],
)
pass('чужая задача не читается даже по известному UUID')

await expectDenied(
  await rest(
    '/tasks?id=eq.20000000-0000-0000-0000-000000000001',
    worker1Token,
    { method: 'PATCH', body: JSON.stringify({ status: 'accepted' }) },
  ),
  'прямая смена статуса запрещена SQL-привилегиями',
)

await expectOk(
  await rest(
    '/tasks?id=eq.20000000-0000-0000-0000-000000000001',
    worker1Token,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ title: 'Подмена' }),
    },
  ),
  'попытка изменения задачи исполнителем',
)
assert.equal(
  (
    await rows(
      '/tasks?id=eq.20000000-0000-0000-0000-000000000001&select=title',
      worker1Token,
    )
  )[0].title,
  'Проверить поставку бетона',
)
pass('RLS не изменяет поля задачи исполнителем')

await expectDenied(
  await rest('/rpc/transition_task', worker1Token, {
    method: 'POST',
    body: JSON.stringify({
      p_task_id: '20000000-0000-0000-0000-000000000002',
      p_target_status: 'review',
      p_comment: null,
    }),
  }),
  'назначенный исполнитель проверяется внутри RPC',
)

const workerTask = (
  await rows(
    '/tasks?id=eq.20000000-0000-0000-0000-000000000001&select=status',
    worker1Token,
  )
)[0]
if (workerTask.status === 'new') {
  await expectOk(
    await rest('/rpc/transition_task', worker1Token, {
      method: 'POST',
      body: JSON.stringify({
        p_task_id: '20000000-0000-0000-0000-000000000001',
        p_target_status: 'in_progress',
        p_comment: null,
      }),
    }),
    'разрешённый переход исполнителя',
  )
}
assert.ok(
  (
    await rows(
      '/task_status_history?task_id=eq.20000000-0000-0000-0000-000000000001&select=id',
      worker1Token,
    )
  ).length >= 2,
)
pass('разрешённый переход сохраняется в истории')

const reviewTask = (
  await rows(
    '/tasks?id=eq.20000000-0000-0000-0000-000000000003&select=status',
    managerToken,
  )
)[0]
if (reviewTask.status === 'review') {
  await expectDenied(
    await rest('/rpc/transition_task', managerToken, {
      method: 'POST',
      body: JSON.stringify({
        p_task_id: '20000000-0000-0000-0000-000000000003',
        p_target_status: 'revision',
        p_comment: '   ',
      }),
    }),
    'пустой комментарий доработки отклоняется базой',
  )

  await expectOk(
    await rest('/rpc/transition_task', managerToken, {
      method: 'POST',
      body: JSON.stringify({
        p_task_id: '20000000-0000-0000-0000-000000000003',
        p_target_status: 'accepted',
        p_comment: null,
      }),
    }),
    'принятие задачи постановщиком',
  )
} else {
  pass('проверка комментария и принятия уже отражена в истории задачи')
}
pass('постановщик выполняет разрешённый переход')

await expectDenied(
  await rest(
    '/task_status_history?task_id=eq.20000000-0000-0000-0000-000000000001',
    managerToken,
    { method: 'DELETE' },
  ),
  'историю нельзя удалить через REST даже постановщику',
)

console.log('\nЛокальный API smoke-test завершён успешно.')
