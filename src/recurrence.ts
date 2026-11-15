const dayMs = 86_400_000

export const frequencies = {
  days: ['dia', 'dias'],
  weeks: ['semana', 'semanas'],
  months: ['mês', 'meses'],
  years: ['ano', 'anos'],
} as const

export type Frequency = keyof typeof frequencies
export type Recurrence = {
  frequency: string
  interval_value: number
  start_date: string | null
  end_date: string | null
  day_of_month?: number | null
  weekdays?: number[] | null
  active: boolean
}

export function isFrequency(value: string): value is Frequency {
  return Object.prototype.hasOwnProperty.call(frequencies, value)
}

const parseDay = (value: string) => new Date(`${value}T00:00:00Z`)
const dateKey = (date: Date) => date.toISOString().slice(0, 10)
const monthIndex = (date: Date) => date.getUTCFullYear() * 12 + date.getUTCMonth()

function schedule(rule: Recurrence) {
  if (!rule.active || !rule.start_date || !isFrequency(rule.frequency)) return null
  const first = parseDay(rule.start_date)
  if (!Number.isFinite(first.getTime())) return null
  const step = Math.max(1, Number.isSafeInteger(rule.interval_value) ? rule.interval_value : 1)
  const days = rule.frequency === 'days' ? step : rule.frequency === 'weeks' ? 7 * step : 0
  const months = rule.frequency === 'months' ? step : rule.frequency === 'years' ? 12 * step : 0
  return { first, days, months }
}

function atIndex(first: Date, index: number, days: number, months: number, preferredDay: number) {
  if (days) return new Date(first.getTime() + index * days * dayMs)
  if (!index) return first
  const result = new Date(first)
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + index * months)
  const end = new Date(result)
  end.setUTCMonth(end.getUTCMonth() + 1, 0)
  result.setUTCDate(Math.min(preferredDay, end.getUTCDate()))
  return result
}

export function nextRecurrence(rule: Recurrence, after: string): string | null {
  const plan = schedule(rule)
  const afterDay = parseDay(after)
  if (!plan || !Number.isFinite(afterDay.getTime())) return null
  const { first, days, months } = plan
  const distance = days ? (afterDay.getTime() - first.getTime()) / (days * dayMs) : (monthIndex(afterDay) - monthIndex(first)) / months
  const index = Math.max(0, Math.floor(distance))
  const preferred = rule.day_of_month || first.getUTCDate()
  let next = atIndex(first, index, days, months, preferred)
  if (next <= afterDay) next = atIndex(first, index + 1, days, months, preferred)

  // Existing weekday rules also match their explicitly selected weekdays.
  if (rule.weekdays?.length) {
    const earliest = Math.max(first.getTime(), afterDay.getTime() + dayMs)
    for (let offset = 0; offset < 7; offset++) {
      const candidate = new Date(earliest + offset * dayMs)
      if (candidate >= next) break
      if (rule.weekdays.includes(candidate.getUTCDay())) {
        next = candidate
        break
      }
    }
  }

  if (!Number.isFinite(next.getTime()) || next.getUTCFullYear() > 9999) return null
  const key = dateKey(next)
  return !rule.end_date || key <= rule.end_date ? key : null
}

export function occursOn(rule: Recurrence, day: string) {
  const date = parseDay(day)
  if (!Number.isFinite(date.getTime())) return false
  const previousDay = dateKey(new Date(date.getTime() - dayMs))
  return nextRecurrence(rule, previousDay) === day
}

export function upcomingDates(rule: Recurrence, after: string, count = 3) {
  const dates: string[] = []
  let day = after
  for (let index = 0; index < count; index++) {
    const next = nextRecurrence(rule, day)
    if (!next) break
    dates.push(next)
    day = next
  }
  return dates
}
