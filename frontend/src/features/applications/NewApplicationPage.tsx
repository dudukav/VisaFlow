import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AuthRejected,
  createApplication,
  getApplicationOptions,
} from '../../api/client'
import type { components } from '../../api/schema'
import {
  applicationFields,
  createFormProblem,
  emptyFormValues,
  hasApplicationOptions,
  validateApplicationForm,
} from './applicationForm'
import type { ApplicationField, FormProblem } from './applicationForm'
import { useApplicationResource } from './useApplicationResource'
import './applications.css'

type Options = components['schemas']['ApplicationOptions']

export function NewApplicationPage() {
  const { resource, retry, onAuthRejected } = useApplicationResource(
    getApplicationOptions,
  )

  return (
    <section
      className="applications-page"
      aria-labelledby="new-application-title"
    >
      <header className="applications-header">
        <h1 id="new-application-title" tabIndex={-1}>
          Новая заявка
        </h1>
      </header>

      {resource.status === 'loading' && (
        <p className="applications-card applications-status" role="status">
          Загружаем параметры заявки…
        </p>
      )}

      {resource.status === 'error' && (
        <OptionsRetry
          message="Не удалось загрузить параметры заявки."
          retry={retry}
        />
      )}

      {resource.status === 'ready' &&
        (hasApplicationOptions(resource.data) ? (
          <ApplicationForm
            options={resource.data}
            onAuthRejected={onAuthRejected}
          />
        ) : (
          <OptionsRetry
            message="Сейчас нет доступных параметров для заявки."
            retry={retry}
          />
        ))}
    </section>
  )
}

function OptionsRetry({
  message,
  retry,
}: {
  message: string
  retry: () => void
}) {
  return (
    <div className="applications-card applications-status">
      <p role="alert">{message}</p>
      <button type="button" className="button button-secondary" onClick={retry}>
        Повторить загрузку
      </button>
    </div>
  )
}

function ApplicationForm({
  options,
  onAuthRejected,
}: {
  options: Options
  onAuthRejected: () => void
}) {
  const navigate = useNavigate()
  const [values, setValues] = useState(emptyFormValues)
  const [problem, setProblem] = useState<FormProblem | null>(null)
  const [saving, setSaving] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(false)
  const focusProblem = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const alertRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!focusProblem.current || !problem || saving) return
    focusProblem.current = false
    const field = applicationFields.find(({ name }) => problem.errors[name])
    const control = field && formRef.current?.elements.namedItem(field.name)
    if (control instanceof HTMLElement) control.focus()
    else alertRef.current?.focus()
  }, [problem, saving])

  function changeValue(field: ApplicationField, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setProblem((previous) => {
      if (!previous) return previous
      const errors = { ...previous.errors }
      delete errors[field]
      if (field === 'tripStartsOn') delete errors.tripEndsOn
      return { errors }
    })
  }

  function showProblem(nextProblem: FormProblem) {
    focusProblem.current = true
    setProblem(nextProblem)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return

    const validation = validateApplicationForm(values, options)
    if ('problem' in validation) {
      showProblem(validation.problem)
      return
    }

    pending.current = true
    setSaving(true)
    setProblem(null)
    try {
      const result = await createApplication(validation.input)
      if (!mounted.current) return

      if (result.kind === 'invalid') {
        showProblem(createFormProblem(result.violations))
        return
      }

      void navigate('/applications', {
        replace: true,
        state: { created: true },
      })
    } catch (error) {
      if (!mounted.current) return
      if (error instanceof AuthRejected) {
        onAuthRejected()
        return
      }
      showProblem({
        errors: {},
        message:
          'Не удалось подтвердить сохранение. Проверьте список заявок перед повторной попыткой.',
        canRetry: true,
      })
    } finally {
      pending.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <form
      ref={formRef}
      className="applications-card application-form"
      noValidate
      onSubmit={submit}
    >
      <fieldset
        className="application-fields"
        aria-label="Параметры заявки"
        disabled={saving}
      >
        {applicationFields.map((field) => {
          const id = `application-${field.name}`
          const error = problem?.errors[field.name]
          const attributes = {
            id,
            name: field.name,
            value: values[field.name],
            required: true,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': error ? `${id}-error` : undefined,
          }

          return (
            <div className="application-field" key={field.name}>
              <label htmlFor={id}>{field.label}</label>
              {'options' in field ? (
                <select
                  {...attributes}
                  onChange={(event) =>
                    changeValue(field.name, event.target.value)
                  }
                >
                  <option value="">{field.placeholder}</option>
                  {options[field.options].map(({ code, label }) => (
                    <option value={code} key={code}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  {...attributes}
                  type="date"
                  onChange={(event) =>
                    changeValue(field.name, event.target.value)
                  }
                />
              )}
              {error && (
                <p id={`${id}-error`} className="application-field-error">
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </fieldset>

      {problem?.message && (
        <p
          ref={alertRef}
          className="applications-message applications-message-error"
          role="alert"
          tabIndex={-1}
        >
          {problem.message}
        </p>
      )}

      {saving && (
        <p className="field-hint" role="status">
          Сохраняем заявку…
        </p>
      )}

      <div className="application-actions">
        <button type="submit" className="button" disabled={saving}>
          {problem?.canRetry ? 'Повторить сохранение' : 'Создать заявку'}
        </button>
        <Link className="button button-secondary" to="/applications">
          К списку заявок
        </Link>
      </div>
    </form>
  )
}
