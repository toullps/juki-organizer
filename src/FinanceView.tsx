import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus, Wallet, X } from 'lucide-react'
import { supabase } from './supabase'

type Transaction = { id:string; title:string; amount_cents:number; kind:'income'|'expense'; occurred_on:string; category:string|null; created_at:string }
type Debt = { id:string; person_name:string; description:string|null; direction:'owe'|'receivable'; amount_cents:number; due_on:string|null; created_at:string }
type Payment = { id:string; debt_id:string; amount_cents:number; paid_on:string }
type Props = { userId:string }
const money=(c:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100)
const dateNow=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const cents=(v:string)=>{const normalized=v.replace(/\s/g,'').replace(/\./g,'').replace(',','.');const n=Number(normalized);return Number.isFinite(n)&&n>0?Math.round(n*100):0}
const dateLabel=(v:string)=>new Date(v+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})

export function FinanceView({userId}:Props){
 const [month,setMonth]=useState(dateNow().slice(0,7)),[transactions,setTransactions]=useState<Transaction[]>([]),[debts,setDebts]=useState<Debt[]>([]),[payments,setPayments]=useState<Payment[]>([])
 const [mode,setMode]=useState<'transaction'|'debt'|'payment'|null>(null),[selectedDebt,setSelectedDebt]=useState<Debt|null>(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const [title,setTitle]=useState(''),[value,setValue]=useState(''),[kind,setKind]=useState<'income'|'expense'>('expense'),[category,setCategory]=useState(''),[date,setDate]=useState(dateNow()),[direction,setDirection]=useState<'owe'|'receivable'>('owe')
 async function load(){
  if(!supabase)return
  setLoading(true)
  const [t,d,p]=await Promise.all([
   supabase.from('finance_transactions').select('*').eq('owner_id',userId).order('occurred_on',{ascending:false}),
   supabase.from('finance_debts').select('*').eq('owner_id',userId).order('created_at',{ascending:false}),
   supabase.from('finance_debt_payments').select('*').eq('owner_id',userId)
  ])
  if(t.error||d.error||p.error)setError('Não foi possível carregar as finanças. Verifique se a migração do módulo foi aplicada no Supabase.')
  else {setTransactions(t.data||[]);setDebts(d.data||[]);setPayments(p.data||[]);setError('')}
  setLoading(false)
 }
 useEffect(()=>{void load()},[userId])
 const monthly=useMemo(()=>transactions.filter(t=>t.occurred_on.startsWith(month)),[transactions,month])
 const income=monthly.filter(t=>t.kind==='income').reduce((a,t)=>a+t.amount_cents,0)
 const expense=monthly.filter(t=>t.kind==='expense').reduce((a,t)=>a+t.amount_cents,0)
 const paid=(id:string)=>payments.filter(p=>p.debt_id===id).reduce((sum,p)=>sum+p.amount_cents,0)
 const close=()=>{setMode(null);setSelectedDebt(null);setTitle('');setValue('');setCategory('');setDate(dateNow());setNotice('')}
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(!supabase)return
  const amount=cents(value);if(!amount){setNotice('Digite um valor maior que zero.');return}
  setBusy(true);setNotice('')
  let result:{error:any}
  if(mode==='transaction'){if(!title.trim()){setNotice('Preencha a descrição.');setBusy(false);return}result=await supabase.from('finance_transactions').insert({owner_id:userId,title:title.trim(),kind,category:category.trim()||null,amount_cents:amount,occurred_on:date})}
  else if(mode==='debt'){if(!title.trim()){setNotice('Informe o nome da pessoa.');setBusy(false);return}result=await supabase.from('finance_debts').insert({owner_id:userId,person_name:title.trim(),description:category.trim()||null,direction,amount_cents:amount,due_on:date||null})}
  else if(selectedDebt){const remaining=selectedDebt.amount_cents-paid(selectedDebt.id);if(amount>remaining){setNotice('O pagamento não pode ultrapassar o saldo em aberto.');setBusy(false);return}result=await supabase.from('finance_debt_payments').insert({owner_id:userId,debt_id:selectedDebt.id,amount_cents:amount,paid_on:date})}
  else {setBusy(false);return}
  setBusy(false)
  if(result.error)setNotice(result.error.message)
  else {close();await load()}
 }
 const monthName=new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
 return <div className="fin-page">
  <div className="page-head fin-heading"><div><p className="eyebrow">finanças</p><h1>{monthName}</h1><p>{monthly.length} {monthly.length===1?'lançamento':'lançamentos'} no mês · {debts.length} {debts.length===1?'dívida em aberto':'dívidas e valores a receber'}</p></div><button className="primary" onClick={()=>setMode('transaction')}><Plus size={17}/> novo lançamento</button></div>
  <div className="page-toolbar fin-toolbar"><label className="toolbar-field">mês <input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><button className="text-button" onClick={()=>setMode('debt')}>+ dívida ou valor a receber</button></div>
  <div className="fin-summary">
   <article><small>entradas no mês</small><strong>{money(income)}</strong><ArrowDownLeft size={19}/></article>
   <article><small>saídas no mês</small><strong>{money(expense)}</strong><ArrowUpRight size={19}/></article>
   <article className="fin-net"><small>resultado do mês</small><strong>{money(income-expense)}</strong><Wallet size={20}/></article>
  </div>
  {error&&<p role="alert" className="error-banner">{error}</p>}
  <div className="fin-columns">
   <section className="panel"><div className="section-title"><h2>movimentações</h2><span className="eyebrow">entradas & saídas</span></div>{loading?<p>carregando...</p>:monthly.length===0?<div className="fin-empty">sem lançamentos neste mês.<button className="text-button" onClick={()=>setMode('transaction')}>adicionar o primeiro</button></div>:<div className="fin-transactions">{monthly.map(t=><article key={t.id} className="fin-line"><div className={'fin-type '+t.kind}>{t.kind==='income'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</div><div><b>{t.title}</b><small>{t.category||'sem categoria'} · {dateLabel(t.occurred_on)}</small></div><strong className={t.kind==='income'?'positive':''}>{t.kind==='expense'?'−':'+'}{money(t.amount_cents)}</strong></article>)}</div>}</section>
   <section className="panel"><div className="section-title"><h2>a pagar e a receber</h2><button className="text-button" onClick={()=>setMode('debt')}>+ adicionar</button></div>{loading?<p>carregando...</p>:debts.length===0?<div className="fin-empty">nenhuma dívida registrada.</div>:<div className="fin-transactions">{debts.map(d=>{const remaining=Math.max(0,d.amount_cents-paid(d.id));return <article key={d.id} className="fin-debt"><div className="fin-debt-top"><div><b>{d.person_name}</b><small>{d.direction==='owe'?'você deve':'você tem a receber'}{d.due_on?' · vence '+dateLabel(d.due_on):''}</small></div><strong>{money(remaining)}</strong></div><div className="fin-debt-bottom"><span>{remaining===0?'quitado':money(paid(d.id))+' pagos de '+money(d.amount_cents)}</span>{remaining>0&&<button className="text-button" onClick={()=>{setSelectedDebt(d);setMode('payment')}}>registrar pagamento</button>}</div></article>})}</div>}</section>
  </div>
  <p className="fin-footnote"><CreditCard size={15}/> cartões e faturas serão incorporados sem contabilizar compras duas vezes.</p>
  {mode&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><div className="modal fin-modal"><div className="modal-head"><h2>{mode==='transaction'?'novo lançamento':mode==='debt'?'nova dívida':'registrar pagamento'}</h2><button className="icon-button soft" onClick={close} aria-label="fechar"><X size={18}/></button></div><form onSubmit={submit}>{mode==='transaction'&&<label>tipo<select value={kind} onChange={e=>setKind(e.target.value as 'income'|'expense')}><option value="expense">saída</option><option value="income">entrada</option></select></label>}{mode==='debt'&&<label>situação<select value={direction} onChange={e=>setDirection(e.target.value as 'owe'|'receivable')}><option value="owe">eu devo</option><option value="receivable">tenho a receber</option></select></label>}{mode!=='payment'&&<label>{mode==='debt'?'nome da pessoa':'descrição'}<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder={mode==='debt'?'ex.: amiga':'ex.: salário, mercado...'}/></label>}{mode!=='payment'&&<label>{mode==='debt'?'motivo (opcional)':'categoria (opcional)'}<input value={category} onChange={e=>setCategory(e.target.value)}/></label>}<label>valor em reais<input required inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} placeholder="0,00"/></label><label>{mode==='debt'?'vencimento':'data'}<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>{notice&&<p role="alert" className="error-banner">{notice}</p>}<button className="primary full" type="submit" disabled={busy}>{busy?'salvando...':'salvar'}</button></form></div></div>}
 </div>
}
