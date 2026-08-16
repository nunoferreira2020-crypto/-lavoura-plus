import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const moduleSource = await readFile(new URL('../src/overdue-pregnancy-diagnostics.js', import.meta.url), 'utf8')
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8')

test('diagnósticos sem resultado há mais de 60 dias ficam visíveis', () => {
  assert.match(moduleSource, /dias<=60/)
  assert.match(moduleSource, /MUITO ATRASADO/)
  assert.match(moduleSource, /IA sem diagnóstico há mais de 60 dias/)
})

test('diagnóstico atrasado ignora IA já fechada por parto posterior', () => {
  assert.match(moduleSource, /parto&&String\(parto\.event_date\)>=String\(ia\.event_date\)/)
})

test('módulo de diagnósticos atrasados está carregado na aplicação', () => {
  assert.match(index, /\/src\/overdue-pregnancy-diagnostics\.js/)
})
