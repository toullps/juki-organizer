import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, Repeat2 } from 'lucide-react'
import type { Rule, Task } from './app'
import { addDays, calendarLayout, isoDate, moveMonth, startWeek } from './calendarLayout'
import { timeRange } from './taskTime'

type Mode = 'day' | 'week' | 'month'
type AgendaItem = { task: Task; projected?: boolean }
type AgendaProps = {
  date: Date
  setDate: (date: Date) => void
  tasks: Task[]
  rules: Rule[]
  onEdit: (task: Task) => void
  onNew: (date: string) => void
}

const views = { day: 'Dia', week: 'Semana', month: 'Mês' } as const
const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const fullDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const minutesPerDay = 1440
const utcDay = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())

function matchesRule(rule: Rule, day: Date, key: string) {
  if (!rule.active || !rule.start_date || key < rule.start_date || (rule.end_date && key > rule.end_date)) return false
  const start = new Date(`${rule.start_date}T12:00:00`)
  const elapsed = (utcDay(day) - utcDay(start)) / 86400000
  const interval = Math.max(1, rule.interval_value)

  if (rule.weekdays?.includes(day.getDay())) return true
  switch (rule.frequency) {
    case 'days': return elapsed % interval === 0
    case 'weeks': return elapsed % (7 * interval) === 0
    case 'months': return day.getDate() === (rule.day_of_month || start.getDate())
    case 'years': return day.getMonth() === start.getMonth() && day.getDate() === start.getDate()
    default: return false
  }
}

function itemsByDay(days: Date[], tasks: Task[], rules: Rule[]) {
  const scheduled = new Map<string, Task[]>()
  for (const task of tasks) {
    if (!task.due_date) continue
    const onDate = scheduled.get(task.due_date) ?? []
    onDate.push(task)
    scheduled.set(task.due_date, onDate)
  }

  return days.map(date => {
    const key = isoDate(date)
    const saved = scheduled.get(key) ?? []
    const items: AgendaItem[] = saved.map(task => ({ task }))
    for (const rule of rules) {
      if (!matchesRule(rule, date, key) || saved.some(task => task.recurrence_rule_id === rule.id)) continue
      const template = tasks.find(task => task.recurrence_rule_id === rule.id)
        ?? tasks.find(task => task.title === rule.title)
      if (template) {
        items.push({ task: { ...template, id: `virtual-${rule.id}-${key}`, due_date: key }, projected: true })
      }
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

export function CalendarAgenda({ date, setDate, tasks, rules, onEdit, onNew }: AgendaProps) {
  const [mode, setMode] = useState<Mode>(() => window.matchMedia('(max-width: 720px)').matches ? 'day' : 'week')
  const days = useMemo(() => itemsByDay(visibleDates(date, mode), tasks, rules), [date, mode, tasks, rules])
  const today = isoDate(new Date())
  const total = days.reduce((count, day) => count + day.items.length, 0)
  const hasForecast = days.some(day => day.items.some(item => item.projected))
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
        <span aria-live="polite">{range && `${range} · `}{total} {total === 1 ? 'tarefa' : 'tarefas'}</span>
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
      ? <MonthAgenda days={days} today={today} onOpenDay={openDay} onEdit={onEdit}/>
      : <TimelineAgenda key={`${mode}-${days[0].key}`} mode={mode} days={days} today={today} onOpenDay={openDay} onEdit={onEdit}/>}
    {hasForecast && <p className="agenda-forecast"><Repeat2 size={15}/> Previsões de tarefas recorrentes aparecem com contorno tracejado.</p>}
  </section>
}

function AgendaTask({ item, onEdit, className = '', style }: {
  item: AgendaItem
  onEdit: AgendaProps['onEdit']
  className?: string
  style?: React.CSSProperties
}) {
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

function TimelineAgenda({ mode, days, today, onOpenDay, onEdit }: {
  mode: 'day' | 'week'
  days: AgendaDay[]
  today: string
  onOpenDay: (day: Date) => void
  onEdit: AgendaProps['onEdit']
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const initialScroll = useRef<number | null>(null)
  const schedules = days.map(day => ({
    ...day,
    timed: calendarLayout(day.items.map(item => ({ ...item, due_time: item.task.due_time, estimated_minutes: item.task.estimated_minutes }))),
    flexible: day.items.filter(item => !item.task.due_time),
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
          {day.flexible.map(item => <AgendaTask key={item.task.id} item={item} onEdit={onEdit}/>)}
          {!day.flexible.length && mode === 'day' && <span className="agenda-flexible-empty">Nenhuma tarefa sem horário</span>}
        </div>)}
      </div>
      <div className="agenda-hours agenda-columns" ref={body}>
        <div className="agenda-gutter agenda-hour-labels" aria-hidden="true">
          {Array.from({ length: 24 }, (_, hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}
        </div>
        {schedules.map(day => <div className="agenda-hour-column" key={day.key}>
          {day.timed.map(({ task: item, start, end, column, columns }) => <AgendaTask
            key={item.task.id}
            item={item}
            onEdit={onEdit}
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

function MonthAgenda({ days, today, onOpenDay, onEdit }: {
  days: AgendaDay[]
  today: string
  onOpenDay: (day: Date) => void
  onEdit: AgendaProps['onEdit']
}) {
  const offset = (days[0].date.getDay() + 6) % 7
  const length = Math.ceil((offset + days.length) / 7) * 7
  return <div className="agenda-month">
    <div className="agenda-weekdays">{weekdays.map(name => <span key={name}>{name}</span>)}</div>
    <div className="agenda-month-grid">
      {Array.from({ length }, (_, index) => {
        const day = days[index - offset]
        if (!day) return <div className="agenda-cell is-outside" key={index} aria-hidden="true"/>
        const count = day.items.length
        return <div className="agenda-cell" key={day.key}>
          <button className="agenda-date" aria-current={day.key === today ? 'date' : undefined} aria-label={`${fullDate.format(day.date)} · ${count} ${count === 1 ? 'tarefa' : 'tarefas'}`} onClick={() => onOpenDay(day.date)}>
            <b>{day.date.getDate()}</b>
            {!!count && <span className="agenda-month-count" aria-hidden="true">{count}</span>}
          </button>
          <div className="agenda-month-tasks">
            {day.items.slice(0, 3).map(item => <AgendaTask key={item.task.id} item={item} onEdit={onEdit}/>)}
            {count > 3 && <button className="agenda-more" onClick={() => onOpenDay(day.date)}>+{count - 3} {count === 4 ? 'tarefa' : 'tarefas'}</button>}
          </div>
        </div>
      })}
    </div>
  </div>
}
