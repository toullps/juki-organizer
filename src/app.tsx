import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, Check, CirclePlus, Clock3, Folder, Inbox, LayoutDashboard, Loader2, LogOut, Plus, Search, Settings2, Trash2, X, Repeat2, Target, ListChecks, Flame, Droplets, BookOpen, Dumbbell, Utensils, Home, Briefcase, GraduationCap, Heart, ShoppingCart, StickyNote, Timer, MoreHorizontal, Wallet, NotebookPen } from 'lucide-react'
import { supabase } from './supabase'
import { FinanceView } from './FinanceView'
import { NotesView } from './NotesView'
import './styles.css'
import './editorial.css'
import { TasksView } from './TasksView'
import './tasks.css'
import { endTime, timeRange, timePayload } from './taskTime'
import { addDays, isoDate } from './calendarLayout'
import { CalendarAgenda } from './CalendarAgenda'
import { HabitPlanner } from './HabitPlanner'
import { habitFrequencyLabel, habitIncrement, habitOccursOn, habitWeekdays, scheduledWeekdays, weekdayIndex, type Habit, type HabitLog } from './habitSchedule'
import { Appearance, readAccent, type Accent } from './Appearance'
import { frequencies, isFrequency, nextRecurrence, upcomingDates, type Frequency } from './recurrence'

export type Project={id:string;name:string;color:string;description?:string|null}
export type Task={id:string;title:string;description?:string|null;project_id:string|null;project?:Project|null;priority:string;status:string;completed_at:string|null;due_date:string|null;due_time:string|null;estimated_minutes?:number|null;recurrence_rule_id?:string|null;archived_at?:string|null}
export type Rule={id:string;title:string;frequency:string;interval_value:number;weekdays:number[];day_of_month:number|null;time_of_day:string|null;anchor_mode:string;active:boolean;start_date:string|null;end_date:string|null}
type View='Dashboard'|'Tarefas'|'Hábitos'|'Calendário'|'Projetos'|'Capturar'|'Finanças'|'Caderno'
const today=()=>isoDate(new Date())
const priorityDb=(v:string)=>v==='Alta'?'high':v==='Baixa'?'low':'medium'
const priorityUi=(v:string)=>v==='high'?'Alta':v==='low'?'Baixa':'Média'
const dateLong=(d:string)=>new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})
const timeText=(t?:string|null)=>t?t.slice(0,5):''
const icons:Record<string, typeof Flame>={water:Droplets,read:BookOpen,exercise:Dumbbell,meal:Utensils,home:Home,work:Briefcase,study:GraduationCap,personal:Heart,shopping:ShoppingCart,other:Flame}

