import { isoDate } from './calendarLayout'

export type Habit = {
  id: string
  name: string
  description?: string | null
  icon: string
  tracking_type: 'boolean' | 'quantity' | 'duration' | 'count'
  target: number
  unit: string
  frequency: string
  weekdays: number[]
  time: string | null
  color: string
  active: boolean
  created_at?: string
}

export type HabitLog = { id: string; habit_id: string; log_date: string; value: number; completed: boolean }

export const habitWeekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function weekdayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

export function scheduledWeekdays(habit: Habit) {
  const days = (habit.weekdays ?? []).filter(day => Number.isInteger(day) && day >= 0 && day < 7)
  if (days.length) return [...new Set(days)].sort((a, b) => a - b)
  const created = new Date(habit.created_at ?? '')
  return [Number.isFinite(created.getTime()) ? weekdayIndex(created) : 0]
}

export function habitOccursOn(habit: Habit, date: Date) {
  if (!habit.active) return false
  const created = new Date(habit.created_at ?? '')
  if (Number.isFinite(created.getTime()) && isoDate(created) > isoDate(date)) return false
  const day = weekdayIndex(date)
  if (habit.frequency === 'weekdays') return day < 5
  if (habit.frequency === 'weekly') return scheduledWeekdays(habit).includes(day)
  return true
}

export function habitFrequencyLabel(habit: Habit) {
  if (habit.frequency === 'weekdays') return 'Dias úteis'
  if (habit.frequency === 'weekly') return scheduledWeekdays(habit).map(day => habitWeekdays[day]).join(', ')
  return 'Todos os dias'
}

export function habitIncrement(habit: Habit) {
  if (habit.tracking_type === 'duration') return 5
  if (habit.tracking_type === 'quantity' && habit.unit.trim().toLowerCase() === 'ml') return 250
  return 1
}
