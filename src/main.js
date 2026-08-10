import './style.css'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://oegbnvwwrudnskycgbdl.supabase.co'
const SUPABASE_KEY = 'sb_publishable_b86gGWtrtFM2MVhU_-h10g_5vttckRp'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})
window.lavouraSupabase = supabase
const app = document.querySelector('#app')

let cows = []
let voltarDetalhe = 'animais'

function formatDate(data) {
  if (!data) return '—'

  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function hoje() {
  const agora = new Date()

  return new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  )
}

function diasAte(data) {
  if (!data) return 9999

  const [ano, mes, dia] = data.split('-')

  const destino = new Date(
    Number(ano),
    Number(mes) - 1,
    Number(dia)
  )

  return Math.round(
    (destino.getTime() - hoje().getTime()) /
    86400000
  )
}

function textoDias(dias) {
  if (dias < 0) {
    return `${Math.abs(dias)} dias atrasado`
  }

  if (dias === 0) return 'HOJE'
  if (dias === 1) return 'AMANHÃ'

  return `em ${dias} dias`
}

/* LOGIN */

function loginScreen(mensagem = '') {
  app.innerHTML = `
    <main class="app">

      <h1>🐄 Lavoura+</h1>
      <p class="subtitle">Acesso seguro</p>

      <section class="card">

        <h2>Entrar</h2>

        <p>
          Entre na sua conta para aceder
          aos dados da exploração.
        </p>

        <input
          id="email"
          class="search"
          type="email"
          placeholder="Email"
          autocomplete="email"
        >

        <input
          id="password"
          class="search"
          type="password"
          placeholder="Palavra-passe"
          autocomplete="current-password"
        >

        <button
          data-action="login"
        >
          Entrar
        </button><button
  type="button"
  data-action="forgot-password"

>
  Esqueci-me da palavra-passe
</button>

        <p
          id="loginMsg"
          class="muted"
        >
          ${mensagem}
        </p>

      </section>

    </main>
  `
}
async function forgotPassword() {
  const email = document.querySelector('#email').value.trim()
  const msg = document.querySelector('#loginMsg')

  if (!email) {
    msg.textContent = 'Introduza primeiro o seu email.'
    return
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  })

  if (error) {
    msg.textContent = 'Erro: ' + error.message
    return
  }

  msg.textContent = 'Email de recuperação enviado. Verifique a sua caixa de entrada.'
}
window.forgotPassword = forgotPassword
async function login() {
  const email =
    document.querySelector('#email').value.trim()

  const password =
    document.querySelector('#password').value

  const msg =
    document.querySelector('#loginMsg')

  if (!email || !password) {
    msg.textContent =
      'Introduza email e palavra-passe.'
    return
  }

  msg.textContent = 'A entrar…'

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    })

  if (error) {
    msg.textContent =
      'Email ou palavra-passe incorretos.'
    return
  }

  await carregarDados()
}

/* 2FA */

async function verificarSeguranca() {
  app.innerHTML = `
    <main class="app">
      <section class="card">
        <h2>🔐 A verificar segurança…</h2>
      </section>
    </main>
  `

  const { data, error } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()

  if (error) {
    loginScreen('Erro ao verificar segurança.')
    return
  }


  if (data.currentLevel === 'aal2') {
    await carregarDados()
    return
  }

  if (data.nextLevel === 'aal2') {
    await pedirCodigo2FA()
    return
  }

  app.innerHTML = `
    <main class="app">

      <h1>🔐 Segurança</h1>

      <section class="card">

        <h2>2FA necessário</h2>

        <p>
          Esta conta ainda não tem
          autenticação de dois fatores
          disponível.
        </p>

        <button data-action="logout">
          Sair
        </button>

      </section>

    </main>
  `
}

async function pedirCodigo2FA() {
  const { data, error } =
    await supabase.auth.mfa.listFactors()

  if (error) {
    loginScreen('Não foi possível verificar o 2FA.')
    return
  }

  const factor =
    data.totp?.find(
      f => f.status === 'verified'
    )

  if (!factor) {
    app.innerHTML = `
      <main class="app">

        <h1>🔐 Segurança</h1>

        <section class="card">
          <p>
            Não foi encontrado um autenticador
            2FA verificado.
          </p>

          <button data-action="logout">
            Sair
          </button>
        </section>

      </main>
    `
    return
  }

  app.innerHTML = `
    <main class="app">

      <h1>🔐 Verificação</h1>

      <section class="card">

        <h2>Código de segurança</h2>

        <p>
          Abra o Google Authenticator
          e introduza o código atual.
        </p>

        <input
          id="codigo2fa"
          class="search"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          autocomplete="one-time-code"
        >

        <button
          data-action="confirmar-2fa"
          data-factor="${factor.id}"
        >
          Continuar
        </button>

        <p
          id="mfaMsg"
          class="muted"
        ></p>

      </section>

    </main>
  `
}

