import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

export function ApplicantLayout({ signedIn }: { signedIn: boolean }) {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previous = useRef({ pathname, signedIn })

  useEffect(() => {
    const changed =
      previous.current.pathname !== pathname ||
      previous.current.signedIn !== signedIn

    previous.current = { pathname, signedIn }
    if (changed) {
      const main = mainRef.current
      const heading = main?.querySelector<HTMLElement>('h1[tabindex="-1"]')
      const target = heading ?? main
      target?.focus()
    }
  }, [pathname, signedIn])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/applications" className="app-brand">
            VisaFlow
          </Link>
          <nav className="app-nav" aria-label="Основная навигация">
            <NavLink to="/applications">Мои заявки</NavLink>
            <NavLink to="/profile">Профиль</NavLink>
          </nav>
        </div>
      </header>
      <main className="app-main" id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
