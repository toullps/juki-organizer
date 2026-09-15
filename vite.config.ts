import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function optionalTaskFields() {
  return {
    name: 'optional-task-fields',
    transform(code: string, id: string) {
      if (!id.endsWith('/src/app.tsx')) return null
      return code
        .replace(
          "if(!supabase||!session||!form.title?.trim())return;",
          "if(!supabase||!session)return;"
        )
        .replace(
          "title:form.title.trim(),",
          "title:form.title?.trim()||'sem título',"
        )
        .replace(
          "disabled={busy||!f.title.trim()}",
          "disabled={busy}"
        )
        .replace(
          "title:form.title.trim(),frequency:",
          "title:form.title?.trim()||'sem título',frequency:"
        )
    },
  }
}

export default defineConfig({
  plugins: [react(), optionalTaskFields()],
})
