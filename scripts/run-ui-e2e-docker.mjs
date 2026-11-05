import { execFileSync, spawn } from 'node:child_process'

const image = 'mcr.microsoft.com/playwright:v1.64.1-noble'
const password = process.env.LOCAL_TEST_PASSWORD || 'LocalTest123!'

function supabaseStatus() {
  return JSON.parse(
    execFileSync('npx', ['--yes', 'supabase@latest', 'status', '-o', 'json'], {
      encoding: 'utf8',
    }),
  )
}
async function waitForServer(url) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Vite ещё запускается.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Vite не запустился за 60 секунд: ${url}`)
}

try {
  execFileSync('docker', ['image', 'inspect', image], { stdio: 'ignore' })
} catch {
  console.log(`Загрузка ${image}…`)
  execFileSync('docker', ['pull', image], { stdio: 'inherit' })
}

const status = supabaseStatus()
const vite = spawn(
  './node_modules/.bin/vite',
  ['--host', '0.0.0.0', '--port', '4173'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: 'http://host.docker.internal:54321',
      VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
    },
  },
)

try {
  await waitForServer('http://127.0.0.1:4173/login')
  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '--network',
      'bridge',
      '-v',
      `${process.cwd()}:/work`,
      '-w',
      '/work',
      '-e',
      'PLAYWRIGHT_BASE_URL=http://host.docker.internal:4173',
      '-e',
      `LOCAL_TEST_PASSWORD=${password}`,
      image,
      'npx',
      'playwright',
      'test',
    ],
    { stdio: 'inherit' },
  )
} finally {
  vite.kill('SIGINT')
}
