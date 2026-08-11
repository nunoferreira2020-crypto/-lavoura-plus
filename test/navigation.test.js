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
