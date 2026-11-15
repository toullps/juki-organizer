import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Flame, Plus, Repeat2 } from 'lucide-react'
import type { Rule, Task } from './app'
import { addDays, calendarLayout, isoDate, moveMonth, startWeek } from './calendarLayout'
import { timeRange } from './taskTime'
import { occursOn } from './recurrence'
import { habitOccursOn, type Habit, type HabitLog } from './habitSchedule'

type Mode = 'day' | 'week' | 'month'
type TaskEntry = { kind: 'task'; id: string; task: Task; projected?: boolean }
type HabitEntry = { kind: 'habit'; id: string; habit: Habit; completed: boolean }
type AgendaItem = TaskEntry | HabitEntry

type EditCallbacks = {
  onEdit: (task: Task) => void
  onEditHabit: (habit: Habit) => void
}
type AgendaProps = {
  date: Date
  setDate: (date: Date) => void
  tasks: Task[]
  rules: Rule[]
  habits: Habit[]
  logs: HabitLog[]
  onNew: (date: string) => void
} & EditCallbacks

const views = { day: 'Dia', week: 'Semana', month: 'Mês' } as const
const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const fullDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const minutesPerDay = 1440
function itemsByDay(days: Date[], tasks: Task[], rules: Rule[], habits: Habit[], logs: HabitLog[]) {
  const logByDay = new Map(logs.map(log => [`${log.log_date}:${log.habit_id}`, log]))
  const scheduled = new Map<string, Task[]>()
  const series = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.recurrence_rule_id) {
      const linked = series.get(task.recurrence_rule_id) ?? []
      linked.unshift(task)
      series.set(task.recurrence_rule_id, linked)
    }
    if (!task.due_date) continue
    const onDate = scheduled.get(task.due_date) ?? []
    onDate.push(task)
    scheduled.set(task.due_date, onDate)
  }

  return days.map(date => {
    const key = isoDate(date)
    const saved = scheduled.get(key) ?? []
    const items: AgendaItem[] = saved.map(task => ({ kind: 'task', id: task.id, task }))
    for (const rule of rules) {
      if (!occursOn(rule, key) || saved.some(task => task.recurrence_rule_id === rule.id)) continue
      const linked = series.get(rule.id)
      const template = linked?.find(task => !!task.due_date && task.due_date <= key) ?? (linked && linked[linked.length - 1])
      if (template) {
        items.push({ kind: 'task', id: `virtual-${rule.id}-${key}`, task: { ...template, due_date: key }, projected: true })
      }
    }
    for (const habit of habits) {
      const log = logByDay.get(`${key}:${habit.id}`)
      if (!habitOccursOn(habit, date) && !log) continue
      items.push({ kind: 'habit', id: `habit-${habit.id}`, habit, completed: !!log?.completed })
    }
    return { date, key, items }
  })
}

type AgendaDay = ReturnType<typeof itemsByDay>[number]

function visibleDates(date: Date, mode: Mode) {
  if (mode === 'day') return [date]
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = mode === 'week' ? startWeek(date) : new Date(year, month, 1, 12)
  const count = mode === 'week' ? 7 : new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => addDays(start, index))
}

export function CalendarAgenda({ date, setDate, tasks, rules, habits, logs, onEdit, onEditHabit, onNew }: AgendaProps) {
  const [mode, setMode] = useState<Mode>(() => window.matchMedia('(max-width: 720px)').matches ? 'day' : 'week')
  const days = useMemo(() => itemsByDay(visibleDates(date, mode), tasks, rules, habits, logs), [date, mode, tasks, rules, habits, logs])
  const today = isoDate(new Date())
  const counts = itemCount(days.flatMap(day => day.items))
  const hasForecast = days.some(day => day.items.some(item => item.kind === 'task' && item.projected))
  const title = mode === 'day' ? fullDate.format(date) : monthName.format(date)
  const range = mode === 'week' ? `${shortDate.format(days[0].date)} – ${shortDate.format(days[6].date)}` : ''

  function navigate(direction: number) {
    setDate(mode === 'month' ? moveMonth(date, direction) : addDays(date, direction * (mode === 'week' ? 7 : 1)))
  }

  function openDay(day: Date) {
    setDate(day)
    setMode('day')
  }

  return <section className="agenda" aria-label="Agenda">
    <header className="agenda-toolbar">
      <div className="agenda-heading">
        <p>Agenda</p>
        <h1>{title}</h1>
        <span aria-live="polite">{range && `${range} · `}{counts.label}</span>
      </div>
      <div className="agenda-actions">
        <div className="agenda-navigation" role="group" aria-label="Navegação do calendário">
          <button className="icon-button soft" aria-label="Período anterior" onClick={() => navigate(-1)}><ChevronLeft size={17}/></button>
          <button className="today-btn" onClick={() => setDate(new Date())}>Hoje</button>
          <button className="icon-button soft" aria-label="Próximo período" onClick={() => navigate(1)}><ChevronRight size={17}/></button>
        </div>
        <button className="primary" aria-label={`Nova tarefa para ${fullDate.format(date)}`} onClick={() => onNew(isoDate(date))}><Plus size={16}/> Nova tarefa</button>
      </div>
    </header>
    <div className="agenda-viewbar" role="group" aria-label="Exibição do calendário">
      {(Object.keys(views) as Mode[]).map(view =>
        <button key={view} aria-pressed={view === mode} onClick={() => setMode(view)}>{views[view]}</button>
      )}
    </div>
    {mode === 'month'
      ? <MonthAgenda days={days} today={today} onOpenDay={openDay} onEdit={onEdit} onEditHabit={onEditHabit}/>
      : <TimelineAgenda key={`${mode}-${days[0].key}`} mode={mode} days={days} today={today} onOpenDay={openDay} onEdit={onEdit} onEditHabit={onEditHabit}/>}
    {hasForecast && <p className="agenda-forecast"><Repeat2 size={15}/> Previsões de tarefas recorrentes aparecem com contorno tracejado.</p>}
  </section>
}

