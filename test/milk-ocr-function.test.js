import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(
  new URL('../supabase/functions/analyze-milk-report/index.ts', import.meta.url),
  'utf8'
)

test('a função protege o fornecedor e exige utilizador autenticado', () => {
  assert.match(source, /Deno\.env\.get\('OPENAI_API_KEY'\)/)
  assert.doesNotMatch(source, /sk-[A-Za-z0-9]/)
  assert.match(source, /await supabase\.auth\.getUser\(\)/)
  assert.match(source, /store: false/)
})

test('valores com pouca confiança são removidos da resposta', () => {
  assert.match(source, /const threshold = 0\.75/)
  assert.match(source, /candidate\.confidence >= threshold/)
  assert.match(source, /validValue\(name, candidate\.value\)/)
  assert.match(source, /value: null/)
  assert.match(source, /Never infer or invent values/)
})