async function confirmar2FA(factorId) {
  const codigo =
    document.querySelector('#codigo2fa')
      .value.trim()

  const msg =
    document.querySelector('#mfaMsg')

  if (!/^\d{6}$/.test(codigo)) {
    msg.textContent =
      'Introduza o código de 6 dígitos.'
    return
  }

  msg.textContent = 'A verificar…'

  const challenge =
    await supabase.auth.mfa.challenge({
      factorId
    })

  if (challenge.error) {
    msg.textContent =
      'Erro ao criar verificação.'
    return
  }

  const verify =
    await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: codigo
    })

  if (verify.error) {
    msg.textContent =
      'Código incorreto ou expirado.'
    return
  }

  await carregarDados()
}

/* DADOS REAIS DO SUPABASE */

async function carregarDados() {
  app.innerHTML = `
    <main class="app">
      <section class="card">
        <h2>🐄 A carregar a exploração…</h2>
      </section>
    </main>
  `

  const animals =
    await supabase
      .from('animals')
      .select(`
        id,
        number,
        breed,
        status,
        notes
      `)
      .order('number')

  if (animals.error) {
    erroDados(animals.error.message)
    return
  }

  const reproduction =
    await supabase
      .from('reproduction')
      .select(`
        animal_id,
        event_type,
        event_date,
        bull,
        semen_type,
        result,
        expected_calving,
        expected_dry_off,
        notes,
        created_at
      `)
      .order('event_date', {
        ascending: false
      })

  if (reproduction.error) {
    erroDados(reproduction.error.message)
    return
  }

  cows = animals.data.map(animal => {
    const repro =
      reproduction.data.find(
        r =>
  r.animal_id === animal.id &&
  r.event_type === 'IA'
      )

    return {
      uuid: animal.id,
      id: animal.number,
      raca: animal.breed || '—',
      status: animal.status,
      ia: repro?.event_date || null,
      touro: repro?.bull || '—',
      parto: repro?.expected_calving || null,
      secagem: repro?.expected_dry_off || null,
      notas: animal.notes || ''
    }
  })

  inicio()
}

function erroDados(texto) {
  app.innerHTML = `
    <main class="app">

      <h1>⚠️ Lavoura+</h1>

      <section class="card">

        <h2>Não foi possível abrir os dados</h2>

        <p class="muted">
          ${texto}
        </p>

        <button data-action="tentar-novamente">
          Tentar novamente
        </button>

      </section>

    </main>
  `
}

/* ALERTAS */

function obterAlertas() {
  const eventos = []

  cows.forEach(vaca => {
    const ds = diasAte(vaca.secagem)
    const dp = diasAte(vaca.parto)

    if (vaca.secagem &&
        ds >= -7 &&
        ds <= 30) {

      eventos.push({
        tipo: 'Secagem',
        icon: '🟠',
        data: vaca.secagem,
        dias: ds,
        vaca
      })
    }

    if (vaca.parto &&
        dp >= -7 &&
        dp <= 30) {

      eventos.push({
        tipo: 'Parto',
        icon: '🔵',
        data: vaca.parto,
        dias: dp,
        vaca
      })
    }
  })

  return eventos.sort(
    (a, b) => a.dias - b.dias
  )
}

/* INÍCIO */

function inicio() {
  const eventos = obterAlertas()

  app.innerHTML = `
    <main class="app">

      <h1>🐄 Lavoura+</h1>

      <p class="subtitle">
        Gestão da Exploração
      </p>

      <h2>Painel Principal</h2>

      <section class="card">

        <h2>🔔 Alertas</h2>

        <p>
          <strong>${eventos.length}</strong>
          eventos importantes
        </p>

        <button data-action="alertas">
          Ver alertas
        </button>

      </section>

      <section class="card">

        <h2>🐄 Vacas</h2>

        <p>
          <strong>${cows.length} animais</strong>
          registados
        </p>

        <button data-action="animais">
          Ver animais
        </button>

      </section>

      <section class="card">

        <h2>🥛 Produção</h2>

        <p>
          Registo e acompanhamento
          da produção de leite.
        </p>

      </section>

      <section class="card">

        <h2>📅 Reprodução</h2>

        <p>
          Inseminações, diagnósticos,
          secagens e partos.
        </p>

      </section>

      <section class="card">

        <h2>🔐 Conta</h2>

        <p>
          Sessão protegida com 2FA.
        </p>

        <button data-action="logout">
          Sair
        </button>

      </section>

    </main>
  `
}

