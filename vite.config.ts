import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function appFixes() {
  return {
    name: 'juki-app-fixes',
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/app.tsx')) return null
      let out = code
      out = "import RecurringCalendarView from './RecurringCalendarView'\n" + out
      out = out.replace(
        /\{view==='Calendário'&&<CalendarView date=\{calendarDate\} setDate=\{setCalendarDate\} tasks=\{visible\} onToggle=\{toggle\}\/\}\}/,
        "{view==='Calendário'&&<RecurringCalendarView date={calendarDate} setDate={setCalendarDate} tasks={visible} onToggle={toggle} rules={rules}/>}",
      )
      out = out.replace(/if\(!supabase\|\|!session\|\|!form\.title\?\.trim\(\)\)return;/g, 'if(!supabase||!session)return;')
      out = out.replace(/title:form\.title\.trim\(\),/g, "title:form.title?.trim()||'sem título',")
      out = out.replace(/disabled=\{busy\|\|!f\.title\.trim\(\)\}/g, 'disabled={busy}')
      out = out.replace(/priority:form\.priority,/g, "priority:form.priority==='Alta'?'high':form.priority==='Baixa'?'low':'medium',")
      out = out.replace(/priority:\s*form\.priority\b/g, "priority:form.priority==='Alta'?'high':form.priority==='Baixa'?'low':'medium'")
      out = out.replace(/priority:t\.priority,/g, "priority:t.priority==='Alta'?'high':t.priority==='Baixa'?'low':'medium',")
      return out
    },
  }
}

export default defineConfig({
  plugins: [react(), appFixes()],
})
