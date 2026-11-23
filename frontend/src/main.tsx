import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string; ready: () => void } }
  }
}

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root')
const root = createRoot(container)

async function bootstrap() {
  let initData = window.Telegram?.WebApp?.initData ?? ''

  if (import.meta.env.DEV && import.meta.env.VITE_API_MOCK === '1') {
    const { worker, mockInitData } = await import('./mocks/browser')
    await worker.start()

    const reject =
      new URLSearchParams(window.location.search).get('mockAuth') === 'reject'
    initData = reject ? 'invalid-local-fixture' : mockInitData
  }

  root.render(
    <StrictMode>
      <App initData={initData} />
    </StrictMode>,
  )
}

void bootstrap().catch(() => {
  root.render(
    <p role="alert">Не удалось запустить VisaFlow. Обновите страницу.</p>,
  )
})
