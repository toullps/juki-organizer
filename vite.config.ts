import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function appIntegrations() {
  return {
    name: 'juki-app-integrations',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      const file = id.replace(/\\/g, '/')
      if (file.endsWith('/src/HabitsView.tsx')) {
        let out = code
        out = out.replace("<HabitModal habit={editing} onClose={()=>setShowModal(false)} onSaved=", "<HabitModal habit={editing} onDelete={remove} onClose={()=>setShowModal(false)} onSaved=")
        out = out.replace("function HabitModal({habit,onClose,onSaved,session}:{habit:Habit|null;onClose:()=>void;onSaved:()=>void;session:any})", "function HabitModal({habit,onDelete,onClose,onSaved,session}:{habit:Habit|null;onDelete?:(h:Habit)=>void;onClose:()=>void;onSaved:()=>void;session:any})")
        out = out.replace(/<button className=["']habit-primary["']/g, "{habit&&onDelete&&<button className=\"habit-delete\" type=\"button\" onClick={()=>onDelete(habit)}><Trash2 size={15}/> excluir hábito</button>}<button className=\"habit-primary\"")
        out = out.replace(/\.habit-primary\{border:0;background:#292529;color:#fff;border-radius:12px;padding:11px 16px;cursor:pointer\}/, ".habit-primary{border:0;background:#292529;color:#fff;border-radius:12px;padding:11px 16px;cursor:pointer}.habit-delete{border:1px solid #ead8dd;background:#fff6f7;color:#b45d70;border-radius:12px;padding:11px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}")
        return out
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [react(), appIntegrations()],
})
