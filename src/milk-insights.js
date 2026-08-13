const STYLE_ID='milk-insights-style'
const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let rendering=false

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return
  const style=document.createElement('style')
  style.id=STYLE_ID
  style.textContent=`
    .milk-insights{margin:16px 0;padding:0;overflow:hidden;border-radius:20px;background:#fff;border:1px solid #e1e7e2;box-shadow:0 3px 14px rgba(24,53,35,.07)}
    .milk-insights-head{padding:18px;background:linear-gradient(135deg,#245c3b,#34754e);color:#fff}
    .milk-insights-head h2{margin:0;color:#fff;font-size:19px}.milk-insights-head p{margin:5px 0 0;color:rgba(255,255,255,.8);font-size:12px}
    .milk-insights-body{padding:14px}
    .milk-insight-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .milk-insight-card{padding:13px;border-radius:15px;background:#f7faf8;border:1px solid #e5ebe6;min-width:0}
    .milk-insight-card strong{display:block;font-size:21px;line-height:1.1;margin:5px 0;color:#17231c;letter-spacing:-.02em}
    .milk-insight-label{font-size:11px;color:#6d786f;font-weight:750;line-height:1.25}
    .milk-insight-trend{display:block;font-size:11px;font-weight:850;margin-bottom:5px}.milk-insight-trend.up{color:#9a6900}.milk-insight-trend.down{color:#245c3b}.milk-insight-trend.flat{color:#6d786f}
    .milk-insight-alert{margin-top:9px;padding:11px 12px;border-radius:13px;background:#fff5da;color:#815a00;border:1px solid #f0dfad;font-weight:800;font-size:12px}
    .milk-insight-note{margin:12px 2px 1px;font-size:11px;color:#78827b;line-height:1.4}
    @media(max-width:390px){.milk-insight-card{padding:11px}.milk-insight-card strong{font-size:19px}.milk-insight-grid{gap:7px}}
  `
  document.head.appendChild(style)
}

function isAnalysisScreen(){const text=document.querySelector('main')?.textContent||'';return text.includes('Análises do leite')||text.includes('Nova análise')&&text.includes('Células somáticas')}
function n(value){const x=Number(value);return Number.isFinite(x)?x:null}
function fmt(value,decimals=0){return value==null?'—':Number(value).toLocaleString('pt-PT',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}
function avg(rows,key){const values=rows.map(r=>n(r[key])).filter(v=>v!=null);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
function trend(latest,previous,key){const a=n(latest?.[key]),b=n(previous?.[key]);if(a==null||b==null)return{text:'Sem comparação',cls:'flat'};const diff=a-b;if(Math.abs(diff)<.0001)return{text:'→ igual à anterior',cls:'flat'};return diff>0?{text:`↑ ${fmt(Math.abs(diff),key==='fat'||key==='protein'?2:0)} vs anterior`,cls:'up'}:{text:`↓ ${fmt(Math.abs(diff),key==='fat'||key==='protein'?2:0)} vs anterior`,cls:'down'}}
function alerts(latest){const result=[];const cells=n(latest?.somatic_cells),cfu=n(latest?.cfu);if(cells!=null&&cells>=300)result.push(`⚠️ Células somáticas elevadas: ${fmt(cells,0)} ×1000`);if(cfu!=null&&cfu>=50)result.push(`⚠️ UFC elevada: ${fmt(cfu,0)} ×1000`);return result}

async function renderInsights(){
  if(rendering||!isAnalysisScreen()||document.querySelector('.milk-insights'))return
  const supabase=window.lavouraSupabase;if(!supabase)return
  const target=[...document.querySelectorAll('h2')].find(h=>h.textContent.includes('Histórico'))?.closest('section');if(!target)return
  rendering=true
  try{
    const {data,error}=await supabase.from('milk_analyses').select('analysis_date,fat,protein,somatic_cells,cfu').eq('farm_id',FARM_ID).order('analysis_date',{ascending:false}).limit(12);if(error)throw error
    const rows=data||[];if(!rows.length)return
    const latest=rows[0],previous=rows[1],recent=rows.slice(0,Math.min(5,rows.length))
    const configs=[{key:'fat',label:'Gordura',suffix:'%',decimals:2},{key:'protein',label:'Proteína',suffix:'%',decimals:2},{key:'somatic_cells',label:'Células somáticas · ×1000',suffix:'',decimals:0},{key:'cfu',label:'UFC · ×1000',suffix:'',decimals:0}]
    const notices=alerts(latest);const section=document.createElement('section');section.className='milk-insights'
    section.innerHTML=`<div class="milk-insights-head"><h2>🥛 Qualidade do leite</h2><p>Última análise e evolução recente</p></div><div class="milk-insights-body"><div class="milk-insight-grid">${configs.map(c=>{const t=trend(latest,previous,c.key);const a=avg(recent,c.key);return `<div class="milk-insight-card"><span class="milk-insight-label">${c.label}</span><strong>${fmt(latest[c.key],c.decimals)}${n(latest[c.key])!=null?c.suffix:''}</strong><span class="milk-insight-trend ${t.cls}">${t.text}</span><div class="milk-insight-label">Média ${recent.length}: ${fmt(a,c.decimals)}${a!=null?c.suffix:''}</div></div>`}).join('')}</div>${notices.map(x=>`<div class="milk-insight-alert">${x}</div>`).join('')}<p class="milk-insight-note">Comparação com a análise anterior e média das últimas ${recent.length}. Os avisos são indicadores de atenção, não um diagnóstico.</p></div>`
    target.insertAdjacentElement('beforebegin',section)
  }catch(error){console.error('Resumo das análises do leite:',error)}finally{rendering=false}
}
ensureStyle();new MutationObserver(renderInsights).observe(document.body,{childList:true,subtree:true});renderInsights()