/* LISTA DE ALERTAS */

function alertas() {
  const eventos = obterAlertas()

  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>🔔 Alertas</h1>

      <p class="subtitle">
        Próximos 30 dias
      </p>

      ${
        eventos.length
          ? eventos.map(evento => `

              <section
                class="cow-card alerta"
                data-action="detalhe"
                data-id="${evento.vaca.id}"
                data-voltar="alertas"
              >

                <div>

                  <strong>
                    ${evento.icon}
                    ${evento.tipo}
                  </strong>

                  <div>
                    🐄 ${evento.vaca.id}
                  </div>

                  <div class="muted">
                    ${evento.vaca.raca}
                  </div>

                </div>

                <div class="right">

                  <strong>
                    ${formatDate(evento.data)}
                  </strong>

                  <div class="${
                    evento.dias <= 3
                      ? 'urgente'
                      : 'muted'
                  }">
                    ${textoDias(evento.dias)}
                  </div>

                </div>

              </section>

            `).join('')

          : `
            <section class="card">
              ✅ Sem alertas para os
              próximos 30 dias.
            </section>
          `
      }

    </main>
  `
}

/* ANIMAIS */

function animais() {
  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>🐄 Animais</h1>

      <p class="subtitle">
        ${cows.length} vacas
      </p>

      <input
        id="pesquisa"
        class="search"
        placeholder="Pesquisar vaca, touro ou raça…"
      >

      <div id="lista"></div>

    </main>
  `

  listar('')

  document
    .querySelector('#pesquisa')
    .addEventListener('input', e => {
      listar(e.target.value)
    })
}

function listar(texto) {
  const q =
    texto.toLowerCase().trim()

  const resultado =
    cows.filter(vaca =>
      `${vaca.id} ${vaca.touro} ${vaca.raca}`
        .toLowerCase()
        .includes(q)
    )

  document.querySelector('#lista')
    .innerHTML =
    resultado.map(vaca => `

      <section
        class="cow-card"
        data-action="detalhe"
        data-id="${vaca.id}"
        data-voltar="animais"
      >

        <div>

          <strong>
            🐄 ${vaca.id}
          </strong>

          <div class="muted">
            ${vaca.raca}
          </div>

          <div class="muted">
            Touro: ${vaca.touro}
          </div>

        </div>

        <div class="right">

          <strong>Parto</strong>

          <div>
            ${formatDate(vaca.parto)}
          </div>

        </div>

      </section>

    `).join('')
}

/* FICHA DA VACA */

