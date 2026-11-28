import { delay, http, HttpResponse } from 'msw'
import { API_BASE, isCreateApplicationInput } from '../api/client'
import type { components } from '../api/schema'

type Schema = components['schemas']

const options = {
  countries: [{ code: 'IT', label: 'Италия' }],
  visaTypes: [{ code: 'tourist', label: 'Туристическая' }],
  submissionCities: [
    { code: 'moscow', label: 'Москва' },
    { code: 'saint-petersburg', label: 'Санкт-Петербург' },
  ],
  employmentStatuses: [
    { code: 'employed', label: 'Работаю по найму' },
    { code: 'self_employed', label: 'Работаю на себя' },
    { code: 'student', label: 'Учусь' },
    { code: 'retired', label: 'На пенсии' },
    { code: 'unemployed', label: 'Не работаю' },
  ],
  accessModes: [
    { code: 'organizer_only', label: 'Только организатор' },
    { code: 'shared', label: 'Совместный доступ' },
  ],
} satisfies Schema['ApplicationOptions']

type ApplicationMockContext = {
  ownerId: string
  scenario: string | null
  getAuthError: () => Response | undefined
  problemResponse: (problem: Schema['Problem']) => Response
}

export function applicationHandlers({
  ownerId,
  scenario,
  getAuthError,
  problemResponse,
}: ApplicationMockContext) {
  const applications: Schema['Application'][] = []
  let pendingScenario = scenario

  function consumeScenario(scenario: string) {
    if (pendingScenario !== scenario) return false

    pendingScenario = null
    return true
  }

  async function failFirstLoad(scenario: string) {
    // Count overlapping StrictMode requests as one load.
    const shouldFail = pendingScenario === scenario
    await delay(300)
    if (shouldFail) consumeScenario(scenario)

    return shouldFail
  }

  function unavailable() {
    return problemResponse({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      requestId: 'mock-applications-503',
    })
  }

  function invalidApplication(violations: Schema['FieldViolation'][]) {
    const problem = {
      type: 'about:blank',
      title: 'Validation failed',
      status: 422,
      code: 'VALIDATION_FAILED',
      requestId: 'mock-applications-422',
      violations,
    } satisfies Schema['ValidationProblem']

    return problemResponse(problem)
  }

  return [
    http.get(API_BASE + '/application-options', async () => {
      const authError = getAuthError()
      if (authError) return authError

      if (await failFirstLoad('options-error-once')) return unavailable()

      return HttpResponse.json(options)
    }),

    http.get(API_BASE + '/applications', async () => {
      const authError = getAuthError()
      if (authError) return authError

      if (await failFirstLoad('list-error-once')) return unavailable()

      const page = {
        items: applications,
        nextCursor: null,
      } satisfies Schema['ApplicationPage']
      return HttpResponse.json(page)
    }),

    http.post(API_BASE + '/applications', async ({ request }) => {
      const authError = getAuthError()
      if (authError) return authError

      await delay(300)
      if (consumeScenario('create-error-once')) return unavailable()

      const body: unknown = await request.json().catch(() => null)
      if (!isCreateApplicationInput(body)) {
        const violations = (isCreateApplicationInput.errors ?? []).map(
          (error) => ({
            field:
              error.keyword === 'required' &&
              typeof error.params.missingProperty === 'string'
                ? error.params.missingProperty
                : error.instancePath.slice(1),
            code: 'INVALID_VALUE',
            message: 'Проверьте значение поля.',
          }),
        )
        return invalidApplication(violations)
      }

      if (
        !options.submissionCities.some(
          ({ code }) => code === body.submissionCityCode,
        ) ||
        consumeScenario('validation-error-once')
      ) {
        return invalidApplication([
          {
            field: 'submissionCityCode',
            code: 'INVALID_CITY',
            message: 'Выберите другой город подачи.',
          },
        ])
      }

      if (body.tripEndsOn < body.tripStartsOn) {
        return invalidApplication([
          {
            field: 'tripEndsOn',
            code: 'INVALID_DATE_RANGE',
            message: 'Дата окончания должна быть не раньше даты начала.',
          },
        ])
      }

      const now = new Date().toISOString()
      const application = {
        ...body,
        id: crypto.randomUUID(),
        ownerId,
        status: 'draft',
        participantCount: 1,
        requirementsUpdateRequired: false,
        createdAt: now,
        updatedAt: now,
      } satisfies Schema['Application']

      applications.unshift(application)
      return HttpResponse.json(application, { status: 201 })
    }),
  ]
}
