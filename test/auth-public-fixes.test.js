import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const authFix=fs.readFileSync('src/auth-public-fixes.js','utf8')
const iphoneFix=fs.readFileSync('src/iphone-public-fixes.js','utf8')
const html=fs.readFileSync('index.html','utf8')

test('recuperação de password preserva o caminho público da app',()=>{
  assert.match(authFix,/new URL\('\.\/'\, document\.baseURI\)\.href/)
  assert.doesNotMatch(authFix,/window\.location\.origin/)
  assert.match(authFix,/resetPasswordForEmail/)
  assert.match(authFix,/redirectTo:recoveryRedirectUrl\(\)/)
})

test('existe apenas um módulo responsável pela recuperação de password',()=>{
  assert.doesNotMatch(iphoneFix,/resetPasswordForEmail/)
  assert.doesNotMatch(iphoneFix,/forgot-password/)
  assert.match(authFix,/forgot-password/)
})

test('correção pública de autenticação é carregada pela app',()=>{
  assert.match(html,/\/src\/auth-public-fixes\.js/)
})