function itemCount(items: AgendaItem[]) {
  const habits = items.filter(item => item.kind === 'habit').length
  const tasks = items.length - habits
  const taskLabel = `${tasks} ${tasks === 1 ? 'tarefa' : 'tarefas'}`
  const habitLabel = `${habits} ${habits === 1 ? 'hábito' : 'hábitos'}`
  return { tasks, habits, taskLabel, habitLabel, label: habits ? (tasks ? `${taskLabel} · ${habitLabel}` : habitLabel) : taskLabel }
}

function itemTime(item: AgendaItem) {
  return item.kind === 'habit' ? item.habit.time : item.task.due_time
}

function AgendaEvent({ item, onEdit, onEditHabit, className = '', style }: EditCallbacks & {
  item: AgendaItem
  className?: string
  style?: React.CSSProperties
}) {
  if (item.kind === 'habit') {
    const { habit, completed } = item
    const time = habit.time?.slice(0, 5)
    const label = ['Hábito', habit.name, time, completed && 'Concluído'].filter(Boolean).join(' · ')
    return <button type="button" className={`agenda-habit ${className}${completed ? ' is-complete' : ''}`} style={style} title={label} aria-label={label} onClick={() => onEditHabit(habit)}>
      <Flame size={13} aria-hidden="true"/>
      <span>{habit.name}</span>
      {time && <small>{time}</small>}
      {completed && <Check size={12} aria-hidden="true"/>}
    </button>
  }
  const { task, projected } = item
  const time = timeRange(task)
  const forecast = projected ? 'Previsão de tarefa recorrente' : ''
  const done = !projected && task.status === 'done'
  const label = [task.title, time, task.project?.name, forecast, done && 'Concluída'].filter(Boolean).join(' · ')
  const classes = `agenda-task tone-${task.project?.color || 'sage'} ${className}${projected ? ' is-projected' : ''}${done ? ' is-complete' : ''}`
  const content = <>
    <span className="agenda-task-title">{done && <Check size={12} aria-hidden="true"/>}{task.title}</span>
    {time && <small>{time}</small>}
  </>
  if (projected) return <div className={classes} style={style} title={label} aria-label={label}>{content}</div>
  return <button type="button" className={classes} style={style} onClick={() => onEdit(task)} title={label} aria-label={label}>{content}</button>
}

