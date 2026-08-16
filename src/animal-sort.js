const FARM_ID='72bb5d54-f614-4394-8da9-7113a8e48a29'
let busy=false

function parseDate(text){const m=String(text||'').match(/(\d{2})\/(\d{2})\/(\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:''}
function cards(list){return [...list.children].filter(el=>el.matches?.('[data-animal-id], .animal-card, .cow-card, button, a')).filter(el=>/🐄|IA:/i.test(el.textContent||''))}
function nameOf(card){const lines=(card.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean);return lines.find(x=>!/^🐄?\s*\d+$/.test(x)&&!/^IA:/i.test(x)&&!/^Holstein|^Jersey|^SECA$|^PRENHE$/i.test(x))||''}

async function sortCards(select,list){
 const all=cards(list);if(!all.length)return
 if(select.value==='name'){all.sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'pt',{sensitivity:'base'}));all.forEach(x=>list.appendChild(x));return}
 const sb=window.lavouraSupabase;if(!sb)return
 const numbers=all.map(c=>(c.innerText||'').match(/\b\d{3,}\b/)?.[0]).filter(Boolean)
 const {data:animals}=await sb.from('animals').select('id,number').eq('farm_id',FARM_ID).in('number',numbers)
 const ids=(animals||[]).map(a=>a.id);if(!ids.length)return
 const {data:events}=await sb.from('reproduction').select('animal_id,event_type,event_date,expected_dry_off').eq('farm_id',FARM_ID).in('animal_id',ids)
 const byNumber=new Map((animals||[]).map(a=>[String(a.number),a.id]));const dates=new Map()
 for(const c of all){const n=(c.innerText||'').match(/\b\d{3,}\b/)?.[0];const id=byNumber.get(n);const ev=(events||[]).filter(e=>e.animal_id===id)
  if(select.value==='ia'){const ia=ev.filter(e=>e.event_type==='IA').sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date)))[0];dates.set(c,ia?.event_date||'9999-12-31')}
  else {const ia=ev.filter(e=>e.event_type==='IA'&&e.expected_dry_off).sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date)))[0];const sec=ev.filter(e=>e.event_type==='SECAGEM').sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date)))[0];dates.set(c,ia?.expected_dry_off||sec?.event_date||'9999-12-31')}
 }
 all.sort((a,b)=>String(dates.get(a)).localeCompare(String(dates.get(b))));all.forEach(x=>list.appendChild(x))
}

function mount(){if(busy)return;const main=document.querySelector('#app main');const list=main?.querySelector('#animalList');if(!main||!list||main.querySelector('#animal-sort'))return
 busy=true;const wrap=document.createElement('div');wrap.style.cssText='margin:12px 0 16px';wrap.innerHTML='<label for="animal-sort" style="display:block;font-weight:800;margin-bottom:7px">Ordenar animais</label><select id="animal-sort" style="width:100%;min-height:48px;border:1px solid #d8e2da;border-radius:14px;padding:0 14px;background:white;font-size:16px"><option value="">Número do brinco</option><option value="name">Nome da vaca (A–Z)</option><option value="ia">Data de inseminação</option><option value="dry">Data de secagem</option></select>'
 list.parentNode.insertBefore(wrap,list);wrap.querySelector('select').addEventListener('change',e=>sortCards(e.target,list));busy=false
}
mount();let q=false;new MutationObserver(()=>{if(q)return;q=true;queueMicrotask(()=>{q=false;mount()})}).observe(document.body,{childList:true,subtree:true})
