export type TaskFilter={period:string;category:string;status:string;group:string;today:string}
export type Groupable={id:string;due_date:string|null;due_time:string|null;project_id:string|null;status:string;archived_at?:string|null}
export function selectTasks<T extends Groupable>(tasks:T[],f:TaskFilter):T[]{
 return tasks.filter(t=>!t.archived_at&&(f.period==='all'||(f.period==='today'?t.due_date===f.today:f.period==='upcoming'?!!t.due_date&&t.due_date>f.today:f.period==='overdue'?!!t.due_date&&t.due_date<f.today&&t.status!=='done':!t.due_date))&&(f.category==='all'||(f.category==='none'?!t.project_id:t.project_id===f.category))&&(f.status==='all'||(f.status==='open'?t.status!=='done':t.status===f.status))).sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999')||(a.due_time||'99').localeCompare(b.due_time||'99'))
}
export function groupTasks<T extends Groupable>(tasks:T[],by:string){const groups=new Map<string,T[]>();for(const task of tasks){const key=by==='category'?task.project_id||'none':task.due_date||'none';groups.set(key,[...(groups.get(key)||[]),task])}return [...groups.entries()]}
