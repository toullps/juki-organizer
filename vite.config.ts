import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function appIntegrations() {
  return {
    name: 'juki-app-integrations',
    transform(code: string, id: string) {
      const file = id.replace(/\\/g, '/')
      if (file.endsWith('/src/app.tsx')) {
        let out = "import { HabitsView } from './HabitsView'\nimport { Trash2 } from 'lucide-react'\n" + code
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
        out = out.replace(
          "async function toggleTask(t:Task){",
          "async function deleteTask(t:Task){if(!supabase||!session)return;if(!confirm(`Excluir a tarefa “${t.title}”? Esta ação não pode ser desfeita.`))return;const r=await supabase.from('tasks').delete().eq('id',t.id).eq('owner_id',session.user.id);if(r.error)setError(r.error.message);else{setModal(null);setEditing(null);await load()}}\n async function deleteHabit(h:Habit){if(!supabase||!session)return;if(!confirm(`Excluir o hábito “${h.name}”? Esta ação não pode ser desfeita.`))return;const r=await supabase.from('habits').update({active:false}).eq('id',h.id).eq('owner_id',session.user.id);if(r.error)setError(r.error.message);else{setModal(null);setEditingHabit(null);await load()}}\n async function toggleTask(t:Task){",
        )
        out = out.replace(
          "onSave={saveTask} onDelete={deleteTask} busy={busy}/>",
          "onSave={saveTask} onDelete={deleteTask} busy={busy}/>",
        )
        out = out.replace(
          "function TaskModal({task,projects,initialTitle,onClose,onSave,busy}",
          "function TaskModal({task,projects,initialTitle,onClose,onSave,onDelete,busy}",
        )
        out = out.replace(
          ":{task:Task|null;projects:Project[];initialTitle?:string;onClose:()=>void;onSave:(f:any)=>void;busy:boolean})",
          ":{task:Task|null;projects:Project[];initialTitle?:string;onClose:()=>void;onSave:(f:any)=>void;onDelete?:(t:Task)=>void;busy:boolean})",
        )
        out = out.replace(
          "<div className=\"task-modal-actions\">",
          "<div className=\"task-modal-actions\">{task&&onDelete&&<button type=\"button\" onClick={()=>onDelete(task)} style={{border:'1px solid #ead8dd',background:'#fff6f7',color:'#b45d70',borderRadius:12,padding:'11px 14px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,marginRight:'auto'}}><Trash2 size={15}/> excluir tarefa</button>}",
        )
        out = out.replace(
          "onSave={saveHabit} busy={busy}/>",
          "onSave={saveHabit} onDelete={deleteHabit} busy={busy}/>",
        )
        out = out.replace(
          "function HabitModal({habit,onClose,onSave,busy}",
          "function HabitModal({habit,onClose,onSave,onDelete,busy}",
        )
        out = out.replace(
          ":{habit:Habit|null;onClose:()=>void;onSave:(f:any)=>void;busy:boolean})",
          ":{habit:Habit|null;onClose:()=>void;onSave:(f:any)=>void;onDelete?:(h:Habit)=>void;busy:boolean})",
        )
        out = out.replace(
          "<div className=\"habit-modal-actions\">",
          "<div className=\"habit-modal-actions\">{habit&&onDelete&&<button type=\"button\" onClick={()=>onDelete(habit)} style={{border:'1px solid #ead8dd',background:'#fff6f7',color:'#b45d70',borderRadius:12,padding:'11px 14px',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6,marginRight:'auto'}}><Trash2 size={15}/> excluir hábito</button>}",
        )
        return out
      }
      if (file.endsWith('/src/HabitsView.tsx')) {
        let out = code
        out = out.replace(
          "setHabits(h.data||[]);setLogs(l.data||[])",
          "setHabits(h.data||[]);setLogs((l.data||[]).map(x=>{const hh=(h.data||[]).find(z=>z.id===x.habit_id);const unit=(hh?.unit||'').toLowerCase();if(['l','litro','litros'].includes(unit)&&x.value>Number(hh?.target||0))return {...x,value:x.value/1000,completed:x.value/1000>=Number(hh?.target||0)};return x}))",
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
