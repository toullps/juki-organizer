import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function appIntegrations() {
  return {
    name: 'juki-app-integrations',
    transform(code: string, id: string) {
      const file = id.replace(/\\/g, '/')
      if (file.endsWith('/src/app.tsx')) {
        let out = "import { Trash2 } from 'lucide-react'\n" + code
        out = out.replace("async function toggleTask(t:Task){", "async function deleteTask(t:Task){if(!supabase||!session)return;if(!confirm(`Excluir a tarefa “${t.title}”? Esta ação não pode ser desfeita.`))return;const r=await supabase.from('tasks').delete().eq('id',t.id).eq('owner_id',session.user.id);if(r.error)setError(r.error.message);else{setModal(null);setEditing(null);await load()}}\n async function toggleTask(t:Task){")
        out = out.replace("<TaskModal task={editing} projects={projects} initialTitle={draft} onClose=", "<TaskModal task={editing} projects={projects} initialTitle={draft} onDelete={deleteTask} onClose=")
        out = out.replace("<HabitModal habit={editingHabit} onClose=", "<HabitModal habit={editingHabit} onDelete={deleteHabit} onClose=")
        out = out.replace("function TaskModal({task,projects,initialTitle,onClose,onSave,busy}:{task:Task|null;projects:Project[];initialTitle:string;onClose:()=>void;onSave:(f:any)=>void;busy:boolean})", "function TaskModal({task,projects,initialTitle,onDelete,onClose,onSave,busy}:{task:Task|null;projects:Project[];initialTitle:string;onDelete?:(t:Task)=>void;onClose:()=>void;onSave:(f:any)=>void;busy:boolean})")
        out = out.replace("<button className=\"primary full\" disabled={busy} onClick={()=>onSave(f)}>{busy?'salvando...':'salvar tarefa'}</button></Modal>}", "<div className=\"task-modal-actions\">{task&&onDelete&&<button type=\"button\" onClick={()=>onDelete(task)} style={{border:'1px solid #ead8dd',background:'#fff6f7',color:'#b45d70',borderRadius:12,padding:'11px 14px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,marginBottom:10}}><Trash2 size={15}/> excluir tarefa</button>}<button className=\"primary full\" disabled={busy} onClick={()=>onSave(f)}>{busy?'salvando...':'salvar tarefa'}</button></div></Modal>}")
        out = out.replace("function HabitModal({habit,onClose,onSave,busy}:{habit:Habit|null;onClose:()=>void;onSave:(f:any)=>void;busy:boolean})", "function HabitModal({habit,onDelete,onClose,onSave,busy}:{habit:Habit|null;onDelete?:(h:Habit)=>void;onClose:()=>void;onSave:(f:any)=>void;busy:boolean})")
        out = out.replace("<button className=\"primary full\" disabled={busy} onClick={()=>onSave(f)}>{busy?'salvando...':'salvar hábito'}</button></Modal>}", "<div className=\"habit-modal-actions\">{habit&&onDelete&&<button type=\"button\" onClick={()=>onDelete(habit)} style={{border:'1px solid #ead8dd',background:'#fff6f7',color:'#b45d70',borderRadius:12,padding:'11px 14px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,marginBottom:10}}><Trash2 size={15}/> excluir hábito</button>}<button className=\"primary full\" disabled={busy} onClick={()=>onSave(f)}>{busy?'salvando...':'salvar hábito'}</button></div></Modal>}")
        return out
      }
      if (file.endsWith('/src/HabitsView.tsx')) {
        let out = code
        out = out.replace("<HabitModal habit={editing} onClose={()=>setShowModal(false)} onSaved=", "<HabitModal habit={editing} onDelete={remove} onClose={()=>setShowModal(false)} onSaved=")
        out = out.replace("function HabitModal({habit,onClose,onSaved,session}:{habit:Habit|null;onClose:()=>void;onSaved:()=>void;session:any})", "function HabitModal({habit,onDelete,onClose,onSaved,session}:{habit:Habit|null;onDelete?:(h:Habit)=>void;onClose:()=>void;onSaved:()=>void;session:any})")
        out = out.replace("<button className=\"habit-primary\" type=\"button\" onClick={save}>", "{habit&&onDelete&&<button className=\"habit-delete\" type=\"button\" onClick={()=>onDelete(habit)}><Trash2 size={15}/> excluir hábito</button>}<button className=\"habit-primary\" type=\"button\" onClick={save}>")
        out = out.replace(".habit-primary{border:0;background:#292529;color:#fff;border-radius:12px;padding:11px 16px;cursor:pointer}", ".habit-primary{border:0;background:#292529;color:#fff;border-radius:12px;padding:11px 16px;cursor:pointer}.habit-delete{border:1px solid #ead8dd;background:#fff6f7;color:#b45d70;border-radius:12px;padding:11px 14px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}")
        return out
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [react(), appIntegrations()],
})
