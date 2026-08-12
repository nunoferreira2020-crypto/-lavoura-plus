import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const dashboard = fs.readFileSync('src/dashboard-smart.js', 'utf8')
const insights = fs.readFileSync('src/milk-insights.js', 'utf8')

test('dashboard usa limites na unidade x1000 do relatório', () => {
  assert.match(dashboard, /somatic_cells\)>=300/)
  assert.match(dashboard, /analysis\.cfu\)>=50/)
  assert.match(dashboard, /×1000/)
  assert.doesNotMatch(dashboard, />=300000/)
  assert.doesNotMatch(dashboard, />=50000/)
})

test('resumo das análises usa os mesmos limites x1000', () => {
  assert.match(insights, /cells>=300/)
  assert.match(insights, /cfu>=50/)
  assert.match(insights, /Células somáticas \(×1000\)/)
  assert.match(insights, /UFC \(×1000\)/)
})
