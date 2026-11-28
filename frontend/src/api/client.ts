import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import createClient from 'openapi-fetch'
import applicationSchemas from './application-schemas.json'
import authSchemas from './auth-schemas.json'
import checklistSchemas from './checklist-schemas.json'
import type { components, paths } from './schema'

export const API_BASE = '/api/v1'
const api = createClient<paths>({ baseUrl: API_BASE })

type Schema = components['schemas']

const ajv = new Ajv()
addFormats(ajv)

const authSchemaId = 'urn:visaflow:auth'
const applicationSchemaId = 'urn:visaflow:application'
const checklistSchemaId = 'urn:visaflow:checklist'
ajv.addSchema(authSchemas, authSchemaId)
ajv.addSchema(applicationSchemas, applicationSchemaId)
ajv.addSchema(checklistSchemas, checklistSchemaId)

const isSession = ajv.compile<Schema['AuthSession']>({
  $ref: authSchemaId + '#/definitions/AuthSession',
})
const isProfile = ajv.compile<Schema['UserProfile']>({
  $ref: authSchemaId + '#/definitions/UserProfile',
})
const isApplicationOptions = ajv.compile<Schema['ApplicationOptions']>({
  $ref: applicationSchemaId + '#/definitions/ApplicationOptions',
})
const isApplicationPage = ajv.compile<Schema['ApplicationPage']>({
  $ref: applicationSchemaId + '#/definitions/ApplicationPage',
})
const isApplication = ajv.compile<Schema['Application']>({
  $ref: applicationSchemaId + '#/definitions/Application',
})
const isValidationProblem = ajv.compile<Schema['ValidationProblem']>({
  $ref: applicationSchemaId + '#/definitions/ValidationProblem',
})
export const isCreateApplicationInput = ajv.compile<
  Schema['CreateApplicationInput']
>({
  $ref: applicationSchemaId + '#/definitions/CreateApplicationInput',
})
export const isCalendarDate = ajv.compile<string>({
  type: 'string',
  format: 'date',
})

const isChecklist = ajv.compile<Schema['Checklist']>({
  $ref: checklistSchemaId + '#/definitions/Checklist',
})
const isChecklistItemResult = ajv.compile<Schema['UpdateChecklistItemResult']>({
  $ref: checklistSchemaId + '#/definitions/UpdateChecklistItemResult',
})
export const isChecklistItemUpdate = ajv.compile<
  Schema['UpdateChecklistItemInput']
>({
  $ref: checklistSchemaId + '#/definitions/UpdateChecklistItemInput',
})

export class AuthRejected extends Error {}

export async function signIn(initData: string) {
  const auth = await api.POST('/auth/telegram', { body: { initData } })

  if (auth.response.status === 401) throw new AuthRejected()
  if (!auth.response.ok || !isSession(auth.data)) {
    throw new Error('Invalid auth response')
  }

  const profile = await api.GET('/me')

  if (profile.response.status === 401) throw new AuthRejected()
  if (!profile.response.ok || !isProfile(profile.data)) {
    throw new Error('Invalid profile response')
  }

  return profile.data
}

export async function getApplicationOptions(signal?: AbortSignal) {
  const result = await api.GET('/application-options', { signal })
  if (result.response.status === 401) throw new AuthRejected()
  if (!result.response.ok || !isApplicationOptions(result.data)) {
    throw new Error('Invalid application options response')
  }

  return result.data
}

export async function listApplications(signal?: AbortSignal) {
  const result = await api.GET('/applications', { signal })
  if (result.response.status === 401) throw new AuthRejected()
  if (!result.response.ok || !isApplicationPage(result.data)) {
    throw new Error('Invalid application list response')
  }

  return result.data
}

type CreateApplicationResult =
  | { kind: 'created'; application: Schema['Application'] }
  | { kind: 'invalid'; violations: Schema['FieldViolation'][] }

export async function createApplication(
  body: Schema['CreateApplicationInput'],
): Promise<CreateApplicationResult> {
  const result = await api.POST('/applications', { body })
  if (result.response.status === 401) throw new AuthRejected()
  if (result.response.status === 422 && isValidationProblem(result.error)) {
    return { kind: 'invalid', violations: result.error.violations }
  }
  if (result.response.status === 201 && isApplication(result.data)) {
    return { kind: 'created', application: result.data }
  }

  throw new Error('Invalid application creation response')
}

export async function getChecklist(
  applicationId: string,
  signal?: AbortSignal,
) {
  const result = await api.GET('/applications/{applicationId}/checklist', {
    params: { path: { applicationId } },
    signal,
  })
  if (result.response.status === 401) throw new AuthRejected()
  if (
    !result.response.ok ||
    !isChecklist(result.data) ||
    result.data.applicationId !== applicationId
  ) {
    throw new Error('Invalid checklist response')
  }

  return result.data
}

export async function updateChecklistItem(
  applicationId: string,
  itemId: string,
  status: Schema['UpdateChecklistItemInput']['status'],
) {
  const result = await api.PATCH(
    '/applications/{applicationId}/checklist/items/{itemId}',
    {
      params: { path: { applicationId, itemId } },
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: { status },
    },
  )
  if (result.response.status === 401) throw new AuthRejected()
  if (
    !result.response.ok ||
    !isChecklistItemResult(result.data) ||
    result.data.item.id !== itemId
  ) {
    throw new Error('Invalid checklist item update response')
  }

  return result.data
}
