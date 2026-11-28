import type { components } from '../../api/schema'

type Schema = components['schemas']
export type ChecklistItem = Schema['ChecklistItem']
export type ChecklistStatus = ChecklistItem['status']
type Progress = Schema['ChecklistProgress']

export const statusLabels: Record<ChecklistStatus, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Выполнено',
  not_applicable: 'Не требуется',
}

export function optimisticProgress(
  progress: Progress,
  previous: ChecklistStatus,
  next: ChecklistStatus,
): Progress {
  const total = Math.max(
    0,
    progress.total +
      Number(next !== 'not_applicable') -
      Number(previous !== 'not_applicable'),
  )
  const completed = Math.min(
    total,
    Math.max(
      0,
      progress.completed +
        Number(next === 'done') -
        Number(previous === 'done'),
    ),
  )

  return {
    completed,
    total,
    percent: total === 0 ? 0 : (completed / total) * 100,
  }
}

type Group = { id: string; label: string; items: ChecklistItem[] }

export function groupChecklistItems(items: ChecklistItem[]) {
  const shared: Group = { id: 'application', label: 'Общие пункты', items: [] }
  const applicant: Group = {
    id: 'applicant',
    label: 'Основной заявитель',
    items: [],
  }
  const participants: Group = {
    id: 'participants',
    label: 'Участники',
    items: [],
  }
  const family = new Map<string, Group>()

  for (const item of items) {
    if (item.scope === 'application') {
      shared.items.push(item)
    } else if (item.subject?.type === 'applicant') {
      applicant.items.push(item)
    } else if (item.subject?.type === 'family_member') {
      const id = item.subject.id
      let group = family.get(id)
      if (!group) {
        group = { id, label: 'Участник семьи ' + (family.size + 1), items: [] }
        family.set(id, group)
      }
      group.items.push(item)
    } else {
      participants.items.push(item)
    }
  }

  return [shared, applicant, ...family.values(), participants].filter(
    ({ items }) => items.length > 0,
  )
}
