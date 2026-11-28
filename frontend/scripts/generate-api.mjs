import { readFile, writeFile } from 'node:fs/promises'
import { parse } from 'yaml'

const source = new URL('../../api/openapi.yaml', import.meta.url)
const { schemas } = parse(await readFile(source, 'utf8')).components

async function writeSchemas(filename, names, overrides = {}) {
  const definitions = Object.fromEntries(
    names.map((name) => {
      if (!schemas[name]) throw new Error('Missing OpenAPI schema: ' + name)
      return [name, overrides[name] ?? schemas[name]]
    }),
  )

  const output = JSON.stringify(
    { definitions },
    (key, value) =>
      key === '$ref' && typeof value === 'string'
        ? value.replace('#/components/schemas/', '#/definitions/')
        : value,
    2,
  )

  const target = new URL('../src/api/' + filename, import.meta.url)
  await writeFile(target, output + '\n')
}

// The input disallows additional properties. Merge the two allOf branches
// so Ajv can validate the input and the response metadata on the same object.
const input = schemas.CreateApplicationInput
const [inputRef, metadata] = schemas.Application.allOf
if (inputRef.$ref !== '#/components/schemas/CreateApplicationInput') {
  throw new Error('Application no longer extends CreateApplicationInput')
}
const application = {
  ...input,
  ...metadata,
  required: [...input.required, ...metadata.required],
  properties: { ...input.properties, ...metadata.properties },
}

await writeSchemas('auth-schemas.json', ['AuthSession', 'UserProfile', 'Uuid'])
await writeSchemas(
  'application-schemas.json',
  [
    'Option',
    'ApplicationOptions',
    'EmploymentStatus',
    'AccessMode',
    'ApplicationStatus',
    'CreateApplicationInput',
    'Application',
    'ApplicationPage',
    'Problem',
    'FieldViolation',
    'ValidationProblem',
    'Uuid',
  ],
  { Application: application },
)

const checklistItem = schemas.ChecklistItem
const documentType = checklistItem.properties.documentType
// Ajv needs null in the enum as well as nullable to match the generated type.
const checklistItemWithNullableDocumentType = {
  ...checklistItem,
  properties: {
    ...checklistItem.properties,
    documentType: { ...documentType, enum: [...documentType.enum, null] },
  },
}

await writeSchemas(
  'checklist-schemas.json',
  [
    'Checklist',
    'ChecklistItem',
    'ChecklistProgress',
    'RequirementsUpdate',
    'Subject',
    'UpdateChecklistItemInput',
    'UpdateChecklistItemResult',
    'Uuid',
  ],
  { ChecklistItem: checklistItemWithNullableDocumentType },
)
