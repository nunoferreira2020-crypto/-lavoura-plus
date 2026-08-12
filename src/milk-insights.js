const STYLE_ID='milk-insights-style'
const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let rendering=false

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const style=document.createElement('style')
  style.id=STYLE_ID
  style.textContent=`
    .milk-insights{margin:14px 0;padding:16px;border-radius:18px;background:#fff;box-shadow:0 5px 18px rgba(0,0,0,.06)}
    .milk-insights h2{margin:0 0 12px}
    .milk-insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .milk-insight-card{padding:12px;border-radius:14px;background:#f6f8f6}
    .milk-insight-card strong{display:block;font-size:20px;margin:3px 0}
    .milk-insight-label{font-size:12px;color:#66706a;font-weight:700}
    .milk-insight-trend{font-size:12px;font-weight:800}
    .milk-insight-trend.up{color:#9a5c00}.milk-insight-trend.down{color:#2f6f44}.milk-insight-trend.flat{color:#66706a}
    .milk-insight-alert{margin-top:10px;padding:10px 12px;border-radius:12px;background:#fff6e8;font-weight:800;font-size:13px}
    .milk-insight-note{margin:12px 0 0;font-size:12px;color:#66706a}
  `
  document.head.appendChild(style)
}

function isAnalysisScreen(){
  const text=document.querySelector('main')?.textContent||''
  return text.includes('Análises do leite')||text.includes('Nova análise')&&text.includes('Células somáticas')
}

function n(value){const x=Number(value);return Number.isFinite(x)?x:null}
function fmt(value,decimals=0){return value==null?'—':Number(value).toLocaleString('pt-PT',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}
function avg(rows,key){const values=rows.map(r=>n(r[key])).filter(v=>v!=null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function trend(latest,previous,key){
  const a=n(latest?.[key]),b=n(previous?.[key])
  if(a==null||b==null)return {text:'Sem comparação',cls:'flat'}
  const diff=a-b
  if(Math.abs(diff)<.0001)return {text:'→ igual à anterior',cls:'flat'}
  return diff>0?{text:`↑ ${fmt(Math.abs(diff),key==='fat'||key==='protein'?2:0)} vs anterior`,cls:'up'}:{text:`↓ ${fmt(Math.abs(diff),key==='fat'||key==='protein'?2:0)} vs anterior`,cls:'down'}
}
function alerts(latest){
  const result=[]
  const cells=n(latest?.somatic_cells),cfu=n(latest?.cfu)
  if(cells!=null&&cells>=300)result.push(`⚠️ Células somáticas elevadas: ${fmt(cells,0)} ×1000`)
  if(cfu!=null&&cfu>=50)result.push(`⚠️ UFC elevada: ${fmt(cfu,0)} ×1000`)
  return result
}

async function renderInsights(){
  if(rendering||!isAnalysisScreen()||document.querySelector('.milk-insights'))return
  const supabase=window.lavouraSupabase
  if(!supabase)return
  const target=[...document.querySelectorAll('h2')].find(h=>h.textContent.includes('Histórico'))?.closest('section')
  if(!target)return
  rendering=true
  try{
    const {data,error}=await supabase.from('milk_analyses').select('analysis_date,fat,protein,somatic_cells,cfu').eq('farm_id',FARM_ID).order('analysis_date',{ascending:false}).limit(12)
    if(error)throw error
    const rows=data||[]
    if(!rows.length)return
    const latest=rows[0],previous=rows[1],recent=rows.slice(0,Math.min(5,rows.length))
    const configs=[
      {key:'fat',label:'Gordura',suffix:'%',decimals:2},
      {key:'protein',label:'Proteína',suffix:'%',decimals:2},
      {key:'somatic_cells',label:'Células somáticas (×1000)',suffix:'',decimals:0},
      {key:'cfu',label:'UFC (×1000)',suffix:'',decimals:0}
    ]
    const notices=alerts(latest)
    const section=document.createElement('section')
    section.className='milk-insights'
    section.innerHTML=`
      <h2>📊 Resumo rápido</h2>
      <div class="milk-insight-grid">
        ${configs.map(c=>{const t=trend(latest,previous,c.key);return `<div class="milk-insight-card"><span class="milk-insight-label">${c.label}</span><strong>${fmt(latest[c.key],c.decimals)}${n(latest[c.key])!=null?c.suffix:''}</strong><span class="milk-insight-trend ${t.cls}">${t.text}</span><div class="milk-insight-label">Média últimas ${recent.length}: ${fmt(avg(recent,c.key),c.decimals)}${avg(recent,c.key)!=null?c.suffix:''}</div></div>`}).join('')}
      </div>
      ${notices.map(x=>`<div class="milk-insight-alert">${x}</div>`).join('')}
      <p class="milk-insight-note">Compara a análise mais recente com a anterior e calcula a média das últimas ${recent.length} análises guardadas. Células somáticas e UFC usam a unidade ×1000 do relatório. Os alertas são indicadores de atenção, não um diagnóstico.</p>
    `
    target.insertAdjacentElement('beforebegin',section)
  }catch(error){console.error('Resumo das análises do leite:',error)}finally{rendering=false}
}

ensureStyle()
new MutationObserver(renderInsights).observe(document.body,{childList:true,subtree:true})
renderInsights()
