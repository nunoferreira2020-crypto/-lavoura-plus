import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const health=fs.readFileSync('src/health-tools.js','utf8')
const dashboard=fs.readFileSync('src/health-dashboard.js','utf8')
const index=fs.readFileSync('index.html','utf8')
const security=fs.readFileSync('src/settings-security.js','utf8')

test('módulo de saúde guarda dados essenciais por vaca',()=>{
  for(const field of ['animal_id','event_date','category','diagnosis','medication','dose','route','milk_withdrawal_until','meat_withdrawal_until','cost','notes']) assert.match(health,new RegExp(field))
  assert.match(health,/health_records/)
})

test('carências do leite aparecem como alerta de segurança',()=>{
  assert.match(dashboard,/milk_withdrawal_until/)
  assert.match(dashboard,/leite em carência/i)
  assert.match(dashboard,/health_records/)
})

test('saúde é carregada e entra no backup',()=>{
  assert.match(index,/health-tools\.js/)
  assert.match(index,/health-dashboard\.js/)
  assert.match(security,/health_records/)
})
