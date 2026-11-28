import type { components } from '../../api/schema'

type Schema = components['schemas']
type Item = Schema['ChecklistItem']

const rulesetId = '83f348bc-63a6-455c-a3b5-d8fecfa191a1'
const sourceId = 'c570e821-b273-4e4a-be50-46c9461389e1'

export function calculateMockProgress(
  items: Item[],
): Schema['ChecklistProgress'] {
  const total = items.filter(({ status }) => status !== 'not_applicable').length
  const completed = items.filter(({ status }) => status === 'done').length
  return {
    total,
    completed,
    percent: total === 0 ? 0 : (completed / total) * 100,
  }
}

function mockItems(applicantId: string): Item[] {
  const applicant = { type: 'applicant', id: applicantId } as const

  return [
    {
      id: crypto.randomUUID(),
      kind: 'action',
      title: 'Записаться на подачу',
      scope: 'application',
      status: 'todo',
      ruleId: '1ec2a454-d40f-44ac-bfbd-8b1126ade851',
      sourceId,
    },
    {
      id: crypto.randomUUID(),
      kind: 'action',
      title: 'Проверить данные анкеты',
      scope: 'participant',
      subject: applicant,
      status: 'done',
      ruleId: 'a07563ca-7d57-49ee-9bff-7df5793fd4d3',
      sourceId,
    },
    {
      id: crypto.randomUUID(),
      kind: 'document',
      documentType: 'employment_certificate',
      title: 'Справка с места работы',
      scope: 'participant',
      subject: applicant,
      status: 'in_progress',
      ruleId: '326c824d-5724-4bde-82ac-a4b6945dd4fc',
      sourceId,
    },
    {
      id: crypto.randomUUID(),
      kind: 'action',
      title: 'Подтверждение записи',
      scope: 'application',
      status: 'not_applicable',
      ruleId: '76c5bdfe-ee80-4261-9057-76296498fb64',
      sourceId,
    },
  ]
}

export function checklistFixture(
  applicationId: string,
  applicantId: string,
  empty: boolean,
): Schema['Checklist'] {
  const items = empty ? [] : mockItems(applicantId)

  return {
    applicationId,
    rulesetId,
    rulesetVersion: 'mock-checklist-v1',
    generatedAt: new Date().toISOString(),
    progress: calculateMockProgress(items),
    requirementsUpdateRequired: false,
    items,
  }
}
