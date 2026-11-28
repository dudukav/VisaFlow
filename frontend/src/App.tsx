import { useCallback, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { AuthRejected, signIn } from './api/client'
import type { components } from './api/schema'
import { ApplicationsPage } from './features/applications/ApplicationsPage'
import { NewApplicationPage } from './features/applications/NewApplicationPage'
import { ChecklistPage } from './features/checklist/ChecklistPage'
import { ApplicantLayout } from './layout/ApplicantLayout'

type LoginState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; user: components['schemas']['UserProfile'] }
  | { status: 'error'; message: string }

type SignInPromptProps = {
  initData: string
  login: LoginState
  onLogin: () => void
}

function SignInPrompt({ initData, login, onLogin }: SignInPromptProps) {
  if (!initData) return <p>Откройте VisaFlow из Telegram.</p>

  const pending = login.status === 'loading'
  return (
    <>
      {login.status === 'error' && <p role="alert">{login.message}</p>}
      <button
        className="button"
        disabled={pending}
        onClick={onLogin}
        type="button"
      >
        Войти
      </button>
      <p className="session-status" role="status">
        {pending && 'Входим в VisaFlow…'}
      </p>
    </>
  )
}

function ApplicationsRedirect() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/applications', search }} replace />
}

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
          : 'Не удалось войти. Попробуйте ещё раз.'
      setLogin({ status: 'error', message })
    }
  }

  const onAuthRejected = useCallback(() => {
    setLogin({
      status: 'error',
      message: 'Сессия завершилась. Войдите снова.',
    })
  }, [])

  const signInPrompt = (
    <SignInPrompt initData={initData} login={login} onLogin={handleLogin} />
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={<ApplicantLayout signedIn={login.status === 'success'} />}
        >
          <Route index element={<ApplicationsRedirect />} />
          <Route
            element={
              login.status === 'success' ? (
                <Outlet context={{ onAuthRejected }} />
              ) : (
                <section className="session-card">
                  <h1 tabIndex={-1}>Вход в VisaFlow</h1>
                  {signInPrompt}
                </section>
              )
            }
          >
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="applications/new" element={<NewApplicationPage />} />
            <Route
              path="applications/:applicationId/checklist"
              element={<ChecklistPage />}
            />
          </Route>
          <Route
            path="profile"
            element={
              <section className="session-card">
                <h1 tabIndex={-1}>Профиль</h1>
                {login.status === 'success' ? (
                  <p>{login.user.telegramDisplayName}</p>
                ) : (
                  signInPrompt
                )}
              </section>
            }
          />
          <Route
            path="*"
            element={
              <section className="session-card">
                <h1 tabIndex={-1}>Страница не найдена</h1>
                <Link className="button" to="/applications">
                  К моим заявкам
                </Link>
              </section>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
