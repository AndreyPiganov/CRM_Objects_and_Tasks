const authUrl = process.env.AUTH_INTERNAL_URL
const serviceRoleKey = process.env.SERVICE_ROLE_KEY
const password = process.env.LOCAL_TEST_PASSWORD

if (!authUrl || !serviceRoleKey || !password) {
  throw new Error('Не заданы параметры локального Auth seed')
}

const users = [
  { email: 'manager@example.com', displayName: 'Анна Руководитель' },
  { email: 'worker1@example.com', displayName: 'Иван Исполнитель' },
  { email: 'worker2@example.com', displayName: 'Мария Исполнитель' },
]

for (const user of users) {
  const response = await fetch(`${authUrl}/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: user.displayName },
    }),
  })

  if (response.ok) {
    console.log(`Создан локальный пользователь: ${user.email}`)
    continue
  }

  const body = await response.text()
  if (response.status === 422 && /already|registered|exists/i.test(body)) {
    console.log(`Локальный пользователь уже существует: ${user.email}`)
    continue
  }

  throw new Error(`Не удалось создать ${user.email}: HTTP ${response.status} ${body}`)
}
