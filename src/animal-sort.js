const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let busy=false

function cards(list){return [...list.children].filter(el=>el.matches?.('[data-animal-id], .animal-card, .cow-card, button, a')).filter(el=>/🐄|IA:|Secagem:/i.test(el.textContent||''))}
function numberOf(card){return (card.innerText||'').match(/\b\d{3,}\b/)?.[0]||''}
function nameOf(card){const lines=(card.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean);return lines.find(x=>!/^🐄?\s*\d+$/.test(x)&&! /^(IA|Secagem):/i.test(x)&&!/^Holstein|^Jersey|^SECA$|^PRENHE$/i.test(x))||''}
function formatDatePT(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return value||'';const [y,m,d]=value.split('-');return `${d}/${m}/${y}`}
function metaTextNode(card){const walker=document.createTreeWalker(card,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())){if(/^\s*(IA|Secagem):/i.test(node.nodeValue||''))return node}return null}
function rememberMeta(card){if(card.dataset.sortOriginalMeta!==undefined)return;const node=metaTextNode(card);card.dataset.sortOriginalMeta=node?.nodeValue||''}
function restoreMeta(card){rememberMeta(card);const node=metaTextNode(card);if(node&&card.dataset.sortOriginalMeta)node.nodeValue=card.dataset.sortOriginalMeta}
function showDryOff(card,date){rememberMeta(card);const node=metaTextNode(card);if(node&&date)node.nodeValue=`Secagem: ${formatDatePT(date)}`}

async function sortCards(select,list){
 const all=cards(list);if(!all.length)return
 all.forEach(rememberMeta)

 if(select.value==='name'){
  all.forEach(restoreMeta)
  all.sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'pt',{sensitivity:'base'}));all.forEach(x=>list.appendChild(x));return
 }
 if(select.value===''){
  all.forEach(restoreMeta)
  all.sort((a,b)=>Number(numberOf(a)||Number.MAX_SAFE_INTEGER)-Number(numberOf(b)||Number.MAX_SAFE_INTEGER));all.forEach(x=>list.appendChild(x));return
 }

 const sb=window.lavouraSupabase;if(!sb)return
 const numbers=all.map(numberOf).filter(Boolean)
 const {data:animals}=await sb.from('animals').select('id,number,status').eq('farm_id',FARM_ID).in('number',numbers)
 const ids=(animals||[]).map(a=>a.id);if(!ids.length)return
 const {data:events}=await sb.from('reproduction').select('animal_id,event_type,event_date,expected_dry_off').eq('farm_id',FARM_ID).in('animal_id',ids)
 const byNumber=new Map((animals||[]).map(a=>[String(a.number),a]));const dates=new Map();const today=new Date().toISOString().slice(0,10)

 for(const c of all){
  const animal=byNumber.get(numberOf(c));const ev=(events||[]).filter(e=>e.animal_id===animal?.id)
  if(select.value==='ia'){
   restoreMeta(c)
   const ia=ev.filter(e=>e.event_type==='IA').sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date)))[0]
   dates.set(c,ia?.event_date||'9999-12-31')
  } else if(select.value==='dry'){
   const future=ev.filter(e=>e.event_type==='IA'&&e.expected_dry_off&&e.expected_dry_off>=today).sort((a,b)=>String(a.expected_dry_off).localeCompare(String(b.expected_dry_off)))[0]
   dates.set(c,future?.expected_dry_off||'9999-12-31')
   if(future?.expected_dry_off)showDryOff(c,future.expected_dry_off);else restoreMeta(c)
  }
 }
 all.sort((a,b)=>String(dates.get(a)||'9999-12-31').localeCompare(String(dates.get(b)||'9999-12-31')));all.forEach(x=>list.appendChild(x))
}

function mount(){if(busy)return;const main=document.querySelector('#app main');const list=main?.querySelector('#animalList');if(!main||!list||main.querySelector('#animal-sort'))return
 busy=true;const wrap=document.createElement('div');wrap.style.cssText='margin:12px 0 16px';wrap.innerHTML='<label for="animal-sort" style="display:block;font-weight:800;margin-bottom:7px">Ordenar animais</label><select id="animal-sort" style="width:100%;min-height:48px;border:1px solid #d8e2da;border-radius:14px;padding:0 14px;background:white;font-size:16px"><option value="">Número do brinco</option><option value="name">Nome da vaca (A–Z)</option><option value="ia">Data de inseminação</option><option value="dry">Data de secagem (próximas primeiro)</option></select>'
 list.parentNode.insertBefore(wrap,list);wrap.querySelector('select').addEventListener('change',e=>sortCards(e.target,list));busy=false
}
mount();let q=false;new MutationObserver(()=>{if(q)return;q=true;queueMicrotask(()=>{q=false;mount()})}).observe(document.body,{childList:true,subtree:true})
