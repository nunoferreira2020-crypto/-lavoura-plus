import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const main=fs.readFileSync('src/main.js','utf8')
const security=fs.readFileSync('src/settings-security.js','utf8')

const requiredActions=[
  'inicio','animais','reproducao','producao','financas','rentabilidade',
  'definicoes','analises-leite','relatorios','mais','logout'
]

for(const action of requiredActions){
  test(`navegação trata a ação ${action}`,()=>{
    assert.match(main,new RegExp(`action ===\\s*['\"]${action}['\"]`))
  })
}

test('logout termina a sessão pelo Supabase',()=>{
  assert.match(main,/supabase\.auth[\s\S]*?\.signOut\(\)/)
})

test('backup inclui as tabelas essenciais da exploração',()=>{
  for(const table of ['animals','reproduction','milk_records','milk_analyses','finance_records','budget_items']){
    assert.match(security,new RegExp(`['\"]${table}['\"]`))
  }
  assert.match(security,/\.eq\(['\"]farm_id['\"],FARM_ID\)/)
  assert.match(security,/application\/json/)
  assert.match(security,/lavoura-backup-/)
})