function TimelineAgenda({ mode, days, today, onOpenDay, onEdit, onEditHabit }: EditCallbacks & {
  mode: 'day' | 'week'
  days: AgendaDay[]
  today: string
  onOpenDay: (day: Date) => void
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const initialScroll = useRef<number | null>(null)
  const schedules = days.map(day => ({
    ...day,
    timed: calendarLayout(day.items.map(item => ({
      item, due_time: itemTime(item),
      // A habit has a start time; reserve room for its marker without presenting a duration.
      estimated_minutes: item.kind === 'habit' ? 24 : item.task.estimated_minutes,
    }))),
    unscheduledTasks: day.items.filter(item => item.kind === 'task' && !itemTime(item)),
    unscheduledHabits: day.items.filter(item => item.kind === 'habit' && !itemTime(item)),
  }))
  const first = Math.min(...schedules.flatMap(day => day.timed.map(event => event.start)))
  const startHour = Number.isFinite(first) ? Math.max(0, Math.floor(first / 60) - 1) : 8

  useLayoutEffect(() => {
    if (!viewport.current || !body.current) return
    if (initialScroll.current !== null && Math.abs(viewport.current.scrollTop - initialScroll.current) > 1) return
    viewport.current.scrollTop = startHour * body.current.offsetHeight / 24
    initialScroll.current = viewport.current.scrollTop
  }, [first, startHour])

  return <div className={`agenda-timeline agenda-${mode}`} ref={viewport} tabIndex={0} role="region" aria-label="Grade de horários">
    <div className="agenda-timeline-inner">
      <div className="agenda-timeline-heading agenda-columns">
        <div className="agenda-gutter" aria-hidden="true"/>
        {days.map(day => <div className="agenda-day-heading" key={day.key}>
          <button className="agenda-date" aria-label={fullDate.format(day.date)} aria-current={day.key === today ? 'date' : undefined} onClick={() => onOpenDay(day.date)}>
            <span>{weekdays[(day.date.getDay() + 6) % 7]}</span><b>{day.date.getDate()}</b>
          </button>
        </div>)}
      </div>
      <div className="agenda-flexible agenda-columns">
        <div className="agenda-gutter"><span>Sem<br/>horário</span></div>
        {schedules.map(day => <div className="agenda-flexible-day" key={day.key}>
          {day.unscheduledTasks.map(item => <AgendaEvent key={item.id} item={item} onEdit={onEdit} onEditHabit={onEditHabit}/>)}
          {!!day.unscheduledHabits.length && <div className="agenda-flexible-habits" role="group" aria-label="Hábitos sem horário">
            <span>Hábitos</span>
            {day.unscheduledHabits.map(item => <AgendaEvent key={item.id} item={item} onEdit={onEdit} onEditHabit={onEditHabit}/>)}
          </div>}
          {!day.unscheduledTasks.length && !day.unscheduledHabits.length && mode === 'day' && <span className="agenda-flexible-empty">Nada sem horário para este dia</span>}
        </div>)}
      </div>
      <div className="agenda-hours agenda-columns" ref={body}>
        <div className="agenda-gutter agenda-hour-labels" aria-hidden="true">
          {Array.from({ length: 24 }, (_, hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}
        </div>
        {schedules.map(day => <div className="agenda-hour-column" key={day.key}>
          {day.timed.map(({ task: { item }, start, end, column, columns }) => <AgendaEvent
            key={item.id}
            item={item}
            onEdit={onEdit}
            onEditHabit={onEditHabit}
            className={`agenda-timed${end - start < 40 ? ' agenda-short' : ''}`}
            style={{
              top: `${start / minutesPerDay * 100}%`,
              height: `${(end - start) / minutesPerDay * 100}%`,
              left: `calc(${column / columns * 100}% + 2px)`,
              width: `calc(${100 / columns}% - 4px)`,
            }}
          />)}
        </div>)}
      </div>
    </div>
  </div>
}

function MonthAgenda({ days, today, onOpenDay, onEdit, onEditHabit }: EditCallbacks & {
  days: AgendaDay[]
  today: string
  onOpenDay: (day: Date) => void
}) {
  const offset = (days[0].date.getDay() + 6) % 7
  const length = Math.ceil((offset + days.length) / 7) * 7
  return <div className="agenda-month">
    <div className="agenda-weekdays">{weekdays.map(name => <span key={name}>{name}</span>)}</div>
    <div className="agenda-month-grid">
      {Array.from({ length }, (_, index) => {
        const day = days[index - offset]
        if (!day) return <div className="agenda-cell is-outside" key={index} aria-hidden="true"/>
        const counts = itemCount(day.items)
        const shown = counts.habits
          ? [...day.items.filter(item => item.kind === 'task').slice(0, 2), ...day.items.filter(item => item.kind === 'habit')].slice(0, 3)
          : day.items.slice(0, 3)
        const remaining = day.items.length - shown.length
        return <div className="agenda-cell" key={day.key}>
          <button className="agenda-date" aria-current={day.key === today ? 'date' : undefined} aria-label={`${fullDate.format(day.date)} · ${counts.label}`} onClick={() => onOpenDay(day.date)}>
            <b>{day.date.getDate()}</b>
            <span className="agenda-month-counts" aria-hidden="true">
              {!!counts.tasks && <span>{counts.tasks}</span>}
              {!!counts.habits && <span className="agenda-month-habit-count"><Flame size={11}/>{counts.habits}</span>}
            </span>
          </button>
          <div className="agenda-month-tasks">
            {shown.map(item => <AgendaEvent key={item.id} item={item} onEdit={onEdit} onEditHabit={onEditHabit}/>)}
            {remaining > 0 && <button className="agenda-more" onClick={() => onOpenDay(day.date)}>+{remaining} {remaining === 1 ? 'item' : 'itens'}</button>}
          </div>
        </div>
      })}
    </div>
  </div>
}
