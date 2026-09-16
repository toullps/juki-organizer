import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react'

type Task={id:string;title:string;status:string;due_date:string|null;due_time:string|null;start_date?:string|null;start_time?:string|null;recurrence_rule_id?:string|null}
type Rule={id:string;frequency:string;interval_value:number;weekdays:number[];time_of_day:string|null;active:boolean;start_date:string|null;end_date:string|null}

const pad=(n:number)=>String(n).padStart(2,'0')
const iso=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x}
const addMonths=(d:Date,n:number)=>{const x=new Date(d);x.setMonth(x.getMonth()+n);return x}
const monday=(d:Date)=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}

export default function RecurringCalendarView({date,setDate,tasks,onToggle,rules}:{date:Date;setDate:(d:Date)=>void;tasks:Task[];onToggle:(t:Task)=>void;rules:Rule[]}){
 const [mode,setMode]=useState<'month'|'week'>('month')
 const [range,setRange]=useState<'month'|'week'>('month')
 const ruleMap=useMemo(()=>new Map(rules.map(r=>[r.id,r])),[rules])
 const monthYear=date.getFullYear(),month=date.getMonth()
 const first=new Date(monthYear,month,1),monthDays=new Date(monthYear,month+1,0).getDate(),start=(first.getDay()+6)%7
 const weekStart=monday(date),weekEnd=addDays(weekStart,6)
 const rangeStart=mode==='month'?new Date(monthYear,month,1):weekStart
 const rangeEnd=mode==='month'?new Date(monthYear,month+1,0):weekEnd
 const occurrences=useMemo(()=>{
  const out:{task:Task;date:string;time:string|null;virtual:boolean}[]=[]
  const add=(task:Task,d:Date)=>{const key=iso(d);if(key<iso(rangeStart)||key>iso(rangeEnd))return;const rule=task.recurrence_rule_id?ruleMap.get(task.recurrence_rule_id):undefined;out.push({task,date:key,time:task.due_time||rule?.time_of_day||null,virtual:key!==task.due_date})}
  for(const task of tasks){
   const rule=task.recurrence_rule_id?ruleMap.get(task.recurrence_rule_id):undefined
   const seedText=task.due_date||task.start_date||rule?.start_date
   if(!seedText)continue
   const seed=new Date(seedText+'T12:00:00')
   if(!rule||!rule.active){add(task,seed);continue}
   const until=rule.end_date?new Date(rule.end_date+'T12:00:00'):rangeEnd
   if(rule.frequency==='days'){
    let d=new Date(seed),guard=0,step=Math.max(1,Number(rule.interval_value)||1)
    while(d<=until&&guard++<10000){add(task,d);d=addDays(d,step)}
   }else if(rule.frequency==='weeks'&&rule.weekdays?.length){
    const step=Math.max(1,Number(rule.interval_value)||1);let cursor=monday(seed),guard=0
    while(cursor<=until&&guard++<2000){for(const wd of rule.weekdays){const d=addDays(cursor,Number(wd));if(d>=seed&&d<=until)add(task,d)}cursor=addDays(cursor,7*step)}
   }else if(rule.frequency==='weeks'){
    let d=new Date(seed),guard=0,step=7*Math.max(1,Number(rule.interval_value)||1)
    while(d<=until&&guard++<2000){add(task,d);d=addDays(d,step)}
   }else if(rule.frequency==='months'){
    let d=new Date(seed),guard=0,step=Math.max(1,Number(rule.interval_value)||1)
    while(d<=until&&guard++<800){add(task,d);d=addMonths(d,step)}
   }else if(rule.frequency==='years'){
    let d=new Date(seed),guard=0,step=Math.max(1,Number(rule.interval_value)||1)
    while(d<=until&&guard++<250){add(task,d);d.setFullYear(d.getFullYear()+step)}
   }else add(task,seed)
  }
  return out.sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))
 },[tasks,ruleMap,mode,rangeStart.getTime(),rangeEnd.getTime()])
 const monthCells=Array.from({length:42},(_,i)=>i-start+1)
 const weekDays=Array.from({length:7},(_,i)=>addDays(weekStart,i))
 const move=(n:number)=>setDate(mode==='month'?new Date(monthYear,month+n,1):addDays(weekStart,n*7))
 const label=mode==='month'?date.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}):`${weekStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} — ${weekEnd.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`
 return <>
  <style>{` .rc-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px}.rc-switch{display:flex;gap:3px;padding:4px;border:1px solid #e8dfd7;border-radius:12px;background:#fff}.rc-switch button{border:0;background:transparent;padding:7px 12px;border-radius:8px}.rc-switch button.active{background:#292526;color:#fff}.rc-month-scroll{overflow:auto}.rc-week{overflow:auto;border:1px solid #e8dfd7;border-radius:18px;background:#fff}.rc-head,.rc-body{min-width:760px;display:grid;grid-template-columns:55px repeat(7,minmax(100px,1fr))}.rc-head>div{padding:10px 6px;text-align:center;border-right:1px solid #eee7e1;border-bottom:1px solid #eee7e1;font-size:11px}.rc-head b{display:block;font-size:17px;margin-top:3px}.rc-head .today{color:#b85d87}.rc-times{display:grid;grid-template-rows:repeat(18,52px);border-right:1px solid #eee7e1}.rc-times span{font-size:10px;color:#8e8881;padding:0 5px;transform:translateY(-6px)}.rc-day{height:936px;position:relative;border-right:1px solid #eee7e1;background:repeating-linear-gradient(to bottom,transparent 0,transparent 51px,#f0ece8 52px)}.rc-event{position:absolute;left:4px;right:4px;border:0;border-radius:8px;background:#ead6df;padding:5px 6px;text-align:left;font-size:11px;line-height:1.2;overflow:hidden}.rc-event.done{opacity:.5;text-decoration:line-through}.rc-event.recurring{outline:1px solid rgba(184,93,135,.35)}.rc-event .time{font-weight:700;margin-right:4px}.rc-all-day{padding:4px;display:flex;flex-direction:column;gap:4px}.rc-all-day .rc-event{position:relative;left:auto;right:auto}.rc-all-day .rc-event+ .rc-event{top:auto!important}@media(max-width:720px){.rc-toolbar{align-items:stretch;flex-direction:column}.rc-switch{width:100%}.rc-switch button{flex:1}.rc-month-scroll{margin:0 -4px}.rc-month-scroll .calendar-grid{min-width:700px}.rc-week{margin:0 -4px}.rc-head,.rc-body{min-width:680px;grid-template-columns:44px repeat(7,minmax(90px,1fr))}}`}</style>
  <div className="hero-row rc-toolbar"><div><p className="eyebrow">visão</p><h2>calendário</h2></div><div className="rc-switch"><button className={mode==='month'?'active':''} onClick={()=>setMode('month')}>mês</button><button className={mode==='week'?'active':''} onClick={()=>setMode('week')}>semana</button></div><div className="calendar-nav"><button className="ghost" onClick={()=>move(-1)}><ChevronLeft/></button><b>{label}</b><button className="ghost" onClick={()=>move(1)}><ChevronRight/></button></div></div>
  {mode==='month'?<section className="panel rc-month-scroll"><div className="weekday-row">{['seg','ter','qua','qui','sex','sáb','dom'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{monthCells.map(n=>{const key=n>0&&n<=monthDays?`${monthYear}-${pad(month+1)}-${pad(n)}`:'';const ts=occurrences.filter(o=>o.date===key);return <div key={n} className={`calendar-cell ${key===iso(new Date())?'today':''}`}>{key&&<span>{n}</span>}{ts.map((o,i)=><button key={`${o.task.id}-${o.date}-${i}`} className={`calendar-task ${o.task.status==='done'?'done':''}`} onClick={()=>onToggle(o.task)} title={o.time?`${o.time.slice(0,5)} · ${o.task.title}`:o.task.title}>{o.time&&<span className="cal-time">{o.time.slice(0,5)}</span>}{o.task.title}{o.virtual&&<Repeat2 size={10}/>}</button>)}</div>})}</div></section>:<section className="rc-week"><div className="rc-head"><div></div>{weekDays.map(d=><div key={iso(d)} className={iso(d)===iso(new Date())?'today':''}><span>{['seg','ter','qua','qui','sex','sáb','dom'][(d.getDay()+6)%7]}</span><b>{d.getDate()}</b></div>)}</div><div className="rc-body"><div className="rc-times">{Array.from({length:18},(_,i)=><span key={i}>{pad(i+6)}:00</span>)}</div>{weekDays.map(d=>{const key=iso(d);const ts=occurrences.filter(o=>o.date===key);return <div className="rc-day" key={key}><div className="rc-all-day">{ts.filter(o=>!o.time).map((o,i)=><button key={o.task.id+'a'+i} className={`rc-event ${o.task.status==='done'?'done':''} ${o.virtual?'recurring':''}`} onClick={()=>onToggle(o.task)}>{o.task.title}</button>)}</div>{ts.filter(o=>o.time).map((o,i)=>{const [hh,mm]=o.time!.split(':').map(Number);const top=Math.max(0,((hh*60+mm)-360)/60*52);return <button key={o.task.id+'b'+i} className={`rc-event ${o.task.status==='done'?'done':''} ${o.virtual?'recurring':''}`} style={{top}} onClick={()=>onToggle(o.task)}><span className="time">{o.time!.slice(0,5)}</span>{o.task.title}{o.virtual&&' ↻'}</button>})}</div>})}</div></section>}
 </>
}
