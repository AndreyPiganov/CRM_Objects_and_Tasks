import { execFileSync } from 'node:child_process'
import { defineConfig, devices } from '@playwright/test'

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL
const status = externalBaseUrl
  ? null
  : (JSON.parse(
      execFileSync('npx', ['--yes', 'supabase@latest', 'status', '-o', 'json'], {
        encoding: 'utf8',
      }),
    ) as { API_URL: string; ANON_KEY: string })

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: externalBaseUrl || 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173/login',
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          VITE_SUPABASE_URL: status!.API_URL,
          VITE_SUPABASE_ANON_KEY: status!.ANON_KEY,
        },
      },
})
