import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AuthRejected,
  getChecklist,
  updateChecklistItem,
} from '../../api/client'
import type { components } from '../../api/schema'
import { useApplicationResource } from '../applications/useApplicationResource'
import {
  groupChecklistItems,
  optimisticProgress,
  statusLabels,
} from './checklistState'
import type { ChecklistItem, ChecklistStatus } from './checklistState'
import './checklist.css'

type Schema = components['schemas']
type Checklist = Schema['Checklist']
type Change = { itemId: ChecklistItem['id']; status: ChecklistStatus }
type SaveState =
  | { status: 'saving'; change: Change; retry: boolean }
  | { status: 'error'; change: Change }

const statuses = Object.keys(statusLabels) as ChecklistStatus[]
const pendingUpdates = new Map<string, ReturnType<typeof updateChecklistItem>>()

export function ChecklistPage() {
  const { applicationId } = useParams<{ applicationId: string }>()

  return applicationId ? (
    <ChecklistResource key={applicationId} applicationId={applicationId} />
  ) : (
    <section className="checklist-page" aria-labelledby="checklist-title">
      <ChecklistHeader />
      <p className="checklist-panel" role="alert">
        Заявка не найдена.
      </p>
    </section>
  )
}

function ChecklistHeader({
  headingRef,
}: {
  headingRef?: Ref<HTMLHeadingElement>
}) {
  return (
    <header className="checklist-header">
      <h1 id="checklist-title" ref={headingRef} tabIndex={-1}>
        Чеклист
      </h1>
      <Link className="button button-secondary" to="/applications">
        К списку заявок
      </Link>
    </header>
  )
}

function ChecklistResource({ applicationId }: { applicationId: string }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      // Reopening a checklist while it saves must read the state after the PATCH.
      const pendingUpdate = pendingUpdates.get(applicationId)
      if (pendingUpdate) await pendingUpdate.catch(() => undefined)
      if (signal.aborted)
        throw new DOMException('Checklist load aborted', 'AbortError')

      return getChecklist(applicationId, signal)
    },
    [applicationId],
  )
  const { resource, retry, onAuthRejected } = useApplicationResource(load)
  const headingRef = useRef<HTMLHeadingElement>(null)

  return (
    <section className="checklist-page" aria-labelledby="checklist-title">
      <ChecklistHeader headingRef={headingRef} />
      {resource.status === 'loading' && (
        <p className="checklist-panel" role="status">
          Загружаем чеклист…
        </p>
      )}
      {resource.status === 'error' && (
        <div className="checklist-panel checklist-problem">
          <p role="alert">Не удалось загрузить чеклист.</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              headingRef.current?.focus()
              retry()
            }}
          >
            Повторить загрузку
          </button>
        </div>
      )}
      {resource.status === 'ready' && (
        <ChecklistContent
          initialChecklist={resource.data}
          onAuthRejected={onAuthRejected}
        />
      )}
    </section>
  )
}

function ChecklistContent({
  initialChecklist,
  onAuthRejected,
}: {
  initialChecklist: Checklist
  onAuthRejected: () => void
}) {
  const [confirmed, setConfirmed] = useState(initialChecklist)
  const [save, setSave] = useState<SaveState | null>(null)
  const saving = useRef(false)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  async function saveStatus(change: Change, retryButton?: HTMLButtonElement) {
    if (saving.current || save?.status === 'saving') return

    const item = confirmed.items.find(({ id }) => id === change.itemId)
    if (!item || item.kind !== 'action' || item.status === change.status) return

    saving.current = true
    setSave({ status: 'saving', change, retry: !!retryButton })

    const request = updateChecklistItem(
      confirmed.applicationId,
      change.itemId,
      change.status,
    )
    pendingUpdates.set(confirmed.applicationId, request)

    try {
      const result = await request
      if (!mounted.current) return

      setConfirmed((current) => ({
        ...current,
        progress: result.progress,
        items: current.items.map((item) =>
          item.id === change.itemId ? result.item : item,
        ),
      }))
      if (retryButton && document.activeElement === retryButton) {
        document.getElementById(statusControlId(change.itemId))?.focus()
      }
      setSave(null)
    } catch (error) {
      if (!mounted.current) return

      if (error instanceof AuthRejected) {
        onAuthRejected()
        return
      }
      setSave({ status: 'error', change })
    } finally {
      pendingUpdates.delete(confirmed.applicationId)
      saving.current = false
    }
  }

  const pending = save?.status === 'saving' ? save.change : null
  const previous = pending
    ? confirmed.items.find((item) => item.id === pending.itemId)
    : undefined
  const progress =
    pending && previous
      ? optimisticProgress(confirmed.progress, previous.status, pending.status)
      : confirmed.progress
  const percent = Math.round(progress.percent) + '%'
  const count = 'Выполнено ' + progress.completed + ' из ' + progress.total

  return (
    <>
      <div className="checklist-panel checklist-progress">
        <div className="checklist-progress-summary">
          <label htmlFor="checklist-progress">Прогресс чеклиста</label>
          <strong>{percent}</strong>
        </div>
        <progress
          id="checklist-progress"
          max={100}
          value={progress.percent}
          aria-valuetext={count + ', ' + percent}
        />
        <p className="field-hint" aria-live="polite">
          {count}
        </p>
      </div>
      {confirmed.items.length === 0 && (
        <p className="checklist-panel" role="status">
          В чеклисте пока нет пунктов.
        </p>
      )}
      {groupChecklistItems(confirmed.items).map((group) => (
        <section
          aria-labelledby={'checklist-group-' + group.id}
          className="checklist-panel checklist-group"
          key={group.id}
        >
          <h2 id={'checklist-group-' + group.id}>{group.label}</h2>
          <ul className="checklist-items">
            {group.items.map((item) => {
              const itemSave = save?.change.itemId === item.id ? save : null
              const failed = itemSave?.status === 'error'
              const status =
                pending?.itemId === item.id ? pending.status : item.status
              const errorId = 'checklist-item-error-' + item.id

              return (
                <li className="checklist-item" key={item.id}>
                  <div className="checklist-item-contents">
                    <h3>{item.title}</h3>
                    {item.description && (
                      <p className="field-hint">{item.description}</p>
                    )}
                  </div>
                  {item.kind === 'action' ? (
                    <select
                      id={statusControlId(item.id)}
                      aria-label={'Статус: ' + item.title}
                      aria-disabled={pending ? true : undefined}
                      aria-describedby={failed ? errorId : undefined}
                      value={status}
                      onChange={(event) => {
                        const next = statuses.find(
                          (value) => value === event.target.value,
                        )
                        if (next)
                          void saveStatus({ itemId: item.id, status: next })
                      }}
                    >
                      {statuses.map((value) => (
                        <option key={value} value={value}>
                          {statusLabels[value]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="checklist-document-status">
                      {statusLabels[status]}
                    </span>
                  )}
                  {itemSave && (
                    <div className="checklist-item-feedback">
                      {itemSave.status === 'saving' ? (
                        <p role="status">Сохраняем статус…</p>
                      ) : (
                        <p id={errorId} role="alert">
                          Не удалось сохранить статус.
                        </p>
                      )}
                      {(itemSave.status === 'error' || itemSave.retry) && (
                        <button
                          className="button button-secondary"
                          type="button"
                          aria-disabled={pending ? true : undefined}
                          onClick={(event) => {
                            void saveStatus(
                              itemSave.change,
                              event.currentTarget,
                            )
                          }}
                        >
                          Повторить сохранение
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}

function statusControlId(itemId: string) {
  return 'checklist-item-status-' + itemId
}