function detalhe(id, voltar = 'animais') {
  const vaca =
    cows.find(v => v.id === id)

  if (!vaca) {
    inicio()
    return
  }

  voltarDetalhe = voltar

  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="voltar-detalhe"
      >
        ← Voltar
      </button>

      <section class="card hero">

        <p class="muted">
          Animal
        </p>

        <h1>
          🐄 ${vaca.id}
        </h1>

        <p>
          ${vaca.raca}
        </p>

      </section>

      <section class="card details">

        <div>
          <span>Última IA</span>
          <strong>${formatDate(vaca.ia)}</strong>
        </div>

        <div>
          <span>Touro</span>
          <strong>${vaca.touro}</strong>
        </div>

        <div>
          <span>Raça</span>
          <strong>${vaca.raca}</strong>
        </div>

        <div>
          <span>Parto previsto</span>
          <strong>${formatDate(vaca.parto)}</strong>
        </div>

        <div>
          <span>Secagem</span>
          <strong>${formatDate(vaca.secagem)}</strong>
        </div>

      </section>

      <section class="card">

        <h2>Registos</h2>

        <button
          data-action="secagem"
          data-id="${vaca.id}"
        >
          ✅ Marcar secagem realizada
        </button>

        <br><br>

        <button
          data-action="parto"
          data-id="${vaca.id}"
        >
          🐄 Registar parto
        </button>

        <br><br>

        <button
          data-action="inseminacao"
          data-id="${vaca.id}"
        >
          ➕ Nova inseminação
        </button>

      </section>

    </main>
  `
}

/* CLIQUES */

app.addEventListener('click', async event => {
  const elemento =
    event.target.closest('[data-action]')

  if (!elemento) return

  const action =
    elemento.dataset.action

  if (action === 'login') {
    await login()
  }
else if (action === 'forgot-password') {
  await forgotPassword()
}
  else if (action === 'confirmar-2fa') {
    await confirmar2FA(
      elemento.dataset.factor
    )
  }

  else if (action === 'inicio') {
    inicio()
  }

  else if (action === 'animais') {
    animais()
  }

  else if (action === 'alertas') {
    alertas()
  }

  else if (action === 'detalhe') {
    detalhe(
      elemento.dataset.id,
      elemento.dataset.voltar
    )
  }

  else if (action === 'voltar-detalhe') {
    voltarDetalhe === 'alertas'
      ? alertas()
      : animais()
  }

  else if (action === 'logout') {
    await supabase.auth.signOut()
    loginScreen('Sessão terminada.')
  }

  else if (action === 'tentar-novamente') {
    await carregarDados()
  }

  if (action === 'secagem') {
  const animalId = elemento.dataset.id

  const { data: animal, error: animalError } = await supabase
    .from('animals')
    .select('id, farm_id')
    .eq('number', animalId)
    .single()

  if (animalError) {
    alert('Erro ao localizar a vaca: ' + animalError.message)
    return
  }

  const hoje = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('reproduction')
    .insert({
      farm_id: animal.farm_id,
      animal_id: animal.id,
      event_type: 'SECAGEM',
      event_date: hoje
    })

  if (error) {
    alert('Erro ao guardar a secagem: ' + error.message)
    return
  }

  alert('✅ Secagem registada com sucesso.')
  await carregarDados()
}
  
  
  else if (action === 'parto') {
  const animalNumero = elemento.dataset.id

  const { data: animal, error: animalError } = await supabase
    .from('animals')
    .select('id, farm_id')
    .eq('number', animalNumero)
    .single()

  if (animalError) {
    alert('Erro ao localizar a vaca: ' + animalError.message)
    return
  }

  const hoje = new Date().toISOString().slice(0, 10)

const dataParto = prompt(
  'Data do parto (AAAA-MM-DD):',
  hoje
)

if (!dataParto) return

const confirmar = confirm(
  `Confirmar parto da vaca ${animalNumero} em ${dataParto}?`
)

if (!confirmar) return

  const { error: partoError } = await supabase
    .from('reproduction')
    .insert({
      farm_id: animal.farm_id,
      animal_id: animal.id,
      event_type: 'PARTO',
      event_date: dataParto
    })

  if (partoError) {
    alert('Erro ao guardar o parto: ' + partoError.message)
    return
  }

  const { error: animalUpdateError } = await supabase
    .from('animals')
    .update({
      last_calving_date: dataParto
    })
    .eq('id', animal.id)

  if (animalUpdateError) {
    alert('Parto guardado, mas houve erro ao atualizar a vaca: ' + animalUpdateError.message)
    return
  }

    alert('🐄 Parto registado com sucesso.')
  await carregarDados()
}

else if (action === 'inseminacao') {
  const animalNumero = elemento.dataset.id

  const { data: animal, error: animalError } = await supabase
    .from('animals')
    .select('id, farm_id')
    .eq('number', animalNumero)
    .single()

  if (animalError) {
    alert('Erro ao localizar a vaca: ' + animalError.message)
    return
  }

  const hoje = new Date().toISOString().slice(0, 10)

  const dataIA = prompt(
    'Data da inseminação (AAAA-MM-DD):',
    hoje
  )

  if (!dataIA) return

  const touro = prompt(
    'Nome do touro:',
    ''
  )

  if (!touro) return

  const confirmar = confirm(
    `Confirmar inseminação da vaca ${animalNumero} em ${dataIA} com o touro ${touro}?`
  )

  if (!confirmar) return

  const dataPrevista = new Date(dataIA + 'T12:00:00')
  dataPrevista.setDate(dataPrevista.getDate() + 283)

  const partoPrevisto = dataPrevista
    .toISOString()
    .slice(0, 10)

  const dataSecagem = new Date(dataPrevista)
  dataSecagem.setDate(dataSecagem.getDate() - 60)

  const secagemPrevista = dataSecagem
    .toISOString()
    .slice(0, 10)

  const { error } = await supabase
    .from('reproduction')
    .insert({
      farm_id: animal.farm_id,
      animal_id: animal.id,
      event_type: 'IA',
      event_date: dataIA,
      bull: touro,
      expected_calving: partoPrevisto,
      expected_dry_off: secagemPrevista
    })

  if (error) {
    alert('Erro ao guardar a inseminação: ' + error.message)
    return
  }

  alert('✅ Inseminação registada com sucesso.')
  await carregarDados()
}
})

/* ARRANQUE */

async function arrancar() {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    loginScreen()
    return
  }

  await verificarSeguranca()
}

arrancar()
