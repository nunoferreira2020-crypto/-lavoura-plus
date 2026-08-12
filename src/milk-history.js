import './milk-history.css'

const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
const CHARTS=[
  {key:'fat',title:'Gordura',suffix:'%',decimals:2},
  {key:'protein',title:'Proteína',suffix:'%',decimals:2},
  {key:'somatic_cells',title:'Células somáticas',suffix:'',decimals:0},
  {key:'cfu',title:'UFC',suffix:'',decimals:0}
]

let rendering=false

function ptNumber(value,decimals){
  const n=Number(value)
  if(!Number.isFinite(n))return '—'
  return n.toLocaleString('pt-PT',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})
}

function shortDate(value){
  if(!value)return ''
  const [y,m,d]=String(value).split('-')
  return d&&m?`${d}/${m}`:String(value)
}

function chartSvg(rows,config){
  const points=rows.map(r=>({date:r.analysis_date,value:Number(r[config.key])})).filter(p=>Number.isFinite(p.value))
  if(points.length<2)return '<p class="milk-chart-empty">Guarde pelo menos 2 análises para ver a evolução.</p>'
  const w=320,h=150,padX=28,padY=22
  const values=points.map(p=>p.value),min0=Math.min(...values),max0=Math.max(...values)
  const spread=Math.max(max0-min0,config.decimals?0.1:1)
  const min=min0-spread*.15,max=max0+spread*.15
  const x=i=>padX+(i*(w-padX*2)/(points.length-1))
  const y=v=>padY+((max-v)*(h-padY*2)/(max-min))
  const poly=points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')
  const dots=points.map((p,i)=>`<circle class="milk-chart-dot" cx="${x(i)}" cy="${y(p.value)}" r="3.5"><title>${shortDate(p.date)}: ${ptNumber(p.value,config.decimals)}${config.suffix}</title></circle>`).join('')
  const first=points[0],last=points.at(-1)
  return `<svg class="milk-chart-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Evolução de ${config.title}">
    <line class="milk-chart-gridline" x1="${padX}" y1="${padY}" x2="${w-padX}" y2="${padY}"/>
    <line class="milk-chart-gridline" x1="${padX}" y1="${h-padY}" x2="${w-padX}" y2="${h-padY}"/>
    <polyline class="milk-chart-line" points="${poly}"/>
    ${dots}
    <text class="milk-chart-label" x="${padX}" y="${h-5}">${shortDate(first.date)}</text>
    <text class="milk-chart-label" text-anchor="end" x="${w-padX}" y="${h-5}">${shortDate(last.date)}</text>
    <text class="milk-chart-value" x="2" y="${padY+3}">${ptNumber(max0,config.decimals)}</text>
    <text class="milk-chart-value" x="2" y="${h-padY+3}">${ptNumber(min0,config.decimals)}</text>
  </svg>`
}

function isMilkAnalysisScreen(){
  const text=document.querySelector('main')?.textContent||''
  return text.includes('Análises do leite')||text.includes('Nova análise')&&text.includes('Células somáticas')
}

async function renderMilkHistoryCharts(){
  if(rendering||!isMilkAnalysisScreen()||document.querySelector('.milk-history-charts'))return
  const supabase=window.lavouraSupabase
  if(!supabase)return
  const historyHeading=[...document.querySelectorAll('h2')].find(h=>h.textContent.trim()==='Histórico')
  if(!historyHeading)return
  rendering=true
  try{
    const {data,error}=await supabase.from('milk_analyses').select('analysis_date,fat,protein,somatic_cells,cfu').eq('farm_id',FARM_ID).order('analysis_date',{ascending:true})
    if(error)throw error
    const rows=data||[]
    const section=document.createElement('section')
    section.className='milk-history-charts'
    section.innerHTML=`<h2>📈 Evolução</h2><div class="milk-chart-grid">${CHARTS.map(config=>{
      const valid=rows.filter(r=>Number.isFinite(Number(r[config.key])))
      const latest=valid.at(-1)?.[config.key]
      return `<article class="milk-chart-card"><div class="milk-chart-head"><div><h3>${config.title}</h3><div class="milk-chart-sub">${valid.length} análise(s) guardada(s)</div></div><div class="milk-chart-latest">${ptNumber(latest,config.decimals)}${latest!==undefined?config.suffix:''}</div></div>${chartSvg(rows,config)}</article>`
    }).join('')}</div>`
    historyHeading.closest('section')?.insertAdjacentElement('beforebegin',section)
  }catch(error){console.error('Gráficos das análises do leite:',error)}finally{rendering=false}
}

const observer=new MutationObserver(()=>renderMilkHistoryCharts())
observer.observe(document.body,{childList:true,subtree:true})
renderMilkHistoryCharts()
