import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const agenda=fs.readFileSync('src/farm-agenda.js','utf8')
const index=fs.readFileSync('index.html','utf8')

test('agenda agrega reprodução e saúde',()=>{
  assert.match(agenda,/reproduction/)
  assert.match(agenda,/health_records/)
  assert.match(agenda,/expected_dry_off/)
  assert.match(agenda,/expected_calving/)
  assert.match(agenda,/milk_withdrawal_until/)
})

test('agenda cobre diagnósticos, secagens, partos e carências',()=>{
  for(const label of ['Diagnóstico','Secagem','Parto','Fim carência leite','Fim carência carne']) assert.match(agenda,new RegExp(label))
})

test('agenda é carregada pela app',()=>{assert.match(index,/farm-agenda\.js/)})
