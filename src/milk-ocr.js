import './milk-ocr.css'

const FIELD_MAP = {
  analysis_date: 'analysisDate',
  fat: 'analysisFat',
  protein: 'analysisProtein',
  somatic_cells: 'analysisSomaticCells',
  cfu: 'analysisCfu'
}

let tesseractPromise

function getMessage() { return document.querySelector('#fotografiaAnaliseMensagem') }
function setMessage(text, type = '') {
  const message = getMessage(); if (!message) return
  message.textContent = text
  message.classList.remove('loading', 'error'); message.classList.add('milk-ocr-message')
  if (type) message.classList.add(type)
}
function clearRecognizedState() { document.querySelectorAll('.ocr-recognized').forEach(f => f.classList.remove('ocr-recognized')) }

function ensureRecognitionButton() {
  const fileInput = document.querySelector('#fotografiaAnaliseLeite')
  if (!fileInput || fileInput.dataset.ocrReady === 'true') return
  fileInput.dataset.ocrReady = 'true'; fileInput.setAttribute('accept','image/*'); fileInput.removeAttribute('capture')
  const photoButton = document.querySelector('[data-action="fotografia-analise-leite"]'); if (!photoButton) return
  photoButton.textContent = '🖼️ Escolher fotografia ou captura de ecrã'
  let button = document.querySelector('#processarFotografiaAnalise')
  if (!button) { button=document.createElement('button'); button.id='processarFotografiaAnalise'; button.type='button'; button.hidden=true; button.className='milk-ocr-button'; button.textContent='✨ Ler novamente'; photoButton.insertAdjacentElement('afterend',button) }
  setMessage('Leitura gratuita. Pode usar várias capturas da mesma análise; os novos valores completam os campos já preenchidos.')
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract)
  if (tesseractPromise) return tesseractPromise
  tesseractPromise = new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.async=true; s.onload=()=>resolve(window.Tesseract); s.onerror=()=>reject(new Error('Não foi possível carregar o leitor gratuito.')); document.head.appendChild(s) })
  return tesseractPromise
}

function normalizeNumber(v) { if (!v) return null; const n=Number(String(v).replace(',','.')); return Number.isFinite(n)?n:null }
function validFieldValue(name,value) {
  if (value==null) return false
  if (name==='analysis_date') return /^20\d{2}-[01]\d-[0-3]\d$/.test(String(value))
  const n=Number(value); if (!Number.isFinite(n)||n<0) return false
  if (name==='fat') return n>=2&&n<=8
  if (name==='protein') return n>=2&&n<=6
  if (name==='somatic_cells'||name==='cfu') return Number.isInteger(n)&&n<=100000000
  return false
}

function parseGilX1000(lines, clean, fields) {
  // Capturas do GIL mostram duas colunas consecutivas:
  // X1000 (CÉL./ML) e X1000 (UFC/ML). Os valores apresentados são milhares.
  if (!/X\s*1000/i.test(clean) || !/(C[EÉ]L|CEL)/i.test(clean) || !/UFC/i.test(clean)) return

  const rows=[]
  for (const line of lines) {
    // Linhas OCR típicas: dia + células + UFC (ex.: 30 198 10).
    const nums=[...line.matchAll(/\b(\d{1,6})\b/g)].map(m=>Number(m[1]))
    if (nums.length>=3) {
      const day=nums[nums.length-3], cells=nums[nums.length-2], cfu=nums[nums.length-1]
      if (day>=1&&day<=31&&cells>=1&&cells<=5000&&cfu>=0&&cfu<=5000) rows.push({cells,cfu})
    } else if (nums.length===2) {
      const cells=nums[0], cfu=nums[1]
      if (cells>=50&&cells<=5000&&cfu>=0&&cfu<=5000) rows.push({cells,cfu})
    }
  }
  const row=rows.at(-1)
  if (row) {
    // O cabeçalho diz X1000: 198 significa 198.000 cél./ml e 10 significa 10.000 UFC/ml.
    if (fields.somatic_cells==null) fields.somatic_cells=row.cells*1000
    if (fields.cfu==null) fields.cfu=row.cfu*1000
  }
}

