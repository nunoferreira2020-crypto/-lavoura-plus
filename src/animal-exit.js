import { supabase } from './supabase.js'

const REASONS = ['Morte', 'Venda', 'Abate', 'Outro']

function currentAnimal() {
  const heading = document.querySelector('main.app h1')
  const info = [...document.querySelectorAll('main.app .card')].find(card => card.textContent.includes('Informação'))
  if (!heading || !info) return null
  const match = info.textContent.match(/Número\s+([^\s]+)/i)
  const number = match?.[1]?.trim()
  if (!number) return null
  return { number, heading: heading.textContent.trim() }
}

async function registerExit(animal) {
  const reasonRaw = prompt(`Motivo da baixa de ${animal.heading}:\n\n1 - Morte\n2 - Venda\n3 - Abate\n4 - Outro\n\nEscreva 1, 2, 3 ou 4.`)
  if (reasonRaw === null) return
  const reason = REASONS[Number(reasonRaw) - 1]
  if (!reason) return alert('Motivo inválido.')

  const date = prompt('Data da baixa (AAAA-MM-DD):', new Date().toISOString().slice(0, 10))
  if (date === null) return
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert('Data inválida. Use AAAA-MM-DD.')

  const notes = prompt('Observações (opcional):', '')
  if (notes === null) return

  if (!confirm(`Registar ${animal.heading} como baixa por ${reason} em ${date}?\n\nO histórico será mantido.`)) return

  const { data: membership, error: memberError } = await supabase
    .from('farm_members').select('farm_id, role').limit(1).maybeSingle()
  if (memberError || !membership?.farm_id) return alert('Não foi possível confirmar a exploração.')
  if (!['owner', 'admin'].includes(String(membership.role || '').toLowerCase())) return alert('Sem permissão para registar baixas.')

  const { data, error } = await supabase
    .from('animals')
    .update({ exit_date: date, exit_reason: reason, exit_notes: notes.trim() || null, status: 'Baixa' })
    .eq('farm_id', membership.farm_id)
    .eq('number', animal.number)
    .select('id')
    .maybeSingle()

  if (error || !data) return alert('Não foi possível registar a baixa.')
  alert(`Baixa registada: ${animal.heading} — ${reason}. O histórico foi mantido.`)
  window.location.hash = '#animais'
  window.location.reload()
}

function mountExitButton() {
  const animal = currentAnimal()
  if (!animal || document.getElementById('animal-exit-button')) return
  const records = [...document.querySelectorAll('main.app .card')].find(card => card.textContent.includes('Registos'))
  if (!records) return
  const button = document.createElement('button')
  button.id = 'animal-exit-button'
  button.type = 'button'
  button.textContent = '📋 Registar baixa'
  button.style.cssText = 'width:100%;margin-top:14px;padding:16px;border:1px solid #a56b16;border-radius:14px;background:#fff7e8;color:#7a4b08;font-weight:800;font-size:17px;'
  button.addEventListener('click', () => registerExit(animal))
  records.appendChild(button)
}

mountExitButton()
let queued = false
new MutationObserver(() => {
  if (queued) return
  queued = true
  queueMicrotask(() => { queued = false; mountExitButton() })
}).observe(document.body, { childList: true, subtree: true })
