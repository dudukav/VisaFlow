import { isCalendarDate, isCreateApplicationInput } from '../../api/client'
import type { components } from '../../api/schema'

type Schema = components['schemas']
type Options = Schema['ApplicationOptions']
type Input = Schema['CreateApplicationInput']

export const applicationFields = [
  {
    name: 'country',
    label: 'Страна',
    options: 'countries',
    placeholder: 'Выберите страну',
  },
  {
    name: 'visaType',
    label: 'Тип визы',
    options: 'visaTypes',
    placeholder: 'Выберите тип визы',
  },
  { name: 'tripStartsOn', label: 'Дата начала поездки' },
  { name: 'tripEndsOn', label: 'Дата окончания поездки' },
  {
    name: 'submissionCityCode',
    label: 'Город подачи',
    options: 'submissionCities',
    placeholder: 'Выберите город',
  },
  { name: 'applicantDateOfBirth', label: 'Дата рождения заявителя' },
  {
    name: 'employmentStatus',
    label: 'Занятость',
    options: 'employmentStatuses',
    placeholder: 'Выберите статус',
  },
  {
    name: 'accessMode',
    label: 'Доступ к заявке',
    options: 'accessModes',
    placeholder: 'Выберите режим доступа',
  },
] as const satisfies readonly ({ name: keyof Input; label: string } & (
  { options: keyof Options; placeholder: string } | { options?: never }
))[]

export type ApplicationField = (typeof applicationFields)[number]['name']
export type FormValues = Record<ApplicationField, string>
export type FormProblem = {
  errors: Partial<Record<ApplicationField, string>>
  message?: string
  canRetry?: boolean
}

export const emptyFormValues: FormValues = {
  country: '',
  visaType: '',
  tripStartsOn: '',
  tripEndsOn: '',
  submissionCityCode: '',
  applicantDateOfBirth: '',
  employmentStatus: '',
  accessMode: '',
}

export function hasApplicationOptions(options: Options) {
  return applicationFields.every(
    (field) => !('options' in field) || options[field.options].length > 0,
  )
}

export function validateApplicationForm(
  values: FormValues,
  options: Options,
): { input: Input } | { problem: FormProblem } {
  const errors: FormProblem['errors'] = {}
  for (const field of applicationFields) {
    const value = values[field.name]
    if (!value) {
      errors[field.name] = 'Заполните это поле.'
    } else if ('options' in field) {
      if (!options[field.options].some((choice) => choice.code === value)) {
        errors[field.name] = 'Выберите значение из списка.'
      }
    } else if (!isCalendarDate(value)) {
      errors[field.name] = 'Укажите корректную дату.'
    }
  }

  if (
    !errors.tripStartsOn &&
    !errors.tripEndsOn &&
    values.tripEndsOn < values.tripStartsOn
  ) {
    errors.tripEndsOn = 'Дата окончания должна быть не раньше даты начала.'
  }

  if (Object.keys(errors).length > 0) return { problem: { errors } }
  if (isCreateApplicationInput(values)) return { input: values }

  return {
    problem: { errors, message: 'Проверьте выбранные параметры заявки.' },
  }
}

export function createFormProblem(
  violations: Schema['FieldViolation'][],
): FormProblem {
  const errors: FormProblem['errors'] = {}
  const messages: string[] = []
  for (const violation of violations) {
    const field = applicationFields.find(({ name }) => name === violation.field)
    if (field) {
      errors[field.name] ??= violation.message || 'Проверьте значение поля.'
    } else if (violation.message) {
      messages.push(violation.message)
    }
  }

  const message =
    messages.join(' ') ||
    (Object.keys(errors).length === 0
      ? 'Проверьте параметры заявки.'
      : undefined)
  return { errors, message }
}
