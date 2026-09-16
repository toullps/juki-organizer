import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function optionalTaskFields() {
  return {
    name: 'optional-task-fields',
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/app.tsx')) return null
      return code
        .replace(/if\(!supabase\|\|!session\|\|!form\.title\?\.trim\(\)\)return;/g, 'if(!supabase||!session)return;')
        .replace(/title:form\.title\.trim\(\),/g, "title:form.title?.trim()||'sem título',")
        .replace(/disabled=\{busy\|\|!f\.title\.trim\(\)\}/g, 'disabled={busy}')
        .replace(/priority:form\.priority,/g, "priority:form.priority==='Alta'?'high':form.priority==='Baixa'?'low':'medium',")
        .replace(/priority:\s*form\.priority\b/g, "priority:form.priority==='Alta'?'high':form.priority==='Baixa'?'low':'medium'")
    },
  }
}

export default defineConfig({
  plugins: [react(), optionalTaskFields()],
})
