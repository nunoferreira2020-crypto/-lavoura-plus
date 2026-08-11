import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMilkAnalysisPayload,
  getMilkAnalysisRecords,
  getMilkAnalysisSummary,
  getMilkMetricTrend
} from '../src/milk-analysis.js'

const records = [
  { record_date: '2026-07-11', fat: 4, protein: 3.5, somatic_cells: 200, ufc: 15 },
  { record_date: '2026-06-11', liters: 700 },
  { record_date: '2026-08-11', fat: 4.2, protein: 3.4, somatic_cells: 180, ufc: 12 }
]

test('filtra produção sem resultados de análise e calcula médias', () => {
  assert.equal(getMilkAnalysisRecords(records).length, 2)
  assert.equal(getMilkAnalysisRecords(records)[0].record_date, '2026-08-11')
  assert.deepEqual(getMilkAnalysisSummary(records), {
    fat: 4.1,
    protein: 3.45,
    somatic_cells: 190,
    ufc: 13.5
  })
})

test('calcula a evolução entre as duas análises mais recentes', () => {
  assert.equal(getMilkMetricTrend(records, 'fat'), 'up')
  assert.equal(getMilkMetricTrend(records, 'protein'), 'down')
  assert.equal(getMilkMetricTrend(records, 'somatic_cells'), 'down')
})

test('normaliza os valores antes de persistir no Supabase', () => {
  assert.deepEqual(
    buildMilkAnalysisPayload({
      record_date: '2026-08-11',
      fat: '4.20',
      protein: '3.40',
      somatic_cells: '180.4',
      ufc: '12.2',
      notes: '  Resultado mensal  '
    }, 'farm-id'),
    {
      farm_id: 'farm-id',
      record_date: '2026-08-11',
      fat: 4.2,
      protein: 3.4,
      somatic_cells: 180,
      ufc: 12,
      notes: 'Resultado mensal'
    }
  )
})
