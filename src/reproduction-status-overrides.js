// Estados atuais confirmados pelo produtor. Prevalecem sobre IA históricas.
const CURRENT_REPRO_STATUS=Object.freeze({
  '4284':{status:'VAZIA'},
  '5803':{status:'SECA'},
  '3204':{status:'SECA'},
  '9700':{status:'PRENHE'},
  '4444':{status:'PARIU',eventDate:'2026-08-06'},
  '6810':{status:'VAZIA'},
  '6359':{status:'PRENHE'},
  '7752':{status:'VAZIA'},
})

const COLORS={VAZIA:'#e31b23',PARIU:'#e31b23',SECA:'#39a94b',PRENHE:'#1687e8'}

function polar(cx,cy,r,deg){const a=(deg-90)*Math.PI/180;return{x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)}}
function daysSince(date){if(!date)return null;const a=new Date(`${date}T12:00:00`),b=new Date();b.setHours(12,0,0,0);return Math.max(0,Math.round((b-a)/86400000))}

function moveToZone(g,entry,index){
  const circle=g.querySelector('circle');if(!circle)return
  const oldX=Number(circle.getAttribute('cx')),oldY=Number(circle.getAttribute('cy'))
  if(!Number.isFinite(oldX)||!Number.isFinite(oldY))return
  let day=null
  if(entry.status==='PARIU')day=Math.min(82,daysSince(entry.eventDate)??10)
  else if(entry.status==='VAZIA')day=48+index*9
  else if(entry.status==='SECA')day=248+index*10
  else if(entry.status==='PRENHE')day=165+index*13
  if(!Number.isFinite(day))return
  const deg=180+(day/283)*360
  const p=polar(300,305,190-(index%4)*18,deg)
  g.setAttribute('transform',`translate(${p.x-oldX} ${p.y-oldY})`)
}

function applyCurrentReproStatus(){
  const wheel=document.querySelector('[data-reproduction-wheel]');if(!wheel)return
  const counters={VAZIA:0,PARIU:0,SECA:0,PRENHE:0}
  wheel.querySelectorAll('g[aria-label]').forEach(g=>{
    const label=g.getAttribute('aria-label')||''
    const number=Object.keys(CURRENT_REPRO_STATUS).find(n=>new RegExp(`(?:^|\\D)${n}(?:$|\\D)`).test(label))
    if(!number)return
    const entry=CURRENT_REPRO_STATUS[number],status=entry.status
    g.dataset.currentReproStatus=status
    g.setAttribute('aria-label',`${label.replace(/ — (VAZIA|SECA|PRENHE|PARIU).*$/,'')} — ${status}`)
    const circle=g.querySelector('circle'),text=g.querySelector('text')
    if(circle){circle.setAttribute('fill',COLORS[status]);circle.setAttribute('stroke','#111');circle.setAttribute('stroke-width','1')}
    if(text)text.setAttribute('fill','#fff')
    moveToZone(g,entry,counters[status]++)
  })
}

applyCurrentReproStatus()
new MutationObserver(applyCurrentReproStatus).observe(document.body,{childList:true,subtree:true})
