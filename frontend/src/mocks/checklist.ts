import { delay, http, HttpResponse } from 'msw'
import { API_BASE, isChecklistItemUpdate } from '../api/client'
import type { components } from '../api/schema'
import { calculateMockProgress, checklistFixture } from './fixtures/checklist'

type Schema = components['schemas']
const checklistPath = API_BASE + '/applications/:applicationId/checklist'

type ChecklistMockContext = {
  ownerId: string
  hasOwnedApplication: (applicationId: string) => boolean
  scenario: string | null
  getAuthError: () => Response | undefined
  problemResponse: (problem: Schema['Problem']) => Response
}

export function checklistHandlers({
  ownerId,
  hasOwnedApplication,
  scenario,
  getAuthError,
  problemResponse,
}: ChecklistMockContext) {
  const checklists = new Map<string, Schema['Checklist']>()
  let pendingScenario = scenario

  function getChecklist(applicationId: unknown) {
    if (
      typeof applicationId !== 'string' ||
      !hasOwnedApplication(applicationId)
    )
      return undefined

    const existing = checklists.get(applicationId)
    if (existing) return existing

    const checklist = checklistFixture(
      applicationId,
      ownerId,
      scenario === 'empty',
    )
    checklists.set(applicationId, checklist)
    return checklist
  }

  function unavailable() {
    return problemResponse({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      requestId: 'mock-checklist-503',
    })
  }

  function notFound() {
    return problemResponse({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      code: 'NOT_FOUND',
      requestId: 'mock-checklist-404',
    })
  }

  function conflict() {
    return problemResponse({
      type: 'about:blank',
      title: 'Checklist item cannot be updated',
      status: 409,
      code: 'CHECKLIST_ITEM_CONFLICT',
      requestId: 'mock-checklist-409',
    })
  }

  return [
    http.get(checklistPath, async ({ params }) => {
      const authError = getAuthError()
      if (authError) return authError

      const checklist = getChecklist(params.applicationId)
      if (!checklist) return notFound()

      // Overlapping mount reads are one attempt in StrictMode.
      const shouldFail = pendingScenario === 'load-error-once'
      await delay(300)
      if (shouldFail) {
        pendingScenario = null
        return unavailable()
      }

      return HttpResponse.json(checklist)
    }),

    http.patch(
      checklistPath + '/items/:itemId',
      async ({ params, request }) => {
        const authError = getAuthError()
        if (authError) return authError

        const body: unknown = await request.json().catch(() => null)
        if (!isChecklistItemUpdate(body)) return conflict()

        await delay(450)
        const checklist = getChecklist(params.applicationId)
        const item = checklist?.items.find(({ id }) => id === params.itemId)
        if (!checklist || item?.kind !== 'action') return conflict()

        if (pendingScenario === 'update-error-once') {
          pendingScenario = null
          return unavailable()
        }

        item.status = body.status
        checklist.progress = calculateMockProgress(checklist.items)
        const result = {
          item,
          progress: checklist.progress,
        } satisfies Schema['UpdateChecklistItemResult']
        return HttpResponse.json(result)
      },
    ),
  ]
}
