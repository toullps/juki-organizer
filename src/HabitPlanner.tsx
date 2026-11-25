import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Clock3, Flame, MoreHorizontal, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { addDays, isoDate, startWeek } from './calendarLayout'
import { habitFrequencyLabel, habitIncrement, habitOccursOn, habitWeekdays, type Habit, type HabitLog } from './habitSchedule'

type Props = {
  habits: Habit[]
  logs: HabitLog[]
  icons: Record<string, LucideIcon>
  onLog: (habit: Habit, value: number, completed?: boolean) => void
  onNew: () => void
  onEdit: (habit: Habit) => void
}

const longDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

export function HabitPlanner({ habits, logs, icons, onLog, onNew, onEdit }: Props) {
  const [date, setDate] = useState(() => new Date())
  const key = isoDate(date)
  const today = isoDate(new Date())
  const week = Array.from({ length: 7 }, (_, index) => addDays(startWeek(date), index))
  const todaysLogs = new Map(logs.filter(log => log.log_date === key).map(log => [log.habit_id, log]))
  const scheduled = habits.filter(habit => habitOccursOn(habit, date) || todaysLogs.has(habit.id))
  const timed = scheduled.filter(habit => habit.time).sort((a, b) => a.time!.localeCompare(b.time!))
  const flexible = scheduled.filter(habit => !habit.time)
  const other = habits.filter(habit => !scheduled.includes(habit))
  const completed = scheduled.filter(habit => todaysLogs.get(habit.id)?.completed).length

  function row(habit: Habit, enabled = key === today) {
    const log = todaysLogs.get(habit.id)
    const Icon = icons[habit.icon] ?? Flame
    const done = !!log?.completed
    const measurable = habit.tracking_type !== 'boolean'
    const value = log?.value ?? 0
    const increment = habitIncrement(habit)

    return <li className="habit-planner-row" key={habit.id}>
      <div className={`habit-icon ${habit.color}`}><Icon size={19} aria-hidden="true"/></div>
      <div className="habit-planner-copy">
        <b>{habit.name}</b>
        <small>{habit.time && <><Clock3 size={13} aria-hidden="true"/>{habit.time.slice(0, 5)} · </>}{habitFrequencyLabel(habit)}</small>
        {habit.description && <p>{habit.description}</p>}
        {measurable && <div className="habit-planner-measure">
          <progress value={Math.min(value, habit.target)} max={habit.target} aria-label={`Progresso de ${habit.name}`}/>
          <span>{value} / {habit.target} {habit.unit}</span>
        </div>}
      </div>
      <div className="habit-planner-row-actions">
        <button className="icon-button soft" aria-label={`Editar ${habit.name}`} onClick={() => onEdit(habit)}><MoreHorizontal size={18}/></button>
        {enabled && !measurable && <button className="habit-mark" aria-pressed={done} aria-label={`${done ? 'Desmarcar' : 'Concluir'} ${habit.name}`} onClick={() => onLog(habit, 0, !done)}><Check size={17}/></button>}
        {enabled && measurable && <button className="habit-mark" aria-label={`Registrar mais ${increment} ${habit.unit} em ${habit.name}`} onClick={() => onLog(habit, increment)}><Plus size={17}/></button>}
        {!enabled && done && <Check className="habit-recorded" size={17} role="img" aria-label="Concluído"/>}
      </div>
    </li>
  }

  const dayStats = (day: Date) => {
    const iso = isoDate(day)
    const planned = habits.filter(habit => habitOccursOn(habit, day)).length
    const doneCount = logs.filter(log => log.log_date === iso && log.completed).length
    return { planned, doneCount }
  }
  const pct = scheduled.length ? Math.round(completed / scheduled.length * 100) : 0

  return <section className="habit-planner" aria-label="Hábitos">
    <header className="page-head">
      <div><p className="eyebrow">hábitos</p><h1>{longDate.format(date)}</h1><p>{scheduled.length} {scheduled.length === 1 ? 'hábito previsto' : 'hábitos previstos'} · {completed} {completed === 1 ? 'concluído' : 'concluídos'}</p></div>
      <button className="primary" onClick={onNew}><Plus size={16}/> Novo hábito</button>
    </header>
    <div className="page-toolbar">
      <span className="toolbar-label">{shortDate.format(week[0])} – {shortDate.format(week[6])}</span>
      <div className="agenda-navigation" role="group" aria-label="Navegação da semana">
        <button className="icon-button soft" aria-label="Semana anterior" onClick={() => setDate(addDays(date, -7))}><ChevronLeft size={17}/></button>
        <button className="today-btn" onClick={() => setDate(new Date())}>Hoje</button>
        <button className="icon-button soft" aria-label="Próxima semana" onClick={() => setDate(addDays(date, 7))}><ChevronRight size={17}/></button>
      </div>
    </div>
    <div className="habit-planner-days" role="group" aria-label="Dias da semana">
      {week.map((day, index) => { const st = dayStats(day); return <button key={isoDate(day)} aria-pressed={isoDate(day) === key} aria-current={isoDate(day) === today ? 'date' : undefined} aria-label={longDate.format(day)} onClick={() => setDate(day)}>
        <span>{habitWeekdays[index]}</span><b>{day.getDate()}</b><small>{isoDate(day) > today ? <>{st.planned}<span className="hide-sm"> previstos</span></> : `${Math.min(st.doneCount, st.planned || st.doneCount)}/${st.planned}`}</small>
      </button> })}
    </div>
    <div className="habit-layout">
      <div className="habit-main">
        {!scheduled.length && <p className="habit-planner-empty">{habits.length ? 'Nenhum hábito previsto para este dia.' : 'Crie um hábito para começar a acompanhar sua rotina.'}</p>}
        {!!timed.length && <section className="habit-planner-group"><h2>Com horário</h2><ul>{timed.map(habit => row(habit))}</ul></section>}
        {!!flexible.length && <section className="habit-planner-group"><h2>Sem horário</h2><ul>{flexible.map(habit => row(habit))}</ul></section>}
      </div>
      <aside className="habit-side">
        <section className="panel habit-progress-card">
          <div className="section-title"><div><h2>progresso do dia</h2><p>{key === today ? 'hoje' : shortDate.format(date)}</p></div></div>
          <strong className="habit-big">{completed}<span>/{scheduled.length}</span></strong>
          <progress value={completed} max={Math.max(scheduled.length, 1)} aria-label="Hábitos concluídos"/>
          <p aria-live="polite">{pct}% dos hábitos previstos</p>
        </section>
        {!!other.length && <section className="panel soft habit-other">
          <div className="section-title"><div><h2>outros hábitos</h2><p>não previstos para este dia</p></div></div>
          <ul>{other.map(habit => row(habit, false))}</ul>
        </section>}
      </aside>
    </div>
  </section>
}
