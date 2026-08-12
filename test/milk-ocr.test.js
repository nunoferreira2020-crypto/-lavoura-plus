import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const frontend = fs.readFileSync('src/milk-ocr.js', 'utf8')
const edge = fs.readFileSync(
  'supabase/functions/analyze-milk-report/index.ts',
  'utf8'
)
const html = fs.readFileSync('index.html', 'utf8')

test('OCR usa o formulário existente e não guarda automaticamente', () => {
  assert.match(frontend, /fotografiaAnaliseLeite/)
  assert.match(frontend, /processarFotografiaAnalise/)
  assert.match(frontend, /analysisDate/)
  assert.match(frontend, /analysisFat/)
  assert.match(frontend, /analysisProtein/)
  assert.match(frontend, /analysisSomaticCells/)
  assert.match(frontend, /analysisCfu/)
  assert.doesNotMatch(frontend, /\.from\(['"]milk_analyses['"]\)\.insert/)
})

test('OCR usa Tesseract no browser e mantém segredos fora do frontend', () => {
  assert.match(frontend, /tesseract\.js/)
  assert.match(frontend, /Tesseract\.recognize/)
  assert.doesNotMatch(frontend, /OPENAI_API_KEY/)
})

test('OCR valida datas reais do calendário', () => {
  assert.match(frontend, /function isValidISODate/)
  assert.match(frontend, /Date\.UTC/)
  assert.match(frontend, /getUTCFullYear/)
  assert.match(frontend, /getUTCMonth/)
  assert.match(frontend, /getUTCDate/)
})

test('Edge Function legada continua protegida caso volte a ser utilizada', () => {
  assert.match(edge, /Authorization/)
  assert.match(edge, /auth\.getUser\(\)/)
  assert.match(edge, /Deno\.env\.get\(['"]OPENAI_API_KEY['"]\)/)
  assert.match(edge, /threshold\s*=\s*0\.75/)
  assert.match(edge, /analysis_date/)
  assert.match(edge, /somatic_cells/)
  assert.match(edge, /cfu/)
})

test('módulo OCR é carregado pela aplicação', () => {
  assert.match(html, /\/src\/milk-ocr\.js/)
})
