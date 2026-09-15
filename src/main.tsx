import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CirclePlus, Folder,
  Grid2X2, Inbox, LayoutDashboard, Loader2, LogOut, Menu, MoreHorizontal, Search, Settings2,
  Sparkles, Tag, X, Clock3, LockKeyhole, UserRound, FileText
} from 'lucide-react'
import { supabase } from './supabase'
import './styles.css'

type Project = { id: string; name: string; color: string; description: string | null }
type Task = {
  id: string; title: string; project_id: string | null; project?: Project | null; due_at: string | null;
  priority: string; status: string; completed_at: string | null
}

type View = 'Dashboard' | 'Tarefas' | 'Calendário' | 'Projetos' | 'Capturar' | 'Páginas' | 'Etiquetas' | 'Configurações'

const colors = ['pink','yellow','blue','sage','lavender']
const priorities = ['Alta','Média','Baixa']

const todayKey = () => new Date().toISOString().slice(0,10)
const fmtDate = (value?: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : 'Sem prazo'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [view, setView] = useState<View>('Dashboard')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [modal, setModal] = useState<'task'|'project'|null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskPriority, setTaskPriority] = useState('Média')
  const [taskProject, setTaskProject] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectColor, setProjectColor] = useState('pink')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) loadData()
  }, [session])

  async function loadData() {
    if (!supabase || !session) return
    setError('')
    const [p, t] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: true }),
      supabase.from('tasks').select('*, project:projects(*)').order('due_date', { ascending: true, nullsFirst: false }).order('due_time', { ascending: true, nullsFirst: false })
    ])
    if (p.error || t.error) {
      setError(p.error?.message || t.error?.message || 'Não foi possível carregar os dados.')
      return
    }
    setProjects((p.data || []) as Project[])
    setTasks((t.data || []).map((item: any) => ({
      ...item,
      due_at: item.due_date ? `${item.due_date}${item.due_time ? `T${item.due_time}` : 'T00:00:00'}` : null,
    })))
  }

  async function authenticate() {
    if (!supabase) return setAuthError('Supabase não configurado no deploy.')
    setAuthError('')
    setBusy(true)
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) setAuthError(result.error.message)
    else if (authMode === 'signup' && !result.data.session) setAuthError('Conta criada. Confira seu e-mail para confirmar o cadastro, se a confirmação estiver ativada.')
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProjects([])
    setTasks([])
  }

  async function toggleTask(task: Task) {
    if (!supabase || !session) return
    const nextDone = task.status !== 'done'
    const patch = nextDone ? { status: 'done', completed_at: new Date().toISOString() } : { status: 'todo', completed_at: null }
    const { error: updateError } = await supabase.from('tasks').update(patch).eq('id', task.id).eq('owner_id', session.user.id)
    if (updateError) setError(updateError.message)
    else await loadData()
  }

  async function addTask() {
    if (!supabase || !session || !taskTitle.trim()) return
    setBusy(true)
    const due = taskDue ? new Date(taskDue) : null
    const { error: insertError } = await supabase.from('tasks').insert({
      owner_id: session.user.id,
      title: taskTitle.trim(),
      project_id: taskProject || null,
      priority: taskPriority,
      status: 'todo',
      due_date: due ? due.toISOString().slice(0,10) : null,
      due_time: due ? due.toISOString().slice(11,19) : null,
    })
    setBusy(false)
    if (insertError) { setError(insertError.message); return }
    setTaskTitle(''); setTaskDue(''); setTaskPriority('Média'); setTaskProject(''); setModal(null)
    await loadData()
  }

  async function addProject() {
    if (!supabase || !session || !projectName.trim()) return
    setBusy(true)
    const { error: insertError } = await supabase.from('projects').insert({ owner_id: session.user.id, name: projectName.trim(), color: projectColor })
    setBusy(false)
    if (insertError) { setError(insertError.message); return }
    setProjectName(''); setProjectColor('pink'); setModal(null)
    await loadData()
  }

  const visibleTasks = useMemo(() => {
    let result = tasks
    if (selectedProject) result = result.filter(t => t.project_id === selectedProject)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.project?.name?.toLowerCase().includes(q))
    }
    return result
  }, [tasks, selectedProject, search])

  const todayTasks = tasks.filter(t => t.due_at?.startsWith(todayKey()) && t.status !== 'done')
  const openTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const overdue = openTasks.filter(t => t.due_at && t.due_at.slice(0,10) < todayKey())

  if (loading) return <div className="loading-screen"><Loader2 className="spin" size={22}/> carregando...</div>
  if (!supabase) return <div className="auth-wrap"><div className="auth-card"><h1>juki<span>°</span></h1><p>Supabase ainda não está configurado.</p></div></div>
  if (!session) {
    return <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand-mark">juki<span>°</span></div>
        <p className="eyebrow">organização pessoal</p>
        <h1>{authMode === 'login' ? 'bem-vinda de volta ♡' : 'crie seu espaço'}</h1>
        <p className="auth-copy">um lugar para tarefas, projetos e ideias sem aquela cara de software corporativo.</p>
        <label>e-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label>
        <label>senha<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
        {authError && <div className="error-box">{authError}</div>}
        <button className="primary full" onClick={authenticate} disabled={busy}>{busy ? 'entrando...' : authMode === 'login' ? 'entrar' : 'criar conta'}</button>
        <button className="link-button" onClick={()=>{setAuthMode(authMode === 'login' ? 'signup':'login'); setAuthError('')}}>
          {authMode === 'login' ? 'ainda não tenho uma conta' : 'já tenho uma conta'}
        </button>
      </div>
    </div>
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo">juki<span>°</span></div>
      <div className="sidebar-group"><div className="sidebar-label">Geral</div>
        <SideButton icon={<LayoutDashboard size={17}/>} label="Dashboard" active={view==='Dashboard'} onClick={()=>setView('Dashboard')}/>
        <SideButton icon={<Inbox size={17}/>} label="Tarefas" active={view==='Tarefas'} onClick={()=>setView('Tarefas')}/>
        <SideButton icon={<CalendarDays size={17}/>} label="Calendário" active={view==='Calendário'} onClick={()=>setView('Calendário')}/>
        <SideButton icon={<Folder size={17}/>} label="Projetos" active={view==='Projetos'} onClick={()=>setView('Projetos')}/>
      </div>
      <div className="sidebar-group"><div className="sidebar-label">Espaço</div>
        <SideButton icon={<Sparkles size={17}/>} label="Capturar" active={view==='Capturar'} onClick={()=>setView('Capturar')}/>
        <SideButton icon={<FileText size={17}/>} label="Páginas" active={view==='Páginas'} onClick={()=>setView('Páginas')}/>
        <SideButton icon={<Tag size={17}/>} label="Etiquetas" active={view==='Etiquetas'} onClick={()=>setView('Etiquetas')}/>
      </div>
      <div className="sidebar-bottom">
        <SideButton icon={<Settings2 size={17}/>} label="Configurações" active={view==='Configurações'} onClick={()=>setView('Configurações')}/>
        <SideButton icon={<LogOut size={17}/>} label="Sair" onClick={logout}/>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="mobile-logo">juki<span>°</span></div>
        <div className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="buscar tarefas, projetos..."/></div>
        <div className="top-actions"><button className="icon-button" onClick={()=>setModal('task')}><CirclePlus size={18}/></button><div className="avatar">{session.user.email?.[0]?.toUpperCase()}</div></div>
      </header>

      <div className="content">
        {error && <div className="error-banner">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
        {view==='Dashboard' && <Dashboard tasks={tasks} projects={projects} todayTasks={todayTasks} overdue={overdue} doneTasks={doneTasks} onToggle={toggleTask} onTask={()=>setModal('task')} onProject={()=>setModal('project')}/>} 
        {view==='Tarefas' && <TasksView tasks={visibleTasks} onToggle={toggleTask} onTask={()=>setModal('task')}/>} 
        {view==='Calendário' && <CalendarView tasks={tasks} onToggle={toggleTask}/>} 
        {view==='Projetos' && <ProjectsView projects={projects} tasks={tasks} selected={selectedProject} onSelect={setSelectedProject} onProject={()=>setModal('project')}/>} 
        {view==='Capturar' && <CaptureView onTask={()=>setModal('task')} />}
        {view==='Páginas' && <Placeholder title="Páginas" icon={<FileText size={20}/>} text="A base de páginas estilo Notion vem aqui na próxima etapa."/>}
        {view==='Etiquetas' && <Placeholder title="Etiquetas" icon={<Tag size={20}/>} text="Organize tarefas por etiquetas e filtros salvos."/>}
        {view==='Configurações' && <Placeholder title="Configurações" icon={<Settings2 size={20}/>} text={session.user.email || 'conta conectada'}/>} 
      </div>
    </main>

    <nav className="mobile-nav">
      <button onClick={()=>setView('Dashboard')} className={view==='Dashboard'?'active':''}><LayoutDashboard size={19}/><span>início</span></button>
      <button onClick={()=>setView('Tarefas')} className={view==='Tarefas'?'active':''}><Inbox size={19}/><span>tarefas</span></button>
      <button onClick={()=>setModal('task')}><CirclePlus size={22}/><span>novo</span></button>
      <button onClick={()=>setView('Calendário')} className={view==='Calendário'?'active':''}><CalendarDays size={19}/><span>calendário</span></button>
      <button onClick={()=>setView('Projetos')} className={view==='Projetos'?'active':''}><Folder size={19}/><span>projetos</span></button>
    </nav>

    {modal==='task' && <Modal title="nova tarefa" onClose={()=>setModal(null)}>
      <label>tarefa<input autoFocus value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="ex.: revisar capítulo 2"/></label>
      <div className="form-grid"><label>prazo<input type="datetime-local" value={taskDue} onChange={e=>setTaskDue(e.target.value)}/></label><label>prioridade<select value={taskPriority} onChange={e=>setTaskPriority(e.target.value)}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label></div>
      <label>projeto<select value={taskProject} onChange={e=>setTaskProject(e.target.value)}><option value="">sem projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button className="primary full" onClick={addTask} disabled={busy}>{busy ? 'salvando...' : 'salvar tarefa'}</button>
    </Modal>}

    {modal==='project' && <Modal title="novo projeto" onClose={()=>setModal(null)}>
      <label>nome<input autoFocus value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="ex.: TCC"/></label>
      <label>cor<select value={projectColor} onChange={e=>setProjectColor(e.target.value)}>{colors.map(c=><option key={c}>{c}</option>)}</select></label>
      <button className="primary full" onClick={addProject} disabled={busy}>{busy ? 'salvando...' : 'criar projeto'}</button>
    </Modal>}
  </div>
}

function SideButton({icon,label,active,onClick}:{icon:React.ReactNode,label:string,active?:boolean,onClick?:()=>void}) { return <button className={`side-button ${active?'active':''}`} onClick={onClick}>{icon}<span>{label}</span></button> }

function Dashboard({tasks,projects,todayTasks,overdue,doneTasks,onToggle,onTask,onProject}:{tasks:Task[],projects:Project[],todayTasks:Task[],overdue:Task[],doneTasks:Task[],onToggle:(t:Task)=>void,onTask:()=>void,onProject:()=>void}) {
  return <>
    <section className="hero-row"><div><div className="eyebrow">segunda-feira, 14 de setembro</div><h2>bom dia, júlia ♡</h2><p>vamos deixar o dia um pouquinho mais leve.</p></div><button className="primary" onClick={onTask}><CirclePlus size={17}/> nova tarefa</button></section>
    <section className="stats-grid">
      <Stat title="para hoje" value={todayTasks.length} note="pendentes hoje" tone="pink"/>
      <Stat title="atrasadas" value={overdue.length} note="precisam de atenção" tone="yellow"/>
      <Stat title="projetos" value={projects.length} note="espaços ativos" tone="sage"/>
      <Stat title="concluídas" value={doneTasks.length} note="no total" tone="blue"/>
    </section>
    <div className="dashboard-grid">
      <section className="panel wide"><div className="section-title"><div><h3>suas tarefas</h3><p>o que está esperando por você</p></div><button className="ghost" onClick={onTask}><CirclePlus size={15}/> adicionar</button></div>
        <div className="task-list">{tasks.slice(0,7).map(task=><TaskRow key={task.id} task={task} onToggle={()=>onToggle(task)}/>)}{!tasks.length && <EmptyState icon={<Inbox size={20}/>} text="nenhuma tarefa ainda" button="criar tarefa" onClick={onTask}/>}</div>
      </section>
      <section className="panel"><div className="section-title"><div><h3>projetos</h3><p>seus espaços</p></div><button className="icon-button soft" onClick={onProject}><CirclePlus size={16}/></button></div><div className="project-mini-list">{projects.slice(0,5).map(project=><div className="project-mini" key={project.id}><div className={`project-dot ${project.color}`}></div><div><b>{project.name}</b><span>{tasks.filter(t=>t.project_id===project.id && t.status!=='done').length} pendentes</span></div><ArrowUpRight size={15}/></div>)}{!projects.length&&<EmptyState icon={<Folder size={20}/>} text="crie seu primeiro projeto" button="novo projeto" onClick={onProject}/>}</div></section>
    </div>
  </>
}

function Stat({title,value,note,tone}:{title:string,value:number,note:string,tone:string}) { return <div className={`stat-card ${tone}`}><div className="stat-top"><span>{title}</span><ArrowUpRight size={15}/></div><strong>{value}</strong><small>{note}</small></div> }

function TasksView({tasks,onToggle,onTask}:{tasks:Task[],onToggle:(t:Task)=>void,onTask:()=>void}) { return <section><section className="hero-row"><div><div className="eyebrow">organização</div><h2>todas as tarefas</h2><p>um lugar só para tudo o que precisa ser feito.</p></div><button className="primary" onClick={onTask}><CirclePlus size={17}/> nova tarefa</button></section><section className="panel"><div className="task-list">{tasks.map(task=><TaskRow key={task.id} task={task} onToggle={()=>onToggle(task)} />)}{!tasks.length&&<EmptyState icon={<Inbox size={20}/>} text="nenhuma tarefa encontrada" />}</div></section></section> }

function ProjectsView({projects,tasks,selected,onSelect,onProject}:{projects:Project[],tasks:Task[],selected:string|null,onSelect:(id:string|null)=>void,onProject:()=>void}) { const filtered = selected ? projects.filter(p=>p.id===selected):projects; return <section><section className="hero-row"><div><div className="eyebrow">espaços</div><h2>projetos</h2><p>cada projeto pode ter suas próprias tarefas.</p></div><button className="primary" onClick={onProject}><CirclePlus size={17}/> novo projeto</button></section><div className="project-grid">{filtered.map(p=><button className={`project-card ${selected===p.id?'selected':''}`} key={p.id} onClick={()=>onSelect(selected===p.id?null:p.id)}><div className={`big-project-icon ${p.color}`}><Folder size={20}/></div><div className="project-card-main"><h3>{p.name}</h3><p>{p.description || 'sem descrição'}</p><span>{tasks.filter(t=>t.project_id===p.id && t.status!=='done').length} tarefas pendentes</span></div><MoreHorizontal size={18}/></button>)}{!projects.length&&<div className="panel"><EmptyState icon={<Folder size={20}/>} text="comece criando um projeto" button="novo projeto" onClick={onProject}/></div>}</div></section> }

function CalendarView({tasks,onToggle}:{tasks:Task[],onToggle:(t:Task)=>void}) { const month = new Date(); const start = new Date(month.getFullYear(),month.getMonth(),1); const days = new Date(month.getFullYear(),month.getMonth()+1,0).getDate(); const offset=(start.getDay()+6)%7; const cells=Array.from({length:offset+days},(_,i)=>i<offset?null:i-offset+1); return <section><section className="hero-row"><div><div className="eyebrow">agenda</div><h2>calendário</h2><p>seus prazos em uma visão mais tranquila.</p></div></section><section className="calendar-layout"><div className="panel calendar-card"><div className="calendar-head"><button className="icon-button soft"><ChevronLeft size={17}/></button><h3>{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</h3><button className="icon-button soft"><ChevronRight size={17}/></button></div><div className="weekday-row">{['seg','ter','qua','qui','sex','sáb','dom'].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-grid">{cells.map((day,idx)=>{const key=day?`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`:''; const dayTasks=tasks.filter(t=>t.due_at?.startsWith(key)); return <div key={idx} className={`calendar-cell ${day===new Date().getDate()?'today':''}`}>{day&&<><span>{day}</span>{dayTasks.slice(0,2).map(t=><button key={t.id} className={`calendar-task ${t.status==='done'?'done':''}`} onClick={()=>onToggle(t)}>{t.title}</button>)}</>}</div>})}</div></div><div className="panel"><div className="section-title"><div><h3>próximos</h3><p>prazos mais próximos</p></div></div><div className="task-list">{tasks.filter(t=>t.status!=='done'&&t.due_at).slice(0,8).map(t=><TaskRow key={t.id} task={t} onToggle={()=>onToggle(t)}/>)}</div></div></section></section> }

function CaptureView({onTask}:{onTask:()=>void}) { return <section><section className="hero-row"><div><div className="eyebrow">caixa de entrada</div><h2>capturar</h2><p>jogue uma ideia aqui e organize depois.</p></div></section><div className="capture-card"><Sparkles size={22}/><textarea placeholder="o que está na sua cabeça?"/><div className="capture-actions"><button className="ghost" onClick={onTask}>transformar em tarefa</button><button className="primary">salvar nota</button></div></div></section> }

function TaskRow({task,onToggle}:{task:Task,onToggle:()=>void}) { return <div className={`task-row ${task.status==='done'?'done':''}`}><button className={`check ${task.status==='done'?'checked':''}`} onClick={onToggle}>{task.status==='done'&&<CheckCircle2 size={16}/>}</button><div className="task-main"><b>{task.title}</b><div className="task-meta">{task.project?.name && <span className="meta-project">{task.project.name}</span>}<span>{fmtDate(task.due_at?.slice(0,10))}</span>{task.priority && <span>{task.priority}</span>}</div></div><Clock3 size={14} className="task-clock"/></div> }

function Placeholder({title,icon,text}:{title:string,icon:React.ReactNode,text:string}) { return <section><section className="hero-row"><div><div className="eyebrow">espaço</div><h2>{title}</h2><p>{text}</p></div></section><div className="panel placeholder"><div className="placeholder-icon">{icon}</div><h3>{text}</h3><p>essa parte já está reservada na estrutura do app.</p></div></section> }

function EmptyState({icon,text,button,onClick}:{icon:React.ReactNode,text:string,button?:string,onClick?:()=>void}) { return <div className="empty"><div className="empty-icon">{icon}</div><p>{text}</p>{button&&<button className="ghost" onClick={onClick}>{button}</button>}</div> }

function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:React.ReactNode}) { return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h3>{title}</h3><button className="icon-button soft" onClick={onClose}><X size={17}/></button></div>{children}</div></div> }

createRoot(document.getElementById('root')!).render(<App />)
