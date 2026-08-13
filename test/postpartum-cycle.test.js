import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/postpartum-cycle.js','utf8')

test('pós-parto trabalha apenas com a exploração atual',()=>{
  assert.match(source,/from\('animals'\)[\s\S]*?eq\('farm_id',FARM_ID\)/)
  assert.match(source,/from\('reproduction'\)[\s\S]*?eq\('farm_id',FARM_ID\)/)
  assert.match(source,/update\(\{result:'Parto concluído',expected_calving:null,expected_dry_off:null\}\)[\s\S]*?eq\('farm_id',FARM_ID\)/)
  assert.match(source,/update\(\{last_calving_date:dateKey\(latestCalving\.event_date\)\}\)[\s\S]*?eq\('farm_id',FARM_ID\)/)
})

test('parto posterior à IA encerra o ciclo sem apagar o evento histórico',()=>{
  assert.match(source,/latestCalving=events\.find\(e=>e\.event_type==='PARTO'\)/)
  assert.match(source,/latestIa=events\.find\(e=>e\.event_type==='IA'\)/)
  assert.match(source,/isAfterOrEqual\(latestCalving\.event_date,latestIa\.event_date\)/)
  assert.match(source,/result:'Parto concluído'/)
  assert.match(source,/expected_calving:null/)
  assert.match(source,/expected_dry_off:null/)
})
