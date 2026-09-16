import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const calendarReplacement = `function CalendarView({date,setDate,tasks,onToggle,rules}:{date:Date,setDate:(d:Date)=>void,tasks:Task[],onToggle:(t:Task)=>void,rules:Rule[]}){
 const [mode,setMode]=useState<'month'|'week'>('month')
 const addMonths=(d:Date,n:number)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x}
 const monday=(d:Date)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x}
 const y=date.getFullYear(),m=date.getMonth()
 const first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate()
 const monthStart=new Date(y,m,1),monthEnd=new Date(y,m+1,0)
 const weekStart=monday(date),weekEnd=addDays(weekStart,6)
 const rangeStart=mode==='month'?monthStart:weekStart
 const rangeEnd=mode==='month'?monthEnd:weekEnd
 const ruleMap=useMemo(()=>new Map(rules.map(r=>[r.id,r])),[rules])
 const occurrences=useMemo(()=>{
  const out:{task:Task,date:string,time:string|null,virtual:boolean}[]=[]
  const push=(task:Task,d:Date,virtual:boolean)=>{const key=isoDate(d);if(key>=isoDate(rangeStart)&&key<=isoDate(rangeEnd))out.push({task,date:key,time:task.due_time||ruleMap.get(task.recurrence_rule_id||'')?.time_of_day||null,virtual})}
  for(const task of tasks){
   const rule=task.recurrence_rule_id?ruleMap.get(task.recurrence_rule_id):undefined
   const seedText=task.due_date||task.start_date||rule?.start_date
   if(!seedText)continue
   const seed=new Date(seedText+'T12:00:00')
   if(!rule||!rule.active){push(task,seed,false);continue}
   const endLimit=rule.end_date?new Date(rule.end_date+'T12:00:00'):rangeEnd
   const until=endLimit<rangeEnd?endLimit:rangeEnd
   if(rule.frequency==='days'){
    let d=new Date(seed);let guard=0
    while(d<=until&&guard++<5000){push(task,d,isoDate(d)!==isoDate(seed));d=addDays(d,Math.max(1,Number(rule.interval_value)||1))}
   } else if(rule.frequency==='weeks'&&rule.weekdays?.length){
    const interval=Math.max(1,Number(rule.interval_value)||1);let cursor=new Date(seed);cursor.setDate(cursor.getDate()-((cursor.getDay()+6)%7));let guard=0
    while(cursor<=until&&guard++<1500){for(const wd of rule.weekdays){const d=addDays(cursor,Number(wd));if(d>=seed&&d<=until)push(task,d,isoDate(d)!==isoDate(seed))}cursor=addDays(cursor,7*interval)}
   } else if(rule.frequency==='weeks'){
    let d=new Date(seed);let guard=0;while(d<=until&&guard++<1500){push(task,d,isoDate(d)!==isoDate(seed));d=addDays(d,7*Math.max(1,Number(rule.interval_value)||1))}
   } else if(rule.frequency==='months'){
    let d=new Date(seed);let guard=0;while(d<=until&&guard++<600){push(task,d,isoDate(d)!==isoDate(seed));d=addMonths(d,Math.max(1,Number(rule.interval_value)||1))}
   } else if(rule.frequency==='years'){
    let d=new Date(seed);let guard=0;while(d<=until&&guard++<200){push(task,d,isoDate(d)!==isoDate(seed));d.setFullYear(d.getFullYear()+Math.max(1,Number(rule.interval_value)||1))}
   } else push(task,seed,false)
  }
  return out.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
 },[tasks,ruleMap,rangeStart.getTime(),rangeEnd.getTime()])
 const cells=Array.from({length:42},(_,i)=>i-start+1)
 const weekDays=Array.from({length:7},(_,i)=>addDays(weekStart,i))
 const move=(dir:number)=>setDate(mode==='month'?new Date(y,m+dir,1):addDays(weekStart,dir*7))
 const label=mode==='month'?date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}):`\${weekStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} — \${weekEnd.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`
 const taskLabel=(o:{task:Task,date:string,time:string|null})=>`\${o.time?o.time.slice(0,5)+' · ':''}\${o.task.title}`
 return <><style>{\`.calendar-switch{display:flex;gap:4px;padding:4px;border:1px solid var(--line,#e6e0d8);border-radius:12px;background:#fff}.calendar-switch button{border:0;background:transparent;padding:8px 11px;border-radius:8px;font:inherit;color:inherit}.calendar-switch button.active{background:#262525;color:#fff}.calendar-week-wrap{overflow:auto;border:1px solid var(--line,#e6e0d8);border-radius:18px;background:#fff}.week-head,.week-grid{min-width:760px;display:grid;grid-template-columns:56px repeat(7,minmax(105px,1fr))}.week-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid var(--line,#e6e0d8)}.week-head>div{padding:12px 8px;text-align:center;font-size:12px;border-right:1px solid var(--line,#e6e0d8)}.week-head b{display:block;font-size:17px;margin-top:2px}.week-head .today b{color:#b85d87}.week-grid{position:relative}.week-times{display:grid;grid-template-rows:repeat(18,52px);border-right:1px solid var(--line,#e6e0d8)}.week-times span{padding:0 6px;font-size:10px;color:#8b857e;border-bottom:1px solid #f1eeea;transform:translateY(-7px)}.week-day{height:936px;position:relative;border-right:1px solid var(--line,#e6e0d8);background:repeating-linear-gradient(to bottom,transparent 0,transparent 51px,#f1eeea 52px)}.week-all-day{position:absolute;left:4px;right:4px;top:4px;z-index:2;display:flex;flex-direction:column;gap:4px}.week-event{position:absolute;left:5px;right:5px;min-height:34px;border:0;border-radius:8px;background:#ead5df;color:#332c31;padding:5px 7px;text-align:left;font:inherit;font-size:11px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,.04)}.week-event.done{text-decoration:line-through;opacity:.55}.week-event .time{font-weight:700;margin-right:4px}.week-event.recurring{outline:1px solid rgba(184,93,135,.35)}.calendar-task{display:block;width:100%;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.calendar-task .cal-time{font-weight:700;margin-right:4px}@media(max-width:720px){.calendar-toolbar{align-items:flex-start;flex-direction:column;gap:10px}.calendar-nav{width:100%;justify-content:space-between}.calendar-switch{width:100%;display:grid;grid-template-columns:1fr 1fr}.calendar-switch button{width:100%}.calendar-grid{min-width:700px}.calendar-scroll{overflow:auto;margin:0 -4px}.calendar-cell{min-height:120px}.calendar-cell .calendar-task{font-size:10px;padding:5px}.week-head,.week-grid{min-width:680px;grid-template-columns:44px repeat(7,minmax(90px,1fr))}.week-day{height:936px}}\`}</style><div className="hero-row calendar-toolbar"><div><p className="eyebrow">visão</p><h2>calendário</h2></div><div className="calendar-switch"><button className={mode==='month'?'active':''} onClick={()=>setMode('month')}>mês</button><button className={mode==='week'?'active':''} onClick={()=>setMode('week')}>semana</button></div><div className="calendar-nav"><button className="ghost" onClick={()=>move(-1)}><ChevronLeft/></button><b>{label}</b><button className="ghost" onClick={()=>move(1)}><ChevronRight/></button></div></div>{mode==='month'?<section className="panel calendar-scroll"><div className="weekday-row">{['seg','ter','qua','qui','sex','sáb','dom'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{cells.map(n=>{const key=n>0&&n<=days?`\${y}-\${pad(m+1)}-\${pad(n)}`:'';const ts=occurrences.filter(o=>o.date===key);return <div key={n} className={\`calendar-cell \${key===today()?'today':''}\`}>{key&&<span>{n}</span>}{ts.map((o,i)=><button key={o.task.id+'-'+o.date+'-'+i} className={\`calendar-task \${o.task.status==='done'?'done':''}\`} onClick={()=>onToggle(o.task)} title={taskLabel(o)}>{o.time&&<span className="cal-time">{o.time.slice(0,5)}</span>}{o.task.title}{o.virtual&&<Repeat2 size={10}/>}</button>)}</div>})}</div></section>:<section className="calendar-week-wrap"><div className="week-head"><div></div>{weekDays.map(d=>{const key=isoDate(d);return <div key={key} className={key===today()?'today':''}><span>{['seg','ter','qua','qui','sex','sáb','dom'][(d.getDay()+6)%7]}</span><b>{d.getDate()}</b></div>})}</div><div className="week-grid"><div className="week-times">{Array.from({length:18},(_,i)=><span key={i}>{pad(i+6)}:00</span>)}</div>{weekDays.map(d=>{const key=isoDate(d);const ts=occurrences.filter(o=>o.date===key);return <div key={key} className="week-day"><div className="week-all-day">{ts.filter(o=>!o.time).map((o,i)=><button key={o.task.id+'-'+i} className={\`week-event \${o.task.status==='done'?'done':''} \${o.virtual?'recurring':''}\`} style={{position:'relative',left:0,right:0,top:0}} onClick={()=>onToggle(o.task)}>{o.task.title}</button>)}</div>{ts.filter(o=>o.time).map((o,i)=>{const [hh,mm]=o.time!.split(':').map(Number);const top=Math.max(0,((hh*60+mm)-(6*60))/60*52);return <button key={o.task.id+'-'+i} className={\`week-event \${o.task.status==='done'?'done':''} \${o.virtual?'recurring':''}\`} style={{top}} onClick={()=>onToggle(o.task)}><span className="time">{o.time!.slice(0,5)}</span>{o.task.title}{o.virtual&&' ↻'}</button>})}</div>})}</div></section>}</n}`

function optionalTaskFields() {
  return {
    name: 'optional-task-fields',
    transform(code: string, id: string) {
      if (!id.replace(/\\/g, '/').endsWith('/src/app.tsx')) return null
      let out = code
        .replace(/if\(!supabase\|\|!session\|\|!form\.title\?\.trim\(\)\)return;/g, 'if(!supabase||!session)return;')
        .replace(/title:form\.title\.trim\(\),/g, "title:form.title?.trim()||'sem título',")
        .replace(/disabled=\{busy\|\|!f\.title\.trim\(\)\}/g, 'disabled={busy}')
        .replace(/priority:form\.priority,/g, "priority:form.priority==='Alta'?'high':form.priority==='Baixa'?'low':'medium',")
        .replace(/priority:\s*form\.priority\b/g, "priority:form.priority==='Alta'?'high':form.priority==='Baixa'?'low':'medium'")
      out = out.replace(/\{view==='Calendário'&&<CalendarView[^\n]*?\/>\}/, "{view==='Calendário'&&<CalendarView date={calendarDate} setDate={setCalendarDate} tasks={visible} onToggle={toggle} rules={rules}/>}")
      out = out.replace(/function CalendarView[\s\S]*?\nfunction ProjectsView/, calendarReplacement + '\nfunction ProjectsView')
      return out
    },
  }
}

export default defineConfig({
  plugins: [react(), optionalTaskFields()],
})
