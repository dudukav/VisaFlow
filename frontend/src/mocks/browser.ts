import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { API_BASE } from '../api/client'
import type { components } from '../api/schema'
import { applicationHandlers } from './applications'
import { checklistHandlers } from './checklist'

type Schema = components['schemas']

export const mockInitData = 'visaflow-local-fixture'

const user = {
  id: '8b838e01-2ba6-4ef7-a1d3-31cf3be5854c',
  telegramDisplayName: 'Тестовый заявитель',
  hasCurrentConsent: false,
} satisfies Schema['UserProfile']

const session = {
  expiresAt: '2099-01-01T00:00:00Z',
  user,
} satisfies Schema['AuthSession']

let authenticated = false
const applications: Schema['Application'][] = []
const scenarios = new URLSearchParams(window.location.search)

function problemResponse(problem: Schema['Problem']) {
  return HttpResponse.json(problem, {
    status: problem.status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function unauthorized() {
  return problemResponse({
    type: 'about:blank',
    title: 'Unauthorized',
    status: 401,
    code: 'UNAUTHORIZED',
    requestId: 'mock-auth-401',
  })
}

const getAuthError = () => (authenticated ? undefined : unauthorized())

export const worker = setupWorker(
  http.post(API_BASE + '/auth/telegram', async ({ request }) => {
    const body: unknown = await request.json().catch(() => null)
    authenticated = false

    if (
      typeof body !== 'object' ||
      body === null ||
      !('initData' in body) ||
      body.initData !== mockInitData
    ) {
      return unauthorized()
    }

    authenticated = true
    return HttpResponse.json(session)
  }),

  http.get(API_BASE + '/me', () => {
    if (!authenticated) return unauthorized()

    return HttpResponse.json(user)
  }),

  ...applicationHandlers({
    applications,
    ownerId: user.id,
    scenario: scenarios.get('mockApplications'),
    getAuthError,
    problemResponse,
  }),
  ...checklistHandlers({
    ownerId: user.id,
    hasOwnedApplication: (applicationId) =>
      applications.some(
        ({ id, ownerId }) => id === applicationId && ownerId === user.id,
      ),
    scenario: scenarios.get('mockChecklist'),
    getAuthError,
    problemResponse,
  }),
)
