import { readFile, writeFile } from 'node:fs/promises'
import { parse } from 'yaml'

const source = new URL('../../api/openapi.yaml', import.meta.url)
const target = new URL('../src/api/auth-schemas.json', import.meta.url)
const { schemas } = parse(await readFile(source, 'utf8')).components

const names = ['AuthSession', 'UserProfile', 'Uuid']
const selected = Object.fromEntries(
  names.map((name) => {
    if (!schemas[name]) throw new Error('Missing OpenAPI schema: ' + name)
    return [name, schemas[name]]
  }),
)

const output = JSON.stringify(
  { definitions: selected },
  (key, value) =>
    key === '$ref' && typeof value === 'string'
      ? value.replace('#/components/schemas/', '#/definitions/')
      : value,
  2,
)

await writeFile(target, output + '\n')
