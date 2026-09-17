import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function appIntegrations() {
  return {
    name: 'juki-app-integrations',
    transform(code: string, id: string) {
      const file = id.replace(/\\/g, '/')
      if (file.endsWith('/src/app.tsx')) {
        let out = "import { HabitsView } from './HabitsView'\n" + code
        out = out.replace(
          "type View='Dashboard'|'Tarefas'|'Calendário'|'Projetos'|'Capturar'|'Páginas'|'Etiquetas'|'Metas'|'Templates'|'Configurações'",
          "type View='Dashboard'|'Tarefas'|'Hábitos'|'Calendário'|'Projetos'|'Capturar'|'Páginas'|'Etiquetas'|'Metas'|'Templates'|'Configurações'",
        )
        out = out.replace(
          "{view==='Calendário'&&<CalendarView date={calendarDate} setDate={setCalendarDate} tasks={visible} rules={rules} onToggle={toggle}/>}",
          "{view==='Hábitos'&&<HabitsView session={session}/>} {view==='Calendário'&&<CalendarView date={calendarDate} setDate={setCalendarDate} tasks={visible} rules={rules} onToggle={toggle}/>}",
        )
        out = out.replace(
          "[['Dashboard',<LayoutDashboard/>,'Dashboard'],['Tarefas',<Inbox/>,'Tarefas'],['Calendário',<CalendarDays/>,'Calendário']",
          "[['Dashboard',<LayoutDashboard/>,'Dashboard'],['Tarefas',<Inbox/>,'Tarefas'],['Hábitos',<Check/>,'Hábitos'],['Calendário',<CalendarDays/>,'Calendário']",
        )
        out = out.replace(
          "<button onClick={()=>setView('Calendário')} className={view==='Calendário'?'active':''}><CalendarDays/><span>calendário</span></button>",
          "<button onClick={()=>setView('Hábitos')} className={view==='Hábitos'?'active':''}><Check/><span>hábitos</span></button><button onClick={()=>setView('Calendário')} className={view==='Calendário'?'active':''}><CalendarDays/><span>calendário</span></button>",
        )
        return out
      }
      if (file.endsWith('/src/HabitsView.tsx')) {
        let out = code
        out = out.replace(
          "setHabits(h.data||[]);setLogs(l.data||[])",
          "setHabits(h.data||[]);setLogs((l.data||[]).map(x=>{const hh=(h.data||[]).find(z=>z.id===x.habit_id);const unit=(hh?.unit||'').toLowerCase();const isMeasured=['quantity','duration','count'].includes(hh?.tracking_type);let value=Number(x.value)||0;if(['l','litro','litros'].includes(unit)&&value>Number(hh?.target||0))value=value/1000;return {...x,value,completed:isMeasured?value>=Number(hh?.target||0):x.completed}}))",
        )
        out = out.replace(
          "const payload={owner_id:session.user.id,habit_id:h.id,log_date:day,value:next,completed:next>=h.target};",
          "const unit=h.unit.toLowerCase();const normalized=(['l','litro','litros'].includes(unit)&&next>=10)?next/1000:next;const payload={owner_id:session.user.id,habit_id:h.id,log_date:day,value:normalized,completed:normalized>=h.target};",
        )
        out = out.replace(
          "`${value} / ${h.target} ${h.unit}`",
          "`${h.unit.toLowerCase()==='l'&&value<1?`${Math.round(value*1000)} ml`:value} / ${h.target} ${h.unit}`",
        )
        return out
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [react(), appIntegrations()],
})
