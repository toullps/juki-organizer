import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function appIntegrations() {
  return {
    name: 'juki-app-integrations',
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/app.tsx')) return null
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
    },
  }
}

export default defineConfig({
  plugins: [react(), appIntegrations()],
})
