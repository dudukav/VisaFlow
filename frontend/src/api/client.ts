import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import createClient from 'openapi-fetch'
import schemas from './auth-schemas.json'
import type { components, paths } from './schema'

export const API_BASE = '/api/v1'
const api = createClient<paths>({ baseUrl: API_BASE })

type Schema = components['schemas']

const ajv = new Ajv()
addFormats(ajv)

const schemaId = 'urn:visaflow:auth'
ajv.addSchema(schemas, schemaId)

const isSession = ajv.compile<Schema['AuthSession']>({
  $ref: schemaId + '#/definitions/AuthSession',
})
const isProfile = ajv.compile<Schema['UserProfile']>({
  $ref: schemaId + '#/definitions/UserProfile',
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
