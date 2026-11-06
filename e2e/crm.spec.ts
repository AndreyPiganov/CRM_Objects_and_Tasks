import { expect, test, type Page } from '@playwright/test'

const password = process.env.LOCAL_TEST_PASSWORD || 'LocalTest123!'

async function login(page: Page, email: string) {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('heading', { name: 'Объекты' })).toBeVisible()
}

test('постановщик входит, видит все объекты и создаёт новый', async ({ page }) => {
  await login(page, 'manager@example.com')
  const objectName = `Тестовый объект UI ${Date.now()}`

  await expect(page.getByRole('heading', { name: 'ЖК Северный' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Бизнес-центр Речной' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Школа № 24' })).toBeVisible()

  await page.getByRole('button', { name: 'Добавить' }).click()
  const dialog = page.getByRole('dialog', { name: 'Новый объект' })
  await dialog.getByLabel('Название').fill(objectName)
  await dialog.getByLabel('Адрес').fill('Москва, Тестовая улица, 1')
  await dialog.getByRole('button', { name: 'Сохранить' }).click()

  await expect(page.getByRole('heading', { name: objectName })).toBeVisible()
})
test('исполнитель видит только свои задачи и меняет разрешённый статус', async ({ page }) => {
  await login(page, 'worker1@example.com')
  await page.getByRole('button', { name: 'Мои задачи' }).click()

  await expect(page.getByRole('heading', { name: 'Проверить поставку бетона' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Принять электромонтаж' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Согласовать цвет фасада' })).toBeVisible()
  await expect(page.getByText('Подготовить фотоотчёт', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Уточнить размеры проёмов', { exact: true })).toHaveCount(0)

  const card = page
    .getByRole('heading', { name: 'Проверить поставку бетона' })
    .locator('xpath=ancestor::*[contains(@class, "MuiCard-root")]')
  await card.getByRole('button', { name: 'Открыть' }).click()

  const startButton = page.getByRole('button', { name: 'Взять в работу' })
  if (await startButton.isVisible()) {
    await startButton.click()
    await expect(page.getByText('В работе', { exact: true }).first()).toBeVisible()
  }

  const reviewButton = page.getByRole('button', { name: 'Отправить на проверку' })
  if (await reviewButton.isVisible()) {
    await reviewButton.click()
  }
  await expect(page.getByText('На проверке', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('В работе → На проверке', { exact: true })).toBeVisible()

  await page.goto('/tasks/20000000-0000-0000-0000-000000000002')
  await expect(page.getByText('Задача не найдена или у вас нет доступа.')).toBeVisible()
  await expect(page.getByText('Подготовить фотоотчёт', { exact: true })).toHaveCount(0)
})
