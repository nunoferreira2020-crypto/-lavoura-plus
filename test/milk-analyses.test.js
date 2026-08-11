import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(
  new URL('../src/main.js', import.meta.url),
  'utf8'
)

test('as análises são persistidas e apresentadas por ordem cronológica', () => {
  assert.match(source, /\.from\('milk_analyses'\)[\s\S]*?\.insert\(payload\)/)
  assert.match(source, /\.order\('analysis_date',[\s\S]*?ascending:\s*false/)
})

test('o formulário inclui todos os campos e seleção de fotografia sem leitura automática', () => {
  for (const id of [
    'analysisDate',
    'analysisFat',
    'analysisProtein',
    'analysisSomaticCells',
    'analysisCfu',
    'analysisNotes'
  ]) {
    assert.match(source, new RegExp(`id="${id}"`))
  }

  assert.match(source, /accept="image\/\*" capture="environment"/)
  assert.match(source, /leitura automática ainda não está disponível/)
})

test('as observações são protegidas antes de entrarem no histórico HTML', () => {
  assert.match(source, /function escaparHTML\(valor\)/)
  assert.match(source, /escaparHTML\(analise\.notes\)/)
})
