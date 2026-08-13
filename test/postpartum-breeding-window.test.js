import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/postpartum-breeding-window.js','utf8')

test('janela pós-parto usa 45 dias e prioridade aos 80 dias',()=>{
  assert.match(source,/BREEDING_WINDOW_START=45/)
  assert.match(source,/OVERDUE_START=80/)
  assert.match(source,/days<BREEDING_WINDOW_START/)
  assert.match(source,/days<OVERDUE_START/)
})

test('só considera nova IA posterior ao último parto',()=>{
  assert.match(source,/dateKey\(e\.event_date\)>dateKey\(animal\.last_calving_date\)/)
})

test('leituras de animais e reprodução estão isoladas por exploração',()=>{
  const filters=source.match(/\.eq\('farm_id',FARM_ID\)/g)||[]
  assert.ok(filters.length>=2,'esperava farm_id nas duas leituras principais')
})

test('mostra estados de recuperação, janela, prioridade e nova IA',()=>{
  assert.match(source,/recovery/)
  assert.match(source,/window/)
  assert.match(source,/overdue/)
  assert.match(source,/Nova IA registada/)
})
