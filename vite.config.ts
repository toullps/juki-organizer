import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function calendarIntegration() {
  return {
    name: 'juki-calendar-integration',
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/app.tsx')) return null
      let out = "import RecurringCalendarView from './RecurringCalendarView'\n" + code
      out = out.replace(
        /\{view==='Calendário'&&<CalendarView date=\{calendarDate\} setDate=\{setCalendarDate\} tasks=\{visible\} rules=\{rules\} onToggle=\{toggle\}\/\}\}/,
        "{view==='Calendário'&&<RecurringCalendarView date={calendarDate} setDate={setCalendarDate} tasks={visible} onToggle={toggle} rules={rules}/>}",
      )
      return out
    },
  }
}

export default defineConfig({
  plugins: [react(), calendarIntegration()],
})
