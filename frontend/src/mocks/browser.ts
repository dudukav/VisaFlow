import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { API_BASE } from '../api/client'
import type { components } from '../api/schema'

type Schema = components['schemas']

export const mockInitData = 'visaflow-local-fixture'

const user = {
  id: '8b838e01-2ba6-4ef7-a1d3-31cf3be5854c',
  role: 'applicant',
  telegramDisplayName: 'Тестовый заявитель',
  hasCurrentConsent: false,
} satisfies Schema['UserProfile']

const session = {
  accessToken: 'visaflow-local-token',
  expiresAt: '2099-01-01T00:00:00Z',
  user,
} satisfies Schema['AuthSession']

function unauthorized() {
  const problem = {
    type: 'about:blank',
    title: 'Unauthorized',
    status: 401,
    code: 'UNAUTHORIZED',
    requestId: 'mock-auth-401',
  } satisfies Schema['Problem']

  return HttpResponse.json(problem, {
    status: 401,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

export const worker = setupWorker(
  http.post(API_BASE + '/auth/telegram', async ({ request }) => {
    const body: unknown = await request.json().catch(() => null)

    if (
      typeof body !== 'object' ||
      body === null ||
      !('initData' in body) ||
      body.initData !== mockInitData
    ) {
      return unauthorized()
    }

    return HttpResponse.json(session)
  }),

  http.get(API_BASE + '/me', ({ request }) => {
    if (
      request.headers.get('Authorization') !==
      'Bearer ' + session.accessToken
    ) {
      return unauthorized()
    }

    return HttpResponse.json(user)
  }),
)