function App(){
 const [taskDate,setTaskDate]=useState('')
 const [previewAccent,setPreviewAccent]=useState<Accent|null>(null)
 const [session,setSession]=useState<any>(null),[loading,setLoading]=useState(true),[view,setView]=useState<View>('Dashboard'),[tasks,setTasks]=useState<Task[]>([]),[projects,setProjects]=useState<Project[]>([]),[rules,setRules]=useState<Rule[]>([]),[habits,setHabits]=useState<Habit[]>([]),[logs,setLogs]=useState<HabitLog[]>([]),[search,setSearch]=useState(''),[calendarDate,setCalendarDate]=useState(new Date()),[modal,setModal]=useState<'task'|'habit'|'project'|'appearance'|null>(null),[editing,setEditing]=useState<Task|null>(null),[editingHabit,setEditingHabit]=useState<Habit|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[authMode,setAuthMode]=useState<'login'|'signup'>('login')
 useEffect(()=>{if(!supabase){setLoading(false);return}supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)}).catch(()=>setLoading(false));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[])
 useEffect(()=>{if(session)load()},[session])
 async function load(){if(!supabase||!session)return;setError('');try{const [p,t,r,h,l]=await Promise.all([supabase.from('projects').select('*').order('created_at',{ascending:true}),supabase.from('tasks').select('*, project:projects(*)').order('due_date',{ascending:true,nullsFirst:false}).order('due_time',{ascending:true,nullsFirst:false}),supabase.from('recurrence_rules').select('*').order('created_at',{ascending:false}),supabase.from('habits').select('*').eq('active',true).order('created_at',{ascending:true}),supabase.from('habit_logs').select('*').order('log_date',{ascending:false})]);if(p.error||t.error){setError(p.error?.message||t.error?.message||'Não foi possível carregar os dados.');return}setProjects(p.data||[]);setTasks(t.data||[]);if(!r.error)setRules(r.data||[]);if(!h.error)setHabits(h.data||[]);if(!l.error)setLogs(l.data||[])}catch(e){setError('Não foi possível carregar os dados. Verifique o Supabase.')}}
 async function auth(email:string,password:string){if(!supabase)return;setBusy(true);const r=authMode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});setBusy(false);if(r.error)setError(r.error.message)}
 async function saveAccent(accent: Accent) {
  if (!supabase || !session) return 'Entre na sua conta para salvar a aparência.'
  const result = await supabase.auth.updateUser({ data: { juki_accent: accent } })
  if (result.error) return 'Não foi possível salvar a aparência. Tente novamente.'
  setSession((current: typeof session) => current?.user.id === result.data.user.id
    ? { ...current, user: result.data.user } : current)
  setPreviewAccent(null)
  setModal(current => current === 'appearance' ? null : current)
  return null
 }
 async function deleteTask(task: Task) {
  if (!supabase || !session || !confirm(`Excluir a tarefa “${task.title}”? Esta ação não pode ser desfeita.`)) return
  const result = await supabase.from('tasks').delete().eq('id', task.id).eq('owner_id', session.user.id)
  if (result.error) { setError(result.error.message); return }
  closeTask()
  await load()
 }
 function closeTask() {
  setModal(null)
  setEditing(null)
  setDraft('')
  setTaskDate('')
 }
 async function toggleTask(task: Task) {
  if (!supabase || !session) return
  const owner = session.user.id
  const done = task.status !== 'done'
  const completedAt = done ? new Date().toISOString() : null
  const result = await supabase.from('tasks')
    .update({ status: done ? 'done' : 'todo', completed_at: completedAt })
    .eq('id', task.id).eq('owner_id', owner).eq('status', task.status)
    .select('id').maybeSingle()
  if (result.error) { setError(result.error.message); return }
  const rule = rules.find(item => item.id === task.recurrence_rule_id)
  const failure = done && result.data && rule ? await generateNext(task, rule) : null
  if (failure && completedAt) {
    const rollback = await supabase.from('tasks').update({ status: task.status, completed_at: task.completed_at })
      .eq('id', task.id).eq('owner_id', owner).eq('completed_at', completedAt)
    await load()
    setError(rollback.error ? 'Não foi possível criar a próxima ocorrência. Confira o estado da tarefa.' : failure)
    return
  }
  await load()
 }
 async function generateNext(task: Task, rule: Rule) {
  if (!supabase || !session || !task.due_date || rule.anchor_mode === 'completion') return null
  const next = nextRecurrence({ ...rule, start_date: rule.start_date || task.due_date }, task.due_date)
  if (!next) return null
  const owner = session.user.id
  const existing = await supabase.from('tasks').select('id').eq('owner_id', owner)
    .eq('recurrence_rule_id', rule.id).eq('due_date', next).limit(1)
  if (existing.error) return 'Não foi possível conferir a próxima ocorrência. Tente novamente.'
  if (existing.data?.length) return null
  const result = await supabase.from('tasks').insert({
    owner_id: owner, title: task.title, description: task.description || null,
    project_id: task.project_id, status: 'todo', priority: task.priority,
    due_date: next, due_time: task.due_time || null, recurrence_rule_id: rule.id,
    estimated_minutes: task.estimated_minutes || null,
  })
  return result.error ? 'Não foi possível criar a próxima ocorrência. Tente novamente.' : null
 }
 async function saveTask(form: TaskDraft): Promise<string|null> {
  if (!supabase || !session) return 'Entre na sua conta para salvar a tarefa.'
  const validation = validateTaskDraft(form)
  if (validation) return validation

  const owner = session.user.id
  const title = form.title.trim() || 'sem título'
  const existingRule = rules.find(rule => rule.id === editing?.recurrence_rule_id)
  if (editing?.recurrence_rule_id && !existingRule) return 'Não foi possível carregar a repetição desta tarefa. Reabra a página e tente novamente.'
  let createdRuleId: string | null = null
  let rule = existingRule
  const recurrence = recurrenceFromDraft(form, existingRule)
  const recurrenceChanged = existingRule && (
    existingRule.active !== form.recurring || (form.recurring && (
      existingRule.frequency !== recurrence.frequency
      || existingRule.interval_value !== recurrence.interval_value
      || existingRule.end_date !== recurrence.end_date
    ))
  )

  setBusy(true)
  try {
    if (form.recurring && !existingRule) {
      const result = await supabase.from('recurrence_rules').insert({
        ...recurrence, owner_id: owner, title, anchor_mode: 'schedule', time_of_day: form.time || null,
      }).select().single()
      if (result.error) return result.error.message
      rule = result.data
      createdRuleId = result.data.id
    }

    const payload = {
      owner_id: owner, title, description: form.description || null,
      project_id: form.project || null, status: form.status, priority: priorityDb(form.priority),
      due_date: form.due || null, ...timePayload(form.due, form.time, form.endTime),
      recurrence_rule_id: rule?.id ?? null,
      completed_at: form.status === 'done' ? editing?.completed_at ?? new Date().toISOString() : null,
    }
    const query = editing
      ? supabase.from('tasks').update(payload).eq('id', editing.id).eq('owner_id', owner)
      : supabase.from('tasks').insert(payload)
    const result = await query.select().single()
    if (result.error) {
      if (createdRuleId) await supabase.from('recurrence_rules').delete().eq('id', createdRuleId).eq('owner_id', owner)
      return result.error.message
    }

    if (recurrenceChanged && existingRule) {
      const updates = form.recurring ? recurrence : { active: false }
      const update = await supabase.from('recurrence_rules').update(updates)
        .eq('id', existingRule.id).eq('owner_id', owner).select().single()
      if (update.error) {
        await load()
        return 'A tarefa foi salva, mas a repetição não foi atualizada. Tente salvar novamente.'
      }
      rule = update.data
    }

    const failure = form.status === 'done' && rule && (editing?.status !== 'done' || recurrenceChanged)
      ? await generateNext(result.data, rule) : null
    if (failure) {
      if (editing) {
        await load()
        return failure
      }
      closeTask()
      await load()
      setError(failure)
      return null
    }

    closeTask()
    await load()
    return null
  } catch {
    return 'Não foi possível salvar a tarefa. Confira sua conexão e tente novamente.'
  } finally {
    setBusy(false)
  }
 }
 async function deleteHabit(habit: Habit) {
  if (!supabase || !session || !confirm(`Excluir o hábito “${habit.name}”?`)) return
  const result = await supabase.from('habits').update({ active: false })
    .eq('id', habit.id).eq('owner_id', session.user.id)
  if (result.error) { setError(result.error.message); return }
  setModal(null)
  setEditingHabit(null)
  await load()
 }
 async function saveHabit(f:any){if(!supabase||!session)return;setBusy(true);const payload={owner_id:session.user.id,name:f.name?.trim()||'hábito sem título',description:f.description||null,icon:f.icon||'other',tracking_type:f.trackingType||'boolean',target:Number(f.target)||1,unit:f.unit||'vez',frequency:f.frequency||'daily',weekdays:f.frequency==='weekly'?f.weekdays:[],time:f.time||null,color:f.color||'pink',active:true};const r=editingHabit?await supabase.from('habits').update(payload).eq('id',editingHabit.id).eq('owner_id',session.user.id):await supabase.from('habits').insert(payload);if(r.error)setError(r.error.message);else{setModal(null);setEditingHabit(null);await load()}setBusy(false)}
 async function logHabit(h:Habit,value:number,completed?:boolean){if(!supabase||!session)return;const date=today();const existing=logs.find(x=>x.habit_id===h.id&&x.log_date===date);const nextValue=h.tracking_type==='boolean'?(completed?1:0):Math.max(0,(existing?.value||0)+value);const done=h.tracking_type==='boolean'?!!completed:nextValue>=h.target;const r=await supabase.from('habit_logs').upsert({...(existing?{id:existing.id}:{}),owner_id:session.user.id,habit_id:h.id,log_date:date,value:nextValue,completed:done,updated_at:new Date().toISOString()},{onConflict:'habit_id,log_date'});if(r.error)setError(r.error.message);else await load()}
 async function addProject(name:string,color:string){if(!supabase||!session)return;setBusy(true);const r=await supabase.from('projects').insert({owner_id:session.user.id,name:name.trim()||'novo projeto',color});if(r.error)setError(r.error.message);else{setModal(null);await load()}setBusy(false)}
 const visible=useMemo(()=>tasks.filter(t=>!t.archived_at&&(!search||`${t.title} ${t.description||''} ${t.project?.name||''}`.toLowerCase().includes(search.toLowerCase()))),[tasks,search])
 const todayTasks=visible.filter(t=>t.due_date===today()),open=todayTasks.filter(t=>t.status!=='done'),overdue=visible.filter(t=>t.status!=='done'&&t.due_date&&t.due_date<today())
 if(loading)return <div className="loading-screen"><Loader2 className="spin"/> carregando...</div>
 if(!supabase)return <AuthScreen mode={authMode} setMode={setAuthMode} onAuth={auth} busy={busy} error="Supabase não está configurado."/>
 if(!session)return <AuthScreen mode={authMode} setMode={setAuthMode} onAuth={auth} busy={busy} error={error}/>
 const selectedAccent=readAccent(session.user.user_metadata?.juki_accent)
 const openAppearance=()=>setModal('appearance')
 return <div className="app-shell" data-juki-accent={previewAccent ?? selectedAccent}><Sidebar view={view} setView={setView} onAppearance={openAppearance} logout={()=>supabase?.auth.signOut()}/><main className="main"><header className="topbar"><div className="mobile-logo">juki<span>°</span></div><div className="search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="buscar na sua vida..."/></div><div className="top-actions"><button className="icon-button" onClick={()=>setModal('habit')} title="novo hábito"><CirclePlus size={19}/></button><button className="avatar appearance-trigger" aria-label="Configurações de aparência" onClick={openAppearance}>{session.user.email?.[0]?.toUpperCase()}</button></div></header><section className="content">{error&&<div className="error-banner">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
 {view==='Dashboard'&&<Dashboard date={today()} tasks={open} overdue={overdue} habits={habits.filter(habit=>habitOccursOn(habit,new Date()))} logs={logs} projects={projects} onTask={toggleTask} onHabit={logHabit} onNewTask={()=>{setEditing(null);setModal('task')}} onNewHabit={()=>{setEditingHabit(null);setModal('habit')}}/>}
 {view==='Tarefas'&&<TasksView projects={projects} onNewCategory={()=>setModal('project')} tasks={visible} onToggle={toggleTask} onEdit={t=>{setEditing(t);setModal('task')}} onNew={()=>{setEditing(null);setModal('task')}}/>}
 {view==='Hábitos'&&<HabitPlanner habits={habits} logs={logs} icons={icons} onLog={logHabit} onNew={()=>{setEditingHabit(null);setModal('habit')}} onEdit={h=>{setEditingHabit(h);setModal('habit')}}/>}
 {view==='Calendário'&&<CalendarAgenda
   date={calendarDate}
   setDate={setCalendarDate}
   tasks={visible}
   rules={rules}
   habits={habits}
   logs={logs}
   onEditHabit={habit=>{setEditingHabit(habit);setModal('habit')}}
   onEdit={task=>{setEditing(task);setModal('task')}}
   onNew={date=>{setDraft('');setEditing(null);setTaskDate(date);setModal('task')}}
 />}
 {view==='Finanças'&&<FinanceView userId={session.user.id}/>}
 {view==='Caderno'&&<NotesView userId={session.user.id}/>}
 {view==='Projetos'&&<ProjectsPage projects={projects} tasks={tasks} onNew={()=>setModal('project')}/>} 
 {view==='Capturar'&&<Capture onSave={async text=>{setEditing(null);setModal('task');setDraft(text)}}/>}
 </section></main><nav className="mobile-nav"><button onClick={()=>setView('Dashboard')} className={view==='Dashboard'?'active':''}><LayoutDashboard/><span>início</span></button><button onClick={()=>setView('Tarefas')} className={view==='Tarefas'?'active':''}><Inbox/><span>tarefas</span></button><button onClick={()=>setView('Hábitos')} className={view==='Hábitos'?'active':''}><Flame/><span>hábitos</span></button><button onClick={()=>setView('Calendário')} className={view==='Calendário'?'active':''}><CalendarDays/><span>agenda</span></button><button onClick={()=>setView('Finanças')} className={view==='Finanças'?'active':''}><Wallet/><span>finanças</span></button><button onClick={()=>setView('Caderno')} className={view==='Caderno'?'active':''}><NotebookPen/><span>caderno</span></button><button onClick={()=>{setEditing(null);setModal('task')}}><Plus/><span>novo</span></button></nav>
 {modal==='task'&&<TaskModal task={editing} rule={rules.find(rule=>rule.id===editing?.recurrence_rule_id)} projects={projects}
   initialTitle={draft} initialDate={taskDate} onClose={()=>{if(!busy)closeTask()}} onDelete={deleteTask} onSave={saveTask} busy={busy}/>
 } {modal==='appearance'&&<Modal title="Configurações de aparência" onClose={()=>{setPreviewAccent(null);setModal(null)}}>
   <Appearance selected={selectedAccent} onPreview={setPreviewAccent} onSave={saveAccent}/>
 </Modal>} {modal==='habit'&&<HabitModal habit={editingHabit} onDelete={deleteHabit} onClose={()=>{setModal(null);setEditingHabit(null)}} onSave={saveHabit} busy={busy}/>} {modal==='project'&&<ProjectModal onClose={()=>setModal(null)} onSave={addProject} busy={busy}/>}</div>
}
let draft='';const setDraft=(v:string)=>{draft=v}
function AuthScreen({mode,setMode,onAuth,busy,error}:{mode:'login'|'signup';setMode:(m:'login'|'signup')=>void;onAuth:(e:string,p:string)=>void;busy:boolean;error:string}){const [email,setEmail]=useState(''),[pass,setPass]=useState('');return <div className="auth-wrap"><div className="auth-card"><div className="brand-mark">juki<span>°</span></div><h1>{mode==='login'?'bem-vinda de volta':'crie seu espaço'}</h1><label>e-mail<input value={email} onChange={e=>setEmail(e.target.value)} type="email"/></label><label>senha<input value={pass} onChange={e=>setPass(e.target.value)} type="password"/></label>{error&&<div className="error-box">{error}</div>}<button className="primary full" disabled={busy} onClick={()=>onAuth(email,pass)}>{busy?'aguarde...':mode==='login'?'entrar':'criar conta'}</button><button className="link-button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'ainda não tenho uma conta':'já tenho uma conta'}</button></div></div>}
function Sidebar({view,setView,onAppearance,logout}:{view:View;setView:(v:View)=>void;onAppearance:()=>void;logout:()=>void}){const items:[View,any,string][]=[['Dashboard',<LayoutDashboard/>,'início'],['Tarefas',<Inbox/>,'tarefas'],['Hábitos',<Flame/>,'hábitos'],['Calendário',<CalendarDays/>,'calendário'],['Projetos',<Folder/>,'projetos'],['Finanças',<Wallet/>,'finanças'],['Caderno',<NotebookPen/>,'caderno'],['Capturar',<CirclePlus/>,'capturar']];return <aside className="sidebar"><div className="logo">juki<span>°</span></div><div className="sidebar-label">minha vida</div>{items.map(([v,i,l])=><button key={v} aria-label={l} title={l} className={`side-button ${view===v?'active':''}`} onClick={()=>setView(v)}>{i}<span>{l}</span></button>)}<div className="sidebar-bottom"><button className="side-button" aria-label="Configurações" title="Configurações" onClick={onAppearance}><Settings2/><span>configurações</span></button><button className="side-button" onClick={logout}><LogOut/><span>sair</span></button></div></aside>}
function Dashboard({date,tasks,overdue,habits,logs,projects,onTask,onHabit,onNewTask,onNewHabit}:{date:string;tasks:Task[];overdue:Task[];habits:Habit[];logs:HabitLog[];projects:Project[];onTask:(t:Task)=>void;onHabit:(h:Habit,v:number,c?:boolean)=>void;onNewTask:()=>void;onNewHabit:()=>void}){const done=habits.filter(h=>logs.find(l=>l.habit_id===h.id&&l.log_date===date)?.completed).length;const day=new Date(`${date}T12:00:00`);return <><div className="welcome"><div className="welcome-copy"><p className="eyebrow">seu espaço · hoje</p><h1>um dia de cada vez<span className="editorial-period">.</span></h1><p>{dateLong(date)}</p></div><div className="welcome-date" aria-label={day.toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}><span>{day.toLocaleDateString("pt-BR",{weekday:"long"})}</span><strong>{day.getDate()}</strong><span>{day.toLocaleDateString("pt-BR",{month:"long"})}</span></div><div className="hero-actions"><button className="ghost" onClick={onNewHabit}><Flame size={16}/> novo hábito</button><button className="primary" onClick={onNewTask}><Plus size={16}/> nova tarefa</button></div></div><div className="stats-grid"><Stat title="para hoje" value={tasks.length} tone="pink" icon={<Clock3/>}/><Stat title="hábitos" value={`${done}/${habits.length}`} tone="lavender" icon={<Flame/>}/><Stat title="atrasadas" value={overdue.length} tone="yellow" icon={<Repeat2/>}/><Stat title="projetos" value={projects.length} tone="sage" icon={<Folder/>}/></div><div className="home-grid"><section className="panel"><SectionTitle title="hoje" subtitle="suas próximas coisas" action="nova tarefa" onClick={onNewTask}/>{tasks.length?<div className="timeline">{tasks.slice(0,8).map(t=><TaskLine key={t.id} t={t} onToggle={()=>onTask(t)}/>)}</div>:<Empty text="nada marcado para hoje ♡"/>}</section><section className="panel"><SectionTitle title="hábitos de hoje" subtitle={`${done} de ${habits.length} concluídos`} action="ver hábitos" onClick={onNewHabit}/>{habits.slice(0,5).map(h=><HabitMini key={h.id} h={h} log={logs.find(l=>l.habit_id===h.id&&l.log_date===date)} onLog={onHabit}/>)}{!habits.length&&<Empty text="crie seu primeiro hábito"/>}</section><section className="panel wide"><SectionTitle title="próximos dias" subtitle="o que vem por aí"/><div className="upcoming">{[1,2,3].map(n=>{const d=isoDate(addDays(new Date(),n));const ts=(tasks as Task[]).filter(t=>t.due_date===d);return <div className="up-day" key={d}><b>{new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric'})}</b><span>{ts.length?ts[0].title:'dia tranquilo ♡'}</span></div>})}</div></section></div></>}
function Stat({title,value,tone,icon}:{title:string;value:any;tone:string;icon:any}){return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{title}</span>{icon}</div><strong>{value}</strong></div>}
function SectionTitle({title,subtitle,action,onClick}:{title:string;subtitle?:string;action?:string;onClick?:()=>void}){return <div className="section-title"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action&&<button className="text-button" onClick={onClick}>{action} →</button>}</div>}
function TaskLine({t,onToggle}:{t:Task;onToggle:()=>void}){return <div className="task-line"><button className={`check ${t.status==='done'?'checked':''}`} onClick={onToggle}>{t.status==='done'&&<Check size={14}/>}</button><div className="task-copy"><b>{t.title}</b><small>{t.project?.name||'pessoal'}{t.recurrence_rule_id&&' · recorrente'}</small></div><span className="task-time">{timeRange(t)}</span></div>}
function HabitMini({h,log,onLog}:{h:Habit;log?:HabitLog;onLog:(h:Habit,v:number,c?:boolean)=>void}){const I=icons[h.icon]||Flame;const pct=h.tracking_type==='boolean'?(log?.completed?100:0):Math.min(100,((log?.value||0)/h.target)*100);return <div className="habit-mini"><div className={`habit-icon ${h.color}`}><I size={19}/></div><div className="habit-copy"><b>{h.name}</b><small>{h.tracking_type==='boolean'?habitFrequencyLabel(h):`${log?.value||0} / ${h.target} ${h.unit}`}</small><div className="progress"><i style={{width:`${pct}%`}}/></div></div>{h.tracking_type==='boolean'?<button className={`round-done ${log?.completed?'done':''}`} onClick={()=>onLog(h,0,!log?.completed)}>{log?.completed?<Check size={16}/>:''}</button>:<button className="add-progress" onClick={()=>onLog(h,habitIncrement(h))}>+</button>}</div>}
function ProjectsPage({projects,tasks,onNew}:{projects:Project[];tasks:Task[];onNew:()=>void}){return <><PageHead title="projetos" subtitle="coisas que levam mais de um passo" action="novo projeto" onClick={onNew}/><div className="project-grid">{projects.map(p=><div className="project-card" key={p.id}><div className={`project-dot ${p.color}`}/><div><h3>{p.name}</h3><p>{tasks.filter(t=>t.project_id===p.id&&t.status!=='done').length} pendentes</p></div></div>)}{!projects.length&&<div className="panel"><Empty text="crie um projeto para agrupar tarefas maiores"/></div>}</div></>}
function Capture({onSave}:{onSave:(t:string)=>void}){const [text,setText]=useState('');return <div className="capture-card"><Inbox size={28}/><p className="eyebrow">captura rápida</p><h1>tira isso da cabeça ♡</h1><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="qualquer coisa que você precisa lembrar…"/><div className="capture-actions"><button className="primary" onClick={()=>{if(text.trim())onSave(text.trim())}}>transformar em tarefa</button></div></div>}
function PageHead({title,subtitle,action,onClick}:{title:string;subtitle:string;action:string;onClick:()=>void}){return <div className="page-head"><div><p className="eyebrow">juki organizer</p><h1>{title}</h1><p>{subtitle}</p></div><button className="primary" onClick={onClick}><Plus size={16}/>{action}</button></div>}
function Empty({text}:{text:string}){return <div className="empty"><div className="empty-icon"><Heart size={19}/></div><p>{text}</p></div>}
type TaskDraft = {
  title: string; description: string; project: string; status: string; priority: string
  due: string; time: string; endTime: string
  recurring: boolean; frequency: Frequency; interval: string; endDate: string
}

function validateTaskDraft(form: TaskDraft) {
  if (form.recurring) {
    if (!form.due) return 'Escolha a primeira data para repetir a tarefa.'
    const interval = Number(form.interval)
    if (!Number.isSafeInteger(interval) || interval < 1 || interval > 2_147_483_647) return 'Use um intervalo inteiro maior ou igual a 1.'
    if (form.endDate && form.endDate < form.due) return 'O término precisa ser igual ou posterior à data da tarefa.'
  }
  try {
    timePayload(form.due, form.time, form.endTime)
    return null
  } catch (error) {
    return (error as Error).message
  }
}

function recurrenceFromDraft(form: TaskDraft, rule?: Rule) {
  const keepAnchor = rule?.active && rule.frequency === form.frequency && rule.interval_value === Number(form.interval)
  return {
    frequency: form.frequency,
    interval_value: Number(form.interval),
    start_date: (keepAnchor && rule.start_date) || form.due || null,
    end_date: form.endDate || null,
    day_of_month: keepAnchor ? rule.day_of_month : null,
    weekdays: keepAnchor ? rule.weekdays : [],
    active: true,
  }
}

function TaskModal({ task, rule, projects, initialTitle, initialDate, onClose, onDelete, onSave, busy }: {
  task: Task | null; rule?: Rule; projects: Project[]; initialTitle: string; initialDate: string
  onClose: () => void; onDelete: (task: Task) => void; onSave: (draft: TaskDraft) => Promise<string | null>; busy: boolean
}) {
  const [form, setForm] = useState<TaskDraft>({
    title: task?.title || initialTitle, description: task?.description || '', project: task?.project_id || '',
    status: task?.status || 'todo', priority: priorityUi(task?.priority || 'medium'),
    due: task?.due_date || initialDate, time: task?.due_time?.slice(0, 5) || '',
    endTime: endTime(task?.due_time, task?.estimated_minutes),
    recurring: !!rule?.active, frequency: rule && isFrequency(rule.frequency) ? rule.frequency : 'weeks',
    interval: String(rule?.interval_value || 1), endDate: rule?.end_date || '',
  })
  const [error, setError] = useState('')
  const upcoming = form.recurring && form.due && !validateTaskDraft(form)
    ? upcomingDates(recurrenceFromDraft(form, rule), form.due)
    : []
  const format = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

  function change<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]) {
    setError('')
    setForm(previous => ({
      ...previous, [field]: value,
      ...((field === 'due' || field === 'time') && !value ? { time: '', endTime: '' } : {}),
    }))
  }

  return <Modal title={task ? 'editar tarefa' : 'nova tarefa'} onClose={onClose}>
    <form onSubmit={async event => {
      event.preventDefault()
      if (busy) return
      const failure = validateTaskDraft(form) ?? await onSave(form)
      setError(failure ?? '')
    }}>
      <label>título<input value={form.title} onChange={event => change('title', event.target.value)} placeholder="ex.: lavar roupa"/></label>
      <label>descrição<textarea value={form.description} onChange={event => change('description', event.target.value)} placeholder="opcional"/></label>
      <div className="form-grid">
        <label>{form.recurring && !task ? 'primeira data' : 'data (opcional)'}<input type="date" value={form.due} onChange={event => change('due', event.target.value)}/></label>
        <label>prioridade<select value={form.priority} onChange={event => change('priority', event.target.value)}>
          {['Alta', 'Média', 'Baixa'].map(value => <option key={value}>{value}</option>)}
        </select></label>
        <fieldset className="time-range-field">
          <legend>horário (opcional)</legend>
          <div className="time-range-inputs">
            <label>das<input type="time" disabled={!form.due} value={form.time} onChange={event => change('time', event.target.value)}/></label>
            <label>às<input type="time" disabled={!form.due || !form.time} value={form.endTime} onChange={event => change('endTime', event.target.value)}/></label>
          </div>
          <button type="button" className="text-button" onClick={() => change('time', '')}>sem horário / limpar</button>
        </fieldset>
        <label>estado<select value={form.status} onChange={event => change('status', event.target.value)}>
          <option value="todo">pendente</option><option value="in_progress">em andamento</option><option value="done">concluída</option>
        </select></label>
        <label>categoria<select value={form.project} onChange={event => change('project', event.target.value)}>
          <option value="">pessoal / sem categoria</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select></label>
      </div>
      <label className="switch-row"><input type="checkbox" checked={form.recurring} onChange={event => change('recurring', event.target.checked)}/> Repetir esta tarefa</label>
      {rule?.active && !form.recurring && <p className="recurrence-hint">Ao salvar, a série deixa de criar novas ocorrências.</p>}
      {form.recurring && <fieldset className="recurrence-box">
        <legend>Repetição</legend>
        <div className="form-grid">
          <label>Repetir a cada
            <input type="number" min="1" max="2147483647" step="1" value={form.interval} required onChange={event => change('interval', event.target.value)}/>
          </label>
          <label>Unidade<select value={form.frequency} onChange={event => change('frequency', event.target.value as Frequency)}>
            {Object.entries(frequencies).map(([key, names]) => <option key={key} value={key}>{names[Number(form.interval) === 1 ? 0 : 1]}</option>)}
          </select></label>
        </div>
        <label>Termina em (opcional)<input type="date" min={form.due || undefined} value={form.endDate} onChange={event => change('endDate', event.target.value)}/></label>
        <div className="recurrence-preview" aria-live="polite">
          <span>Próximas datas</span>
          {upcoming.length ? <ul>{upcoming.map(date => <li key={date}><time dateTime={date}>{format.format(new Date(`${date}T00:00:00Z`))}</time></li>)}</ul>
            : <p>{!form.due ? 'Escolha a primeira data.' : validateTaskDraft(form) ?? 'Nenhuma repetição no período.'}</p>}
        </div>
      </fieldset>}
      {error && <p className="error-box" role="alert">{error}</p>}
      {task && <button type="button" className="task-delete" disabled={busy} onClick={() => onDelete(task)}><Trash2 size={15}/> excluir tarefa</button>}
      <button className="primary full" disabled={busy}>{busy ? 'salvando…' : 'salvar tarefa'}</button>
    </form>
  </Modal>
}
function HabitModal({habit,onDelete,onClose,onSave,busy}:{habit:Habit|null;onDelete:(h:Habit)=>void;onClose:()=>void;onSave:(f:any)=>void;busy:boolean}){const [f,setF]=useState<any>({name:habit?.name||'',description:habit?.description||'',icon:habit?.icon||'other',trackingType:habit?.tracking_type||'boolean',target:habit?.target||1,unit:habit?.unit||'vez',frequency:habit?.frequency||'daily',weekdays:habit?.frequency==='weekly'?scheduledWeekdays(habit):(habit?.weekdays?.length?habit.weekdays:[weekdayIndex(new Date())]),time:habit?.time?.slice(0,5)||'',color:habit?.color||'pink'});const u=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));return <Modal title={habit?'editar hábito':'novo hábito'} onClose={onClose}><label>nome<input value={f.name} onChange={e=>u('name',e.target.value)} placeholder="ex.: beber água"/></label><label>descrição<input value={f.description} onChange={e=>u('description',e.target.value)} placeholder="opcional"/></label><div className="form-grid"><label>como acompanhar<select value={f.trackingType} onChange={e=>u('trackingType',e.target.value)}><option value="boolean">feito / não feito</option><option value="quantity">quantidade</option><option value="duration">tempo</option><option value="count">contagem</option></select></label><label>meta<input type="number" min="1" value={f.target} onChange={e=>u('target',e.target.value)}/></label></div>{f.trackingType!=='boolean'&&<label>unidade<input value={f.unit} onChange={e=>u('unit',e.target.value)} placeholder="ml, páginas, minutos..."/></label>}<div className="form-grid"><label>frequência<select value={f.frequency} onChange={e=>u('frequency',e.target.value)}><option value="daily">todos os dias</option><option value="weekdays">dias úteis</option><option value="weekly">semanal</option></select></label><label>horário opcional<input type="time" value={f.time} onChange={e=>u('time',e.target.value)}/></label></div>{f.frequency==='weekly'&&<fieldset className="habit-weekday-field">
  <legend>Dias da semana</legend>
  <div>{habitWeekdays.map((day,index)=><label key={day}>
    <input type="checkbox" checked={f.weekdays.includes(index)}
      onChange={e=>u('weekdays',e.target.checked?[...f.weekdays,index]:f.weekdays.filter((selected:number)=>selected!==index))}/>
    <span>{day}</span>
  </label>)}</div>
  {!f.weekdays.length&&<p>Selecione pelo menos um dia.</p>}
 </fieldset>}<label>ícone<select value={f.icon} onChange={e=>u('icon',e.target.value)}>{Object.keys(icons).map(x=><option key={x}>{x}</option>)}</select></label><label>cor<select value={f.color} onChange={e=>u('color',e.target.value)}>{['pink','lavender','blue','sage','peach','yellow'].map(x=><option key={x}>{x}</option>)}</select></label>{habit&&<button type="button" className="task-delete" disabled={busy} onClick={()=>onDelete(habit)}><Trash2 size={15}/> excluir hábito</button>}<button className="primary full" disabled={busy||(f.frequency==='weekly'&&!f.weekdays.length)} onClick={()=>onSave(f)}>{busy?'salvando...':'salvar hábito'}</button></Modal>}
function ProjectModal({onClose,onSave,busy}:{onClose:()=>void;onSave:(n:string,c:string)=>void;busy:boolean}){const [n,setN]=useState(''),[c,setC]=useState('pink');return <Modal title="novo projeto" onClose={onClose}><label>nome<input value={n} onChange={e=>setN(e.target.value)} placeholder="ex.: TCC"/></label><label>cor<select value={c} onChange={e=>setC(e.target.value)}>{['pink','lavender','blue','sage','yellow'].map(x=><option key={x}>{x}</option>)}</select></label><button className="primary full" disabled={busy} onClick={()=>onSave(n,c)}>{busy?'salvando...':'criar projeto'}</button></Modal>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:any}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-button soft" type="button" aria-label="Fechar" onClick={onClose}><X/></button></div>{children}</div></div>}

createRoot(document.getElementById('root')!).render(<App/>)
