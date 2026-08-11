import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(
  new URL('../src/main.js', import.meta.url),
  'utf8'
)

const appClickHandler = source.slice(
  source.indexOf("app.addEventListener(\n  'click'"),
  source.indexOf('/* =========================================================\n   PESQUISA DE ANIMAIS')
)

test('o menu Mais encaminha relatórios e análises pelo gestor da aplicação', () => {
  assert.match(
    appClickHandler,
    /action ===\s*'analises-leite'[\s\S]*?analisesLeiteScreen\(\)/
  )
  assert.match(
    appClickHandler,
    /action ===\s*'relatorios'[\s\S]*?relatoriosScreen\(\)/
  )
})

test('o gestor global fica limitado à barra de navegação inferior', () => {
  assert.match(
    source,
    /document\.addEventListener\('click',[\s\S]*?closest\('\.bottom-nav-item'\)/
  )
  assert.doesNotMatch(
    source,
    /closest\('\.bottom-nav-item, \[data-action\]'\)/
  )
})

test('a página de análises disponibiliza formulário e fotografia sem leitura automática', () => {
  assert.match(source, /id="milkAnalysisForm"/)
  assert.match(source, /name="record_date"/)
  assert.match(source, /name="fat"/)
  assert.match(source, /name="protein"/)
  assert.match(source, /name="somatic_cells"/)
  assert.match(source, /name="ufc"/)
  assert.match(source, /name="notes"/)
  assert.match(source, /accept="image\/\*"/)
  assert.match(source, /capture="environment"/)
  assert.match(source, /nenhum valor foi preenchido/)
})
