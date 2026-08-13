import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/postpartum-reproduction-summary.js','utf8')

test('resumo pós-parto mantém limites de 45 e 80 dias',()=>{
  assert.match(source,/WINDOW_START=45/)
  assert.match(source,/PRIORITY_START=80/)
})

test('prioridades mostram dias pós-parto e ação recomendada',()=>{
  assert.match(source,/dias pós-parto/)
  assert.match(source,/Registar IA/)
  assert.match(source,/Prioridade alta/)
})

test('módulo continua restrito à página Reprodução e ao farm_id',()=>{
  assert.match(source,/title==='reprodução'/)
  assert.match(source,/\.eq\('farm_id',FARM_ID\)/)
})
