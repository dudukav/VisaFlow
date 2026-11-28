import { Link, useLocation } from 'react-router-dom'
import { listApplications } from '../../api/client'
import type { components } from '../../api/schema'
import { useApplicationResource } from './useApplicationResource'
import './applications.css'

type Schema = components['schemas']

const statusLabels: Record<Schema['ApplicationStatus'], string> = {
  draft: 'Черновик',
  awaiting_activation: 'Ожидает активации',
  active: 'Активна',
  upgrade_required: 'Требуется обновление тарифа',
  closed: 'Закрыта',
}

const countryNames = new Intl.DisplayNames('ru', { type: 'region' })
const dateFormat = new Intl.DateTimeFormat('ru', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

export function ApplicationsPage() {
  const { resource, retry } = useApplicationResource(listApplications)
  const { state }: { state: unknown } = useLocation()
  const created =
    typeof state === 'object' &&
    state !== null &&
    'created' in state &&
    state.created === true

  return (
    <section className="applications-page" aria-labelledby="applications-title">
      <header className="applications-header">
        <h1 id="applications-title" tabIndex={-1}>
          Мои заявки
        </h1>
        <Link className="button" to="/applications/new">
          Новая заявка
        </Link>
      </header>

      {created &&
        (resource.status !== 'ready' || resource.data.items.length > 0) && (
          <p className="applications-message" role="status">
            Черновик заявки создан.
          </p>
        )}

      {resource.status === 'loading' && (
        <p className="applications-card applications-status" role="status">
          Загружаем заявки…
        </p>
      )}

      {resource.status === 'error' && (
        <div className="applications-card applications-status">
          <p role="alert">Не удалось загрузить заявки.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={retry}
          >
            Повторить загрузку
          </button>
        </div>
      )}

      {resource.status === 'ready' &&
        (resource.data.items.length === 0 ? (
          <p className="applications-card applications-status">
            У вас пока нет заявок.
          </p>
        ) : (
          <ul className="application-list" aria-label="Список заявок">
            {resource.data.items.map((application) => (
              <li
                key={application.id}
                className="applications-card application-list-item"
              >
                <div>
                  <h2>{countryNames.of(application.country)}</h2>
                  <p className="field-hint">
                    <time dateTime={application.tripStartsOn}>
                      {dateFormat.format(new Date(application.tripStartsOn))}
                    </time>
                    {' — '}
                    <time dateTime={application.tripEndsOn}>
                      {dateFormat.format(new Date(application.tripEndsOn))}
                    </time>
                  </p>
                </div>
                <span className="application-status-label">
                  {statusLabels[application.status]}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