function parseMilkText(text) {
  const clean=text.replace(/\r/g,'').replace(/[|]/g,' ')
  const lines=clean.split('\n').map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean)
  const fields={}
  const labeledNumber=(labels,integer=false)=>{ const regex=new RegExp(`(?:${labels.join('|')})[^0-9]{0,20}([0-9]+(?:[.,][0-9]+)?)`,'i'); const m=clean.match(regex); if(!m)return null; const v=normalizeNumber(m[1]); return integer&&v!==null?Math.round(v):v }
  const fat=labeledNumber(['MG','gordura','mat[eé]ria\\s+gorda']); const protein=labeledNumber(['MP','prote[ií]na'])
  const somatic=labeledNumber(['c[eé]lulas\\s+som[aá]ticas','som[aá]ticas','CCS'],true); const cfu=labeledNumber(['UFC','germes','contagem\\s+total'],true)
  if(validFieldValue('fat',fat))fields.fat=fat; if(validFieldValue('protein',protein))fields.protein=protein
  // Só usamos leitura direta de CCS/UFC quando não é uma tabela X1000; nessa tabela precisamos aplicar x1000 e escolher uma linha de dados.
  if(!/X\s*1000/i.test(clean)){ if(validFieldValue('somatic_cells',somatic))fields.somatic_cells=somatic; if(validFieldValue('cfu',cfu))fields.cfu=cfu }

  const dm=clean.match(/\b(20\d{2})[-\/]([01]?\d)[-\/]([0-3]?\d)\b/)||clean.match(/\b([0-3]?\d)[-\/]([01]?\d)[-\/](20\d{2})\b/)
  if(dm){ const date=dm[1].length===4?`${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}`:`${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`; if(validFieldValue('analysis_date',date))fields.analysis_date=date }

  if((fields.fat==null||fields.protein==null)&&/\bMG\b/i.test(clean)&&/\bMP\b/i.test(clean)){
    const candidates=[]
    for(const line of lines){ const nums=[...line.matchAll(/\b([2-8][.,]\d{1,2})\b/g)].map(m=>normalizeNumber(m[1])).filter(v=>v!==null); for(let i=0;i<nums.length-1;i++){ if(validFieldValue('fat',nums[i])&&validFieldValue('protein',nums[i+1]))candidates.push([nums[i],nums[i+1]]) } }
    const pair=candidates.at(-1); if(pair){ if(fields.fat==null)fields.fat=pair[0]; if(fields.protein==null)fields.protein=pair[1] }
  }
  parseGilX1000(lines,clean,fields)
  return fields
}

function currentFieldIsUsable(name,input){ if(!input?.value)return false; if(name==='analysis_date')return validFieldValue(name,input.value); return validFieldValue(name,normalizeNumber(input.value)) }
function fillField(name,value,recognized,preserved){ if(!validFieldValue(name,value))return; const input=document.querySelector(`#${FIELD_MAP[name]}`); if(!input)return; if(currentFieldIsUsable(name,input)){preserved.push(name);return} input.value=String(value); input.classList.add('ocr-recognized'); recognized.push(name) }

async function recognizeMilkReport(){
  const input=document.querySelector('#fotografiaAnaliseLeite'), button=document.querySelector('#processarFotografiaAnalise'), file=input?.files?.[0]
  if(!file){setMessage('Escolha primeiro uma fotografia ou captura de ecrã.','error');return}
  if(button)button.disabled=true; clearRecognizedState(); setMessage('🔎 A fazer leitura gratuita da captura…','loading')
  try{
    const Tesseract=await loadTesseract(); const result=await Tesseract.recognize(file,'eng',{logger:p=>{if(p.status==='recognizing text'&&typeof p.progress==='number')setMessage(`🔎 A ler a captura… ${Math.round(p.progress*100)}%`,'loading')}})
    const fields=parseMilkText(result?.data?.text||''), recognized=[], preserved=[]; Object.keys(FIELD_MAP).forEach(n=>fillField(n,fields[n],recognized,preserved))
    if(!recognized.length){ if(preserved.length){setMessage('✅ A captura foi lida, mas os valores encontrados já estavam preenchidos. Pode escolher outra captura.');return} setMessage('Não encontrei valores seguros nesta captura. Tente aproximar a captura das colunas e dos valores.','error');return }
    const remaining=Object.entries(FIELD_MAP).filter(([,id])=>!document.querySelector(`#${id}`)?.value).map(([n])=>n)
    setMessage(remaining.length?`✅ ${recognized.length} campo(s) preenchido(s). Pode escolher outra captura para completar os ${remaining.length} campo(s) em falta.`:'✅ Análise preenchida. Confirme todos os valores antes de guardar.')
  }catch(e){console.error('OCR gratuito análises do leite:',e);setMessage(e?.message||'Não foi possível ler esta captura.','error')}finally{if(button)button.disabled=false}
}

const observer=new MutationObserver(()=>ensureRecognitionButton()); observer.observe(document.body,{childList:true,subtree:true}); ensureRecognitionButton()
document.addEventListener('change',e=>{if(e.target?.id!=='fotografiaAnaliseLeite')return;const b=document.querySelector('#processarFotografiaAnalise'),f=e.target.files?.[0];if(!b)return;if(!f){b.hidden=true;setMessage('Nenhuma imagem selecionada.');return}b.hidden=false;recognizeMilkReport()})
document.addEventListener('click',e=>{const b=e.target.closest('#processarFotografiaAnalise');if(!b)return;e.preventDefault();recognizeMilkReport()})
