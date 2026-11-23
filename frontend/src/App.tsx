import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AuthRejected, signIn } from './api/client'
import type { components } from './api/schema'

type LoginState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; user: components['schemas']['UserProfile'] }
  | { status: 'error'; message: string }

export default function App({ initData }: { initData: string }) {
  const [login, setLogin] = useState<LoginState>({ status: 'idle' })

  useEffect(() => {
    window.Telegram?.WebApp?.ready()
  }, [])

  async function handleLogin() {
    if (!initData || login.status === 'loading') return

    setLogin({ status: 'loading' })
    try {
      const user = await signIn(initData)
      setLogin({ status: 'success', user })
    } catch (error) {
      const message =
        error instanceof AuthRejected
          ? 'Сессия отклонена. Откройте приложение заново из Telegram.'
          : 'Не удалось загрузить профиль. Попробуйте ещё раз.'
      setLogin({ status: 'error', message })
    }
  }

  return (
    <BrowserRouter>
      <main>
        <h1>VisaFlow</h1>
        <nav aria-label="Основная навигация">
          <Link to="/">Главная</Link>
          {' · '}
          <Link to="/profile">Профиль</Link>
        </nav>

        <Routes>
          <Route path="/" element={<p>Подготовка визовой заявки</p>} />
          <Route
            path="/profile"
            element={
              <section>
                <h2>Профиль</h2>
                {!initData && <p>Откройте VisaFlow из Telegram.</p>}
                {initData && login.status !== 'success' && (
                  <button
                    disabled={login.status === 'loading'}
                    onClick={handleLogin}
                  >
                    Войти
                  </button>
                )}
                <div role="status">
                  {login.status === 'loading' && <p>Загружаем профиль…</p>}
                  {login.status === 'success' && (
                    <p>{login.user.telegramDisplayName}</p>
                  )}
                </div>
                {login.status === 'error' && (
                  <p role="alert">{login.message}</p>
                )}
              </section>
            }
          />
          <Route path="*" element={<p>Страница не найдена.</p>} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
