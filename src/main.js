import './style.css'
import { createClient } from '@supabase/supabase-js'


/* =========================================================
   LAVOURA+ 1.0
========================================================= */

const SUPABASE_URL =
  'https://oegbnvwwrudnskycgbdl.supabase.co'

const SUPABASE_KEY =
  'sb_publishable_b86gGWtrtFM2MVhU_-h10g_5vttckRp'

const FARM_ID =
  '72bb5d54-f614-4394-8da9-7113a8e48a29'


const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)


window.lavouraSupabase =
  supabase


const app =
  document.querySelector('#app')


let cows = []

let milkRecords = []

let milkMonthly = []

let financeRecords = []

let financeMonthly = []

let budgetItems = []

let dashboardData = null

let voltarDetalhe =
  'animais'

let recoveryMode =
  false



/* =========================================================
   UTILIDADES
========================================================= */

function formatDate(data) {

  if (!data) {
    return '—'
  }

  const partes =
    String(data).split('-')

  if (partes.length !== 3) {
    return data
  }

  const [ano, mes, dia] =
    partes

  return `${dia}/${mes}/${ano}`
}


function hojeISO() {

  return new Date()
    .toISOString()
    .slice(0, 10)
}


function hoje() {

  const agora =
    new Date()

  return new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  )
}


function diasAte(data) {

  if (!data) {
    return 9999
  }

  const [ano, mes, dia] =
    data.split('-')

  const destino =
    new Date(
      Number(ano),
      Number(mes) - 1,
      Number(dia)
    )

  return Math.round(
    (
      destino.getTime() -
      hoje().getTime()
    ) /
    86400000
  )
}


function textoDias(dias) {

  if (dias < 0) {

    const quantidade =
      Math.abs(dias)

    return quantidade === 1
      ? '1 dia atrasado'
      : `${quantidade} dias atrasado`
  }

  if (dias === 0) {
    return 'HOJE'
  }

  if (dias === 1) {
    return 'AMANHÃ'
  }

  return `em ${dias} dias`
}


function numero(
  valor,
  casas = 1
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return '—'
  }

  const n =
    Number(valor)

  if (Number.isNaN(n)) {
    return '—'
  }

  return n.toLocaleString(
    'pt-PT',
    {
      minimumFractionDigits:
        casas,

      maximumFractionDigits:
        casas
    }
  )
}


function euros(valor) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ''
  ) {
    return '—'
  }

  const n =
    Number(valor)

  if (Number.isNaN(n)) {
    return '—'
  }

  return n.toLocaleString(
    'pt-PT',
    {
      style:
        'currency',

      currency:
        'EUR'
    }
  )
}


function parseNumero(valor) {

  if (
    valor === null ||
    valor === undefined
  ) {
    return null
  }

  const n =
    Number(
      String(valor)
        .replace(',', '.')
    )

  return Number.isFinite(n)
    ? n
    : null
}


function dataValida(data) {

  return /^\d{4}-\d{2}-\d{2}$/
    .test(data)
}


function nomeEvento(tipo) {

  if (tipo === 'IA') {
    return '🧬 Inseminação'
  }

  if (tipo === 'SECAGEM') {
    return '🟠 Secagem'
  }

  if (tipo === 'PARTO') {
    return '🔵 Parto'
  }

  return tipo || 'Evento'
}


function nomeResultado(resultado) {

  if (!resultado) {
    return '—'
  }

  return resultado
}


function nomeFrequencia(
  frequencia
) {

  if (
    frequencia ===
    'monthly'
  ) {
    return 'por mês'
  }

  if (
    frequencia ===
    'weekly'
  ) {
    return 'por semana'
  }

  if (
    frequencia ===
    'yearly'
  ) {
    return 'por ano'
  }

  if (
    frequencia ===
    'per_event'
  ) {
    return 'por evento'
  }

  return frequencia || ''
}


function custoMensalItem(item) {

  const valor =
    Number(item.amount || 0)

  if (
    item.frequency ===
    'monthly'
  ) {
    return valor
  }

  if (
    item.frequency ===
    'weekly'
  ) {
    return valor * 52 / 12
  }

  if (
    item.frequency ===
    'yearly'
  ) {
    return valor / 12
  }

  return 0
}



/* =========================================================
   LOGIN
========================================================= */

function loginScreen(
  mensagem = ''
) {

  recoveryMode = false

  app.innerHTML = `
    <main class="app">

      <h1>
        🐄 Lavoura+
      </h1>

      <p class="subtitle">
        Gestão da Exploração
      </p>

      <section class="card">

        <h2>
          Entrar
        </h2>

        <p>
          Aceda aos dados
          da sua exploração.
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
        </button>

        <br><br>

        <button
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


async function login() {

  const email =
    document
      .querySelector('#email')
      .value
      .trim()

  const password =
    document
      .querySelector('#password')
      .value

  const msg =
    document
      .querySelector('#loginMsg')

  if (
    !email ||
    !password
  ) {

    msg.textContent =
      'Introduza email e palavra-passe.'

    return
  }

  msg.textContent =
    'A entrar…'

  const { error } =
    await supabase.auth
      .signInWithPassword({
        email,
        password
      })

  if (error) {

    msg.textContent =
      'Email ou palavra-passe incorretos.'

    return
  }

  await verificarSeguranca()
}



/* =========================================================
   RECUPERAÇÃO DA PASSWORD
========================================================= */

async function forgotPassword() {

  const email =
    document
      .querySelector('#email')
      .value
      .trim()

  const msg =
    document
      .querySelector('#loginMsg')

  if (!email) {

    msg.textContent =
      'Introduza primeiro o seu email.'

    return
  }

  msg.textContent =
    'A enviar email…'

  const { error } =
    await supabase.auth
      .resetPasswordForEmail(
        email,
        {
          redirectTo:
            window.location.origin
        }
      )

  if (error) {

    msg.textContent =
      'Erro: ' +
      error.message

    return
  }

  msg.textContent =
    '✅ Email de recuperação enviado.'
}


function recoveryScreen() {

  recoveryMode = true

  app.innerHTML = `
    <main class="app">

      <h1>
        🔑 Nova palavra-passe
      </h1>

      <section class="card">

        <input
          id="newPassword"
          class="search"
          type="password"
          placeholder="Nova palavra-passe"
        >

        <input
          id="confirmPassword"
          class="search"
          type="password"
          placeholder="Confirmar palavra-passe"
        >

        <button
          data-action="update-password"
        >
          Guardar nova palavra-passe
        </button>

        <p
          id="passwordMsg"
          class="muted"
        ></p>

      </section>

    </main>
  `
}


async function updatePassword() {

  const password =
    document
      .querySelector(
        '#newPassword'
      )
      .value

  const confirmar =
    document
      .querySelector(
        '#confirmPassword'
      )
      .value

  const msg =
    document
      .querySelector(
        '#passwordMsg'
      )

  if (
    !password ||
    password.length < 6
  ) {

    msg.textContent =
      'A palavra-passe deve ter pelo menos 6 caracteres.'

    return
  }

  if (
    password !==
    confirmar
  ) {

    msg.textContent =
      'As palavras-passe não são iguais.'

    return
  }

  msg.textContent =
    'A guardar…'

  const { error } =
    await supabase.auth
      .updateUser({
        password
      })

  if (error) {

    msg.textContent =
      'Erro: ' +
      error.message

    return
  }

  recoveryMode = false

  window.history
    .replaceState(
      {},
      document.title,
      window.location.pathname
    )

  msg.textContent =
    '✅ Palavra-passe alterada.'

  setTimeout(
    async () => {

      await verificarSeguranca()

    },
    800
  )
}



/* =========================================================
   2FA
========================================================= */

async function verificarSeguranca() {

  if (recoveryMode) {
    return
  }

  app.innerHTML = `
    <main class="app">

      <section class="card">
        <h2>
          🔐 A verificar segurança…
        </h2>
      </section>

    </main>
  `

  const {
    data,
    error
  } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()

  if (error) {

    loginScreen(
      'Erro ao verificar segurança.'
    )

    return
  }

  if (
    data.currentLevel ===
    'aal2'
  ) {

    await carregarDados()

    return
  }

  if (
    data.nextLevel ===
    'aal2'
  ) {

    await pedirCodigo2FA()

    return
  }

  await carregarDados()
}


async function pedirCodigo2FA() {

  const {
    data,
    error
  } =
    await supabase.auth.mfa
      .listFactors()

  if (error) {

    loginScreen(
      'Não foi possível verificar o 2FA.'
    )

    return
  }

  const factor =
    data.totp?.find(
      f =>
        f.status ===
        'verified'
    )

  if (!factor) {

    await carregarDados()

    return
  }

  app.innerHTML = `
    <main class="app">

      <h1>
        🔐 Verificação
      </h1>

      <section class="card">

        <p>
          Introduza o código
          do Google Authenticator.
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


async function confirmar2FA(
  factorId
) {

  const codigo =
    document
      .querySelector(
        '#codigo2fa'
      )
      .value
      .trim()

  const msg =
    document
      .querySelector(
        '#mfaMsg'
      )

  if (
    !/^\d{6}$/.test(
      codigo
    )
  ) {

    msg.textContent =
      'Introduza o código de 6 dígitos.'

    return
  }

  msg.textContent =
    'A verificar…'

  const challenge =
    await supabase.auth.mfa
      .challenge({
        factorId
      })

  if (challenge.error) {

    msg.textContent =
      'Erro ao criar verificação.'

    return
  }

  const verify =
    await supabase.auth.mfa
      .verify({
        factorId,

        challengeId:
          challenge.data.id,

        code:
          codigo
      })

  if (verify.error) {

    msg.textContent =
      'Código incorreto ou expirado.'

    return
  }

  await carregarDados()
}



/* =========================================================
   CARREGAMENTO CENTRAL
========================================================= */

async function carregarDados() {

  if (recoveryMode) {
    return
  }

  app.innerHTML = `
    <main class="app">

      <section class="card">
        <h2>
          🐄 A carregar a exploração…
        </h2>
      </section>

    </main>
  `


  const animals =
    await supabase
      .from('animals')
      .select(`
        id,
        farm_id,
        number,
        name,
        breed,
        status,
        birth_date,
        last_calving_date,
        notes
      `)
      .eq(
        'farm_id',
        FARM_ID
      )
      .order('number')


  if (animals.error) {

    erroDados(
      animals.error.message
    )

    return
  }


  const reproduction =
    await supabase
      .from('reproduction')
      .select(`
        id,
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
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'event_date',
        {
          ascending:
            false
        }
      )


  if (reproduction.error) {

    erroDados(
      reproduction.error.message
    )

    return
  }


  const milk =
    await supabase
      .from('milk_records')
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'record_date',
        {
          ascending:
            false
        }
      )
      .limit(100)


  if (milk.error) {

    erroDados(
      milk.error.message
    )

    return
  }


  const milkMonth =
    await supabase
      .from(
        'milk_monthly_summary'
      )
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'month',
        {
          ascending:
            false
        }
      )
      .limit(12)


  const finances =
    await supabase
      .from(
        'finance_records'
      )
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'record_date',
        {
          ascending:
            false
        }
      )
      .limit(150)


  const financeMonth =
    await supabase
      .from(
        'finance_monthly_summary'
      )
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'month',
        {
          ascending:
            false
        }
      )
      .limit(12)


  const budget =
    await supabase
      .from(
        'budget_items'
      )
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .eq(
        'active',
        true
      )
      .order(
        'category'
      )


  const dashboard =
    await supabase
      .from(
        'lavoura_v1_dashboard'
      )
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .maybeSingle()


  milkRecords =
    milk.data || []

  milkMonthly =
    milkMonth.error
      ? []
      : milkMonth.data || []

  financeRecords =
    finances.error
      ? []
      : finances.data || []

  financeMonthly =
    financeMonth.error
      ? []
      : financeMonth.data || []

  budgetItems =
    budget.error
      ? []
      : budget.data || []

  dashboardData =
    dashboard.error
      ? null
      : dashboard.data


  cows =
    animals.data.map(
      animal => {

        const eventos =
          reproduction.data
            .filter(
              evento =>
                evento.animal_id ===
                animal.id
            )
            .sort(
              (a, b) =>
                String(
                  b.event_date
                )
                .localeCompare(
                  String(
                    a.event_date
                  )
                )
            )


        const ultimaIA =
          eventos.find(
            evento =>
              evento.event_type ===
              'IA'
          )


        const ultimaSecagem =
          eventos.find(
            evento =>
              evento.event_type ===
              'SECAGEM'
          )


        const ultimoParto =
          eventos.find(
            evento =>
              evento.event_type ===
              'PARTO'
          )


        let partoPrevisto =
          ultimaIA
            ?.expected_calving ||
          null


        let secagemPrevista =
          ultimaIA
            ?.expected_dry_off ||
          null


        const resultadoIA =
          String(
            ultimaIA?.result || ''
          )
          .toLowerCase()


        if (
          resultadoIA.includes(
            'vazia'
          ) ||
          resultadoIA.includes(
            'negativ'
          )
        ) {

          partoPrevisto =
            null

          secagemPrevista =
            null
        }


        if (
          ultimaSecagem &&
          ultimaIA &&
          ultimaSecagem.event_date >=
            ultimaIA.event_date
        ) {

          secagemPrevista =
            null
        }


        if (
          ultimoParto &&
          ultimaIA &&
          ultimoParto.event_date >=
            ultimaIA.event_date
        ) {

          partoPrevisto =
            null

          secagemPrevista =
            null
        }


        return {

          uuid:
            animal.id,

          id:
            animal.number,

          nome:
            animal.name || '',

          raca:
            animal.breed || '—',

          status:
            animal.status || '—',

          nascimento:
            animal.birth_date,

          ultimoPartoAnimal:
            animal.last_calving_date,

          notas:
            animal.notes || '',

          ia:
            ultimaIA?.event_date ||
            null,

          iaId:
            ultimaIA?.id ||
            null,

          resultadoIA:
            ultimaIA?.result ||
            null,

          semen:
            ultimaIA?.semen_type ||
            null,

          touro:
            ultimaIA?.bull ||
            '—',

          parto:
            partoPrevisto,

          secagem:
            secagemPrevista,

          ultimaSecagem:
            ultimaSecagem
              ?.event_date ||
            null,

          ultimoParto:
            ultimoParto
              ?.event_date ||
            null,

          eventos
        }
      }
    )


  inicio()
}



function erroDados(texto) {

  app.innerHTML = `
    <main class="app">

      <h1>
        ⚠️ Lavoura+
      </h1>

      <section class="card">

        <h2>
          Não foi possível abrir os dados
        </h2>

        <p class="muted">
          ${texto}
        </p>

        <button
          data-action="tentar-novamente"
        >
          Tentar novamente
        </button>

      </section>

    </main>
  `
}



/* =========================================================
   ALERTAS
========================================================= */

function obterAlertas() {

  const eventos = []


  cows.forEach(
    vaca => {

      if (vaca.secagem) {

        const dias =
          diasAte(
            vaca.secagem
          )

        if (
          dias >= -7 &&
          dias <= 30
        ) {

          eventos.push({

            tipo:
              'Secagem',

            icon:
              '🟠',

            data:
              vaca.secagem,

            dias,

            vaca
          })
        }
      }


      if (vaca.parto) {

        const dias =
          diasAte(
            vaca.parto
          )

        if (
          dias >= -7 &&
          dias <= 30
        ) {

          eventos.push({

            tipo:
              'Parto',

            icon:
              '🔵',

            data:
              vaca.parto,

            dias,

            vaca
          })
        }
      }
    }
  )


  return eventos.sort(
    (a, b) =>
      a.dias -
      b.dias
  )
}



/* =========================================================
   PAINEL PRINCIPAL
========================================================= */

function inicio() {

  const alertasAtuais =
    obterAlertas()


  const leite =
    milkRecords[0] ||
    null


  const litros =
    dashboardData
      ?.latest_liters ??
    leite?.liters


  const vacasOrdenha =
    dashboardData
      ?.latest_milking_cows ??
    leite?.milking_cows


  const litrosVaca =
    dashboardData
      ?.latest_liters_per_cow ??
    (
      litros &&
      vacasOrdenha

        ? Number(litros) /
          Number(vacasOrdenha)

        : null
    )


  const saldo =
    dashboardData
      ?.month_balance ??
    financeMonthly[0]
      ?.balance ??
    0


  app.innerHTML = `
    <main class="app">

      <h1>
        🐄 Lavoura+
      </h1>

      <p class="subtitle">
        Gestão da Exploração
      </p>


      <section class="card">

        <h2>
          📊 Hoje
        </h2>

        <p>
          🐄
          <strong>
            ${cows.length}
          </strong>
          animais registados
        </p>

        <p>
          🥛
          <strong>
            ${numero(
              litros,
              0
            )} L
          </strong>
        </p>

        <p>
          🐄
          <strong>
            ${vacasOrdenha || '—'}
          </strong>
          vacas em ordenha
        </p>

        <p>
          📈
          <strong>
            ${numero(
              litrosVaca,
              1
            )}
            L/vaca
          </strong>
        </p>

      </section>


      <section class="card">

        <h2>
          🔔 Alertas
        </h2>

        <p>
          <strong>
            ${alertasAtuais.length}
          </strong>
          eventos importantes
        </p>

        <button
          data-action="alertas"
        >
          Ver alertas
        </button>

      </section>


      <section class="card">

        <h2>
          🐄 Animais
        </h2>

        <p>
          ${cows.length}
          fichas no rebanho
        </p>

        <button
          data-action="animais"
        >
          Ver animais
        </button>

      </section>


      <section class="card">

        <h2>
          📅 Reprodução
        </h2>

        <p>
          IA, secagens,
          partos e histórico.
        </p>

        <button
          data-action="reproducao"
        >
          Ver reprodução
        </button>

      </section>


      <section class="card">

        <h2>
          🥛 Produção
        </h2>

        <p>
          ${
            litros
              ? `
                <strong>
                  ${numero(
                    litros,
                    0
                  )} L
                </strong>
                ·
                ${numero(
                  litrosVaca,
                  1
                )}
                L/vaca
              `
              : 'Sem produção registada.'
          }
        </p>

        <button
          data-action="producao"
        >
          Ver produção
        </button>

      </section>


      <section class="card">

        <h2>
          💶 Finanças
        </h2>

        <p>
          Saldo registado do mês:
        </p>

        <p>
          <strong>
            ${euros(
              saldo
            )}
          </strong>
        </p>

        <button
          data-action="financas"
        >
          Ver finanças
        </button>

      </section>


      <section class="card">

        <h2>
          📊 Rentabilidade
        </h2>

        <p>
          Custo estimado:
          <strong>
            ${euros(
              dashboardData
                ?.estimated_cost_per_liter
            )}/L
          </strong>
        </p>

        <p>
          Margem estimada:
          <strong>
            ${euros(
              dashboardData
                ?.estimated_margin_per_liter
            )}/L
          </strong>
        </p>

        <button
          data-action="rentabilidade"
        >
          Ver rentabilidade
        </button>

      </section>


      <section class="card">

        <h2>
          🔐 Conta
        </h2>

        <button
          data-action="logout"
        >
          Sair
        </button>

      </section>

    </main>
  `
}



/* =========================================================
   ALERTAS
========================================================= */

function alertas() {

  const eventos =
    obterAlertas()


  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        🔔 Alertas
      </h1>

      <p class="subtitle">
        Secagens e partos
      </p>


      ${
        eventos.length

          ? eventos.map(
              evento => `

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
                    🐄
                    ${evento.vaca.id}
                  </div>

                  <div class="muted">
                    ${evento.vaca.raca}
                  </div>

                </div>


                <div class="right">

                  <strong>
                    ${formatDate(
                      evento.data
                    )}
                  </strong>

                  <div
                    class="${
                      evento.dias <= 3
                        ? 'urgente'
                        : 'muted'
                    }"
                  >
                    ${textoDias(
                      evento.dias
                    )}
                  </div>

                </div>

              </section>
            `
            ).join('')

          : `
            <section class="card">
              ✅ Sem alertas importantes.
            </section>
          `
      }

    </main>
  `
}



/* =========================================================
   ANIMAIS
========================================================= */

function animais() {

  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        🐄 Animais
      </h1>

      <p class="subtitle">
        ${cows.length}
        animais registados
      </p>


      <button
        data-action="adicionar-animal"
      >
        ➕ Adicionar animal
      </button>

      <br><br>


      <input
        id="pesquisa"
        class="search"
        placeholder="Pesquisar vaca, raça, touro ou estado…"
      >

      <div
        id="lista"
      ></div>

    </main>
  `


  listar('')


  document
    .querySelector(
      '#pesquisa'
    )
    .addEventListener(
      'input',
      event => {

        listar(
          event.target.value
        )
      }
    )
}



function listar(texto) {

  const q =
    String(texto)
      .toLowerCase()
      .trim()


  const resultado =
    cows.filter(
      vaca =>

        `${vaca.id} ${vaca.nome} ${vaca.raca} ${vaca.touro} ${vaca.status}`
          .toLowerCase()
          .includes(q)
    )


  const lista =
    document
      .querySelector(
        '#lista'
      )


  if (!resultado.length) {

    lista.innerHTML = `
      <section class="card">
        Nenhum animal encontrado.
      </section>
    `

    return
  }


  lista.innerHTML =
    resultado.map(
      vaca => `

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

          ${
            vaca.nome
              ? `
                <div>
                  ${vaca.nome}
                </div>
              `
              : ''
          }

          <div class="muted">
            ${vaca.raca}
          </div>

          <div class="muted">
            Touro:
            ${vaca.touro}
          </div>

        </div>


        <div class="right">

          <strong>
            Parto
          </strong>

          <div>
            ${formatDate(
              vaca.parto
            )}
          </div>

        </div>

      </section>
    `
    ).join('')
}



/* =========================================================
   ADICIONAR / EDITAR ANIMAL
========================================================= */

async function adicionarAnimal() {

  const numeroAnimal =
    prompt(
      'Número do animal:',
      ''
    )


  if (!numeroAnimal) {
    return
  }


  const existe =
    cows.some(
      vaca =>
        String(vaca.id) ===
        String(numeroAnimal)
    )


  if (existe) {

    alert(
      'Já existe um animal com esse número.'
    )

    return
  }


  const raca =
    prompt(
      'Raça:',
      'Holstein-Frísia'
    )


  const nome =
    prompt(
      'Nome (opcional):',
      ''
    )


  const notas =
    prompt(
      'Notas (opcional):',
      ''
    )


  const { error } =
    await supabase
      .from('animals')
      .insert({

        farm_id:
          FARM_ID,

        number:
          numeroAnimal.trim(),

        breed:
          raca?.trim() || null,

        name:
          nome?.trim() || null,

        notes:
          notas?.trim() || null
      })


  if (error) {

    alert(
      'Erro ao adicionar animal: ' +
      error.message
    )

    return
  }


  alert(
    '✅ Animal adicionado.'
  )


  await carregarDados()

  animais()
}



async function editarAnimal(
  animalNumero
) {

  const vaca =
    cows.find(
      v =>
        String(v.id) ===
        String(animalNumero)
    )


  if (!vaca) {
    return
  }


  const raca =
    prompt(
      'Raça:',
      vaca.raca === '—'
        ? ''
        : vaca.raca
    )


  if (raca === null) {
    return
  }


  const estado =
    prompt(
      'Estado (opcional):',
      vaca.status === '—'
        ? ''
        : vaca.status
    )


  if (estado === null) {
    return
  }


  const notas =
    prompt(
      'Notas:',
      vaca.notas || ''
    )


  if (notas === null) {
    return
  }


  const { error } =
    await supabase
      .from('animals')
      .update({

        breed:
          raca.trim() ||
          null,

        status:
          estado.trim() ||
          null,

        notes:
          notas.trim() ||
          null
      })
      .eq(
        'id',
        vaca.uuid
      )


  if (error) {

    alert(
      'Erro ao atualizar animal: ' +
      error.message
    )

    return
  }


  alert(
    '✅ Ficha atualizada.'
  )


  await carregarDados()

  detalhe(
    animalNumero,
    voltarDetalhe
  )
}



/* =========================================================
   FICHA DO ANIMAL
========================================================= */

function detalhe(
  id,
  voltar = 'animais'
) {

  const vaca =
    cows.find(
      v =>
        String(v.id) ===
        String(id)
    )


  if (!vaca) {

    inicio()

    return
  }


  voltarDetalhe =
    voltar


  const historico =
    vaca.eventos
      .slice(0, 20)


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

        ${
          vaca.status !== '—'
            ? `
              <p class="muted">
                Estado:
                ${vaca.status}
              </p>
            `
            : ''
        }

      </section>


      <section class="card details">

        <div>
          <span>
            Última IA
          </span>

          <strong>
            ${formatDate(
              vaca.ia
            )}
          </strong>
        </div>


        <div>
          <span>
            Touro
          </span>

          <strong>
            ${vaca.touro}
          </strong>
        </div>


        <div>
          <span>
            Sémen
          </span>

          <strong>
            ${vaca.semen || '—'}
          </strong>
        </div>


        <div>
          <span>
            Resultado IA
          </span>

          <strong>
            ${nomeResultado(
              vaca.resultadoIA
            )}
          </strong>
        </div>


        <div>
          <span>
            Parto previsto
          </span>

          <strong>
            ${formatDate(
              vaca.parto
            )}
          </strong>
        </div>


        <div>
          <span>
            Secagem prevista
          </span>

          <strong>
            ${formatDate(
              vaca.secagem
            )}
          </strong>
        </div>


        <div>
          <span>
            Última secagem
          </span>

          <strong>
            ${formatDate(
              vaca.ultimaSecagem
            )}
          </strong>
        </div>


        <div>
          <span>
            Último parto
          </span>

          <strong>
            ${formatDate(
              vaca.ultimoParto
            )}
          </strong>
        </div>

      </section>


      <section class="card">

        <h2>
          Registos
        </h2>


        <button
          data-action="inseminacao"
          data-id="${vaca.id}"
        >
          🧬 Nova inseminação
        </button>

        <br><br>


        <button
          data-action="resultado-ia"
          data-id="${vaca.id}"
        >
          🩺 Resultado da IA
        </button>

        <br><br>


        <button
          data-action="secagem"
          data-id="${vaca.id}"
        >
          ✅ Marcar secagem
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
          data-action="editar-animal"
          data-id="${vaca.id}"
        >
          ✏️ Editar ficha
        </button>

      </section>


      <h2>
        📋 Histórico reprodutivo
      </h2>


      ${
        historico.length

          ? historico.map(
              evento => `

              <section class="cow-card">

                <div>

                  <strong>
                    ${nomeEvento(
                      evento.event_type
                    )}
                  </strong>

                  ${
                    evento.bull
                      ? `
                        <div class="muted">
                          Touro:
                          ${evento.bull}
                        </div>
                      `
                      : ''
                  }

                  ${
                    evento.result
                      ? `
                        <div class="muted">
                          Resultado:
                          ${evento.result}
                        </div>
                      `
                      : ''
                  }

                </div>


                <div class="right">

                  <strong>
                    ${formatDate(
                      evento.event_date
                    )}
                  </strong>

                </div>

              </section>
            `
            ).join('')

          : `
            <section class="card">
              Sem histórico reprodutivo.
            </section>
          `
      }

    </main>
  `
}



/* =========================================================
   REPRODUÇÃO
========================================================= */

function reproducao() {

  const ultimasIA =
    cows
      .filter(
        vaca =>
          vaca.ia
      )
      .sort(
        (a, b) =>
          b.ia.localeCompare(
            a.ia
          )
      )


  const secagens =
    cows
      .filter(
        vaca =>
          vaca.secagem
      )
      .sort(
        (a, b) =>
          a.secagem.localeCompare(
            b.secagem
          )
      )


  const partos =
    cows
      .filter(
        vaca =>
          vaca.parto
      )
      .sort(
        (a, b) =>
          a.parto.localeCompare(
            b.parto
          )
      )


  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        📅 Reprodução
      </h1>


      <section class="card">

        <h2>
          Resumo
        </h2>

        <p>
          🧬
          <strong>
            ${ultimasIA.length}
          </strong>
          animais com IA
        </p>

        <p>
          🟠
          <strong>
            ${secagens.length}
          </strong>
          secagens previstas
        </p>

        <p>
          🔵
          <strong>
            ${partos.length}
          </strong>
          partos previstos
        </p>

      </section>


      <h2>
        🧬 Últimas IA
      </h2>

      ${
        ultimasIA.length

          ? ultimasIA
            .slice(0, 20)
            .map(
              vaca => `

              <section
                class="cow-card"
                data-action="detalhe"
                data-id="${vaca.id}"
                data-voltar="reproducao"
              >

                <div>

                  <strong>
                    🐄 ${vaca.id}
                  </strong>

                  <div class="muted">
                    ${vaca.touro}
                  </div>

                  ${
                    vaca.resultadoIA
                      ? `
                        <div class="muted">
                          ${vaca.resultadoIA}
                        </div>
                      `
                      : ''
                  }

                </div>


                <div class="right">

                  <strong>
                    ${formatDate(
                      vaca.ia
                    )}
                  </strong>

                </div>

              </section>
            `
            )
            .join('')

          : `
            <section class="card">
              Sem IA registadas.
            </section>
          `
      }


      <h2>
        🟠 Próximas secagens
      </h2>

      ${
        secagens.length

          ? secagens.map(
              vaca => `

              <section
                class="cow-card"
                data-action="detalhe"
                data-id="${vaca.id}"
                data-voltar="reproducao"
              >

                <div>
                  <strong>
                    🐄 ${vaca.id}
                  </strong>
                </div>

                <div class="right">

                  <strong>
                    ${formatDate(
                      vaca.secagem
                    )}
                  </strong>

                  <div class="muted">
                    ${textoDias(
                      diasAte(
                        vaca.secagem
                      )
                    )}
                  </div>

                </div>

              </section>
            `
            ).join('')

          : `
            <section class="card">
              Sem secagens previstas.
            </section>
          `
      }


      <h2>
        🔵 Próximos partos
      </h2>

      ${
        partos.length

          ? partos.map(
              vaca => `

              <section
                class="cow-card"
                data-action="detalhe"
                data-id="${vaca.id}"
                data-voltar="reproducao"
              >

                <div>

                  <strong>
                    🐄 ${vaca.id}
                  </strong>

                  <div class="muted">
                    ${vaca.touro}
                  </div>

                </div>


                <div class="right">

                  <strong>
                    ${formatDate(
                      vaca.parto
                    )}
                  </strong>

                  <div class="muted">
                    ${textoDias(
                      diasAte(
                        vaca.parto
                      )
                    )}
                  </div>

                </div>

              </section>
            `
            ).join('')

          : `
            <section class="card">
              Sem partos previstos.
            </section>
          `
      }

    </main>
  `
}



/* =========================================================
   INSEMINAÇÃO / RESULTADO / SECAGEM / PARTO
========================================================= */

async function encontrarAnimal(
  animalNumero
) {

  const resultado =
    await supabase
      .from('animals')
      .select(
        'id, farm_id'
      )
      .eq(
        'farm_id',
        FARM_ID
      )
      .eq(
        'number',
        animalNumero
      )
      .single()


  if (resultado.error) {

    alert(
      'Erro ao localizar a vaca: ' +
      resultado.error.message
    )

    return null
  }


  return resultado.data
}



async function registarIA(
  animalNumero
) {

  const animal =
    await encontrarAnimal(
      animalNumero
    )


  if (!animal) {
    return
  }


  const dataIA =
    prompt(
      'Data da inseminação (AAAA-MM-DD):',
      hojeISO()
    )


  if (
    !dataIA ||
    !dataValida(dataIA)
  ) {
    return
  }


  const touro =
    prompt(
      'Nome do touro:',
      ''
    )


  if (!touro) {
    return
  }


  const semen =
    prompt(
      'Tipo de sémen (ex.: Sexado, Convencional, Angus):',
      'Sexado'
    )


  if (semen === null) {
    return
  }


  const prevista =
    new Date(
      `${dataIA}T12:00:00`
    )


  prevista.setDate(
    prevista.getDate() +
    283
  )


  const partoPrevisto =
    prevista
      .toISOString()
      .slice(0, 10)


  const seca =
    new Date(prevista)


  seca.setDate(
    seca.getDate() -
    60
  )


  const secagemPrevista =
    seca
      .toISOString()
      .slice(0, 10)


  const confirmar =
    confirm(
      `Confirmar IA da vaca ${animalNumero} com ${touro}?`
    )


  if (!confirmar) {
    return
  }


  const { error } =
    await supabase
      .from('reproduction')
      .insert({

        farm_id:
          animal.farm_id,

        animal_id:
          animal.id,

        event_type:
          'IA',

        event_date:
          dataIA,

        bull:
          touro.trim(),

        semen_type:
          semen.trim() ||
          null,

        expected_calving:
          partoPrevisto,

        expected_dry_off:
          secagemPrevista
      })


  if (error) {

    alert(
      'Erro ao guardar IA: ' +
      error.message
    )

    return
  }


  alert(
    `✅ IA registada.\nParto previsto: ${formatDate(
      partoPrevisto
    )}`
  )


  await carregarDados()
}



async function registarResultadoIA(
  animalNumero
) {

  const vaca =
    cows.find(
      v =>
        String(v.id) ===
        String(animalNumero)
    )


  if (
    !vaca ||
    !vaca.iaId
  ) {

    alert(
      'Esta vaca não tem uma IA registada.'
    )

    return
  }


  const resultado =
    prompt(
      'Resultado da IA (Prenhe / Vazia):',
      vaca.resultadoIA || ''
    )


  if (!resultado) {
    return
  }


  const { error } =
    await supabase
      .from('reproduction')
      .update({
        result:
          resultado.trim()
      })
      .eq(
        'id',
        vaca.iaId
      )


  if (error) {

    alert(
      'Erro ao guardar resultado: ' +
      error.message
    )

    return
  }


  alert(
    '✅ Resultado atualizado.'
  )


  await carregarDados()
}



async function registarSecagem(
  animalNumero
) {

  const animal =
    await encontrarAnimal(
      animalNumero
    )


  if (!animal) {
    return
  }


  const data =
    prompt(
      'Data da secagem (AAAA-MM-DD):',
      hojeISO()
    )


  if (
    !data ||
    !dataValida(data)
  ) {
    return
  }


  if (
    !confirm(
      `Confirmar secagem da vaca ${animalNumero} em ${data}?`
    )
  ) {
    return
  }


  const { error } =
    await supabase
      .from('reproduction')
      .insert({

        farm_id:
          animal.farm_id,

        animal_id:
          animal.id,

        event_type:
          'SECAGEM',

        event_date:
          data
      })


  if (error) {

    alert(
      'Erro ao guardar secagem: ' +
      error.message
    )

    return
  }


  alert(
    '✅ Secagem registada.'
  )


  await carregarDados()
}



async function registarParto(
  animalNumero
) {

  const animal =
    await encontrarAnimal(
      animalNumero
    )


  if (!animal) {
    return
  }


  const data =
    prompt(
      'Data do parto (AAAA-MM-DD):',
      hojeISO()
    )


  if (
    !data ||
    !dataValida(data)
  ) {
    return
  }


  if (
    !confirm(
      `Confirmar parto da vaca ${animalNumero} em ${data}?`
    )
  ) {
    return
  }


  const parto =
    await supabase
      .from('reproduction')
      .insert({

        farm_id:
          animal.farm_id,

        animal_id:
          animal.id,

        event_type:
          'PARTO',

        event_date:
          data
      })


  if (parto.error) {

    alert(
      'Erro ao guardar parto: ' +
      parto.error.message
    )

    return
  }


  await supabase
    .from('animals')
    .update({
      last_calving_date:
        data
    })
    .eq(
      'id',
      animal.id
    )


  alert(
    '🐄 Parto registado.'
  )


  await carregarDados()
}



/* =========================================================
   PRODUÇÃO
========================================================= */

function producao() {

  const ultimo =
    milkRecords[0] ||
    null


  const litros =
    ultimo
      ? Number(
          ultimo.liters
        )
      : null


  const vacas =
    ultimo
      ? Number(
          ultimo.milking_cows
        )
      : null


  const preco =
    ultimo
      ? Number(
          ultimo.price_per_liter
        )
      : null


  const litrosVaca =
    litros &&
    vacas

      ? litros / vacas

      : null


  const receita =
    litros &&
    preco

      ? litros * preco

      : null


  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>


      <h1>
        🥛 Produção
      </h1>


      ${
        ultimo
          ? `
            <section class="card hero">

              <p class="muted">
                Última produção
              </p>

              <h1>
                ${numero(
                  litros,
                  0
                )} L
              </h1>

              <p>
                ${formatDate(
                  ultimo.record_date
                )}
              </p>

            </section>


            <section class="card details">

              <div>

                <span>
                  Vacas em ordenha
                </span>

                <strong>
                  ${vacas || '—'}
                </strong>

              </div>


              <div>

                <span>
                  Litros/vaca
                </span>

                <strong>
                  ${numero(
                    litrosVaca,
                    1
                  )} L
                </strong>

              </div>


              <div>

                <span>
                  Preço/L
                </span>

                <strong>
                  ${euros(
                    preco
                  )}
                </strong>

              </div>


              <div>

                <span>
                  Receita diária
                </span>

                <strong>
                  ${euros(
                    receita
                  )}
                </strong>

              </div>

            </section>


            <section class="card">

              <h2>
                🧪 Qualidade
              </h2>

              <p>
                Gordura:
                <strong>
                  ${
                    ultimo.fat !== null
                      ? `${numero(
                          ultimo.fat,
                          2
                        )}%`
                      : '—'
                  }
                </strong>
              </p>

              <p>
                Proteína:
                <strong>
                  ${
                    ultimo.protein !== null
                      ? `${numero(
                          ultimo.protein,
                          2
                        )}%`
                      : '—'
                  }
                </strong>
              </p>

              <p>
                Células somáticas:
                <strong>
                  ${numero(
                    ultimo.somatic_cells,
                    0
                  )}
                </strong>
              </p>

              <p>
                UFC:
                <strong>
                  ${numero(
                    ultimo.ufc,
                    0
                  )}
                </strong>
              </p>

              <p>
                Ureia:
                <strong>
                  ${numero(
                    ultimo.urea,
                    1
                  )}
                </strong>
              </p>

              <p>
                Lactose:
                <strong>
                  ${numero(
                    ultimo.lactose,
                    2
                  )}
                </strong>
              </p>

            </section>
          `
          : `
            <section class="card">
              Ainda não existe produção registada.
            </section>
          `
      }


      <section class="card">

        <h2>
          ➕ Registo
        </h2>

        <button
          data-action="registar-producao"
        >
          Registar / atualizar produção
        </button>

      </section>


      <h2>
        📋 Histórico
      </h2>


      ${
        milkRecords.length

          ? milkRecords
            .slice(0, 20)
            .map(
              registo => {

                const lVaca =
                  registo.milking_cows

                    ? Number(
                        registo.liters
                      ) /
                      Number(
                        registo.milking_cows
                      )

                    : null


                return `

                  <section class="cow-card">

                    <div>

                      <strong>
                        🥛
                        ${numero(
                          registo.liters,
                          0
                        )} L
                      </strong>

                      <div class="muted">
                        ${registo.milking_cows || '—'}
                        vacas
                      </div>

                    </div>


                    <div class="right">

                      <strong>
                        ${formatDate(
                          registo.record_date
                        )}
                      </strong>

                      <div class="muted">
                        ${numero(
                          lVaca,
                          1
                        )}
                        L/vaca
                      </div>

                    </div>

                  </section>
                `
              }
            )
            .join('')

          : `
            <section class="card">
              Sem histórico.
            </section>
          `
      }


      ${
        milkMonthly.length
          ? `
            <h2>
              📊 Resumo mensal
            </h2>

            ${
              milkMonthly
                .slice(0, 6)
                .map(
                  mes => `

                  <section class="card">

                    <strong>
                      ${formatDate(
                        mes.month
                      )}
                    </strong>

                    <p>
                      Total:
                      <strong>
                        ${numero(
                          mes.total_liters,
                          0
                        )}
                        L
                      </strong>
                    </p>

                    <p>
                      Média/vaca:
                      <strong>
                        ${numero(
                          mes.avg_liters_per_cow,
                          1
                        )}
                        L
                      </strong>
                    </p>

                    <p>
                      Receita:
                      <strong>
                        ${euros(
                          mes.milk_revenue
                        )}
                      </strong>
                    </p>

                  </section>
                `
                )
                .join('')
            }
          `
          : ''
      }

    </main>
  `
}



async function registarProducao() {

  const ultimo =
    milkRecords[0] ||
    {}


  const data =
    prompt(
      'Data (AAAA-MM-DD):',
      hojeISO()
    )


  if (
    !data ||
    !dataValida(data)
  ) {
    return
  }


  const litros =
    parseNumero(
      prompt(
        'Litros produzidos:',
        ultimo.liters || '700'
      )
    )


  if (
    !litros ||
    litros <= 0
  ) {

    alert(
      'Valor de litros inválido.'
    )

    return
  }


  const vacas =
    parseNumero(
      prompt(
        'Vacas em ordenha:',
        ultimo.milking_cows || '33'
      )
    )


  if (
    !vacas ||
    vacas <= 0
  ) {
    return
  }


  const preco =
    parseNumero(
      prompt(
        'Preço por litro (€):',
        ultimo.price_per_liter ||
        '0.42'
      )
    )


  if (
    !preco ||
    preco <= 0
  ) {
    return
  }


  const gordura =
    parseNumero(
      prompt(
        'Gordura % (opcional):',
        ultimo.fat || ''
      )
    )


  const proteina =
    parseNumero(
      prompt(
        'Proteína % (opcional):',
        ultimo.protein || ''
      )
    )


  const celulas =
    parseNumero(
      prompt(
        'Células somáticas (opcional):',
        ultimo.somatic_cells ||
        ''
      )
    )


  const ufc =
    parseNumero(
      prompt(
        'UFC (opcional):',
        ultimo.ufc || ''
      )
    )


  const urea =
    parseNumero(
      prompt(
        'Ureia (opcional):',
        ultimo.urea || ''
      )
    )


  const lactose =
    parseNumero(
      prompt(
        'Lactose (opcional):',
        ultimo.lactose || ''
      )
    )


  const payload = {

    farm_id:
      FARM_ID,

    record_date:
      data,

    liters:
      litros,

    milking_cows:
      Math.round(vacas),

    price_per_liter:
      preco,

    fat:
      gordura,

    protein:
      proteina,

    somatic_cells:
      celulas,

    ufc,

    urea,

    lactose
  }


  const existente =
    milkRecords.find(
      registo =>
        registo.record_date ===
        data
    )


  if (existente) {

    const { error } =
      await supabase
        .from('milk_records')
        .update(payload)
        .eq(
          'id',
          existente.id
        )


    if (error) {

      alert(
        'Erro ao atualizar produção: ' +
        error.message
      )

      return
    }


    alert(
      '✅ Produção atualizada.'
    )
  }

  else {

    const { error } =
      await supabase
        .from('milk_records')
        .insert(payload)


    if (error) {

      alert(
        'Erro ao guardar produção: ' +
        error.message
      )

      return
    }


    alert(
      '✅ Produção registada.'
    )
  }


  await carregarDados()

  producao()
}



/* =========================================================
   FINANÇAS
========================================================= */

function financas() {

  const receitasMes =
    Number(
      dashboardData
        ?.month_income ||
      financeMonthly[0]
        ?.total_income ||
      0
    )


  const despesasMes =
    Number(
      dashboardData
        ?.month_expense ||
      financeMonthly[0]
        ?.total_expense ||
      0
    )


  const saldo =
    receitasMes -
    despesasMes


  const custoPrevisto =
    Number(
      dashboardData
        ?.estimated_monthly_cost ||
      budgetItems.reduce(
        (
          total,
          item
        ) =>
          total +
          custoMensalItem(
            item
          ),
        0
      )
    )


  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>


      <h1>
        💶 Finanças
      </h1>


      <section class="card details">

        <div>

          <span>
            Receitas registadas
          </span>

          <strong>
            ${euros(
              receitasMes
            )}
          </strong>

        </div>


        <div>

          <span>
            Despesas registadas
          </span>

          <strong>
            ${euros(
              despesasMes
            )}
          </strong>

        </div>


        <div>

          <span>
            Saldo registado
          </span>

          <strong>
            ${euros(
              saldo
            )}
          </strong>

        </div>


        <div>

          <span>
            Custos mensais previstos
          </span>

          <strong>
            ${euros(
              custoPrevisto
            )}
          </strong>

        </div>

      </section>


      <section class="card">

        <h2>
          ➕ Novo movimento
        </h2>

        <button
          data-action="nova-receita"
        >
          💰 Registar receita
        </button>

        <br><br>

        <button
          data-action="nova-despesa"
        >
          💸 Registar despesa
        </button>

      </section>


      <section class="card">

        <h2>
          🧾 Custos previstos
        </h2>

        <button
          data-action="novo-orcamento"
        >
          ➕ Adicionar custo previsto
        </button>

      </section>


      <h2>
        📋 Custos previstos
      </h2>


      ${
        budgetItems.length

          ? budgetItems.map(
              item => `

              <section
                class="cow-card"
                data-action="editar-orcamento"
                data-id="${item.id}"
              >

                <div>

                  <strong>
                    ${item.description}
                  </strong>

                  <div class="muted">
                    ${item.category}
                  </div>

                </div>


                <div class="right">

                  <strong>
                    ${euros(
                      item.amount
                    )}
                  </strong>

                  <div class="muted">
                    ${nomeFrequencia(
                      item.frequency
                    )}
                  </div>

                </div>

              </section>
            `
            ).join('')

          : `
            <section class="card">
              Sem custos previstos.
            </section>
          `
      }


      <h2>
        📋 Últimos movimentos
      </h2>


      ${
        financeRecords.length

          ? financeRecords
            .slice(0, 30)
            .map(
              movimento => `

              <section class="cow-card">

                <div>

                  <strong>
                    ${
                      movimento.kind ===
                      'income'
                        ? '💰'
                        : '💸'
                    }
                    ${movimento.description ||
                      movimento.category}
                  </strong>

                  <div class="muted">
                    ${movimento.category}
                  </div>

                </div>


                <div class="right">

                  <strong>
                    ${
                      movimento.kind ===
                      'expense'
                        ? '-'
                        : '+'
                    }
                    ${euros(
                      movimento.amount
                    )}
                  </strong>

                  <div class="muted">
                    ${formatDate(
                      movimento.record_date
                    )}
                  </div>

                  <button
                    data-action="apagar-financa"
                    data-id="${movimento.id}"
                  >
                    Apagar
                  </button>

                </div>

              </section>
            `
            ).join('')

          : `
            <section class="card">
              Sem movimentos registados.
            </section>
          `
      }

    </main>
  `
}



async function registarFinanca(
  kind
) {

  const data =
    prompt(
      'Data (AAAA-MM-DD):',
      hojeISO()
    )


  if (
    !data ||
    !dataValida(data)
  ) {
    return
  }


  const categoria =
    prompt(
      'Categoria:',
      kind === 'expense'
        ? 'outros'
        : 'outros'
    )


  if (!categoria) {
    return
  }


  const descricao =
    prompt(
      'Descrição:',
      ''
    )


  const valor =
    parseNumero(
      prompt(
        'Valor (€):',
        ''
      )
    )


  if (
    !valor ||
    valor <= 0
  ) {

    alert(
      'Valor inválido.'
    )

    return
  }


  const { error } =
    await supabase
      .from(
        'finance_records'
      )
      .insert({

        farm_id:
          FARM_ID,

        record_date:
          data,

        kind,

        category:
          categoria.trim()
            .toLowerCase(),

        description:
          descricao?.trim() ||
          null,

        amount:
          valor,

        is_estimate:
          false
      })


  if (error) {

    alert(
      'Erro ao guardar movimento: ' +
      error.message
    )

    return
  }


  alert(
    '✅ Movimento registado.'
  )


  await carregarDados()

  financas()
}



async function apagarFinanca(
  id
) {

  if (
    !confirm(
      'Apagar este movimento?'
    )
  ) {
    return
  }


  const { error } =
    await supabase
      .from(
        'finance_records'
      )
      .delete()
      .eq(
        'id',
        id
      )


  if (error) {

    alert(
      'Erro ao apagar: ' +
      error.message
    )

    return
  }


  await carregarDados()

  financas()
}



/* =========================================================
   ORÇAMENTO / CUSTOS PREVISTOS
========================================================= */

async function novoOrcamento() {

  const descricao =
    prompt(
      'Descrição do custo:',
      ''
    )


  if (!descricao) {
    return
  }


  const categoria =
    prompt(
      'Categoria:',
      'outros'
    )


  if (!categoria) {
    return
  }


  const valor =
    parseNumero(
      prompt(
        'Valor (€):',
        ''
      )
    )


  if (
    valor === null ||
    valor < 0
  ) {
    return
  }


  const frequencia =
    prompt(
      'Frequência: monthly / weekly / yearly / per_event',
      'monthly'
    )


  if (!frequencia) {
    return
  }


  const permitidas =
    [
      'monthly',
      'weekly',
      'yearly',
      'per_event'
    ]


  if (
    !permitidas.includes(
      frequencia
    )
  ) {

    alert(
      'Frequência inválida.'
    )

    return
  }


  const { error } =
    await supabase
      .from(
        'budget_items'
      )
      .insert({

        farm_id:
          FARM_ID,

        category:
          categoria.trim()
            .toLowerCase(),

        description:
          descricao.trim(),

        amount:
          valor,

        frequency:
          frequencia,

        is_estimate:
          true,

        active:
          true
      })


  if (error) {

    alert(
      'Erro ao guardar custo: ' +
      error.message
    )

    return
  }


  alert(
    '✅ Custo previsto adicionado.'
  )


  await carregarDados()

  financas()
}



async function editarOrcamento(
  id
) {

  const item =
    budgetItems.find(
      x =>
        String(x.id) ===
        String(id)
    )


  if (!item) {
    return
  }


  const valor =
    parseNumero(
      prompt(
        `${item.description}\nNovo valor (€):`,
        item.amount
      )
    )


  if (
    valor === null ||
    valor < 0
  ) {
    return
  }


  const frequencia =
    prompt(
      'Frequência: monthly / weekly / yearly / per_event',
      item.frequency
    )


  if (!frequencia) {
    return
  }


  const { error } =
    await supabase
      .from(
        'budget_items'
      )
      .update({

        amount:
          valor,

        frequency:
          frequencia
      })
      .eq(
        'id',
        id
      )


  if (error) {

    alert(
      'Erro ao atualizar custo: ' +
      error.message
    )

    return
  }


  alert(
    '✅ Custo atualizado.'
  )


  await carregarDados()

  financas()
}



/* =========================================================
   RENTABILIDADE
========================================================= */

function rentabilidade() {

  const dados =
    dashboardData ||
    {}


  const preco =
    Number(
      dados
        .latest_price_per_liter ||
      milkRecords[0]
        ?.price_per_liter ||
      0
    )


  const custoLitro =
    Number(
      dados
        .estimated_cost_per_liter ||
      0
    )


  const margemLitro =
    Number(
      dados
        .estimated_margin_per_liter ||
      (
        preco -
        custoLitro
      )
    )


  const custos =
    Number(
      dados
        .estimated_monthly_cost ||
      0
    )


  const receita =
    Number(
      dados
        .estimated_monthly_milk_revenue ||
      0
    )


  const margem =
    Number(
      dados
        .estimated_monthly_margin ||
      (
        receita -
        custos
      )
    )


  const litrosMes =
    Number(
      dados
        .estimated_monthly_liters ||
      0
    )


  const equilibrioLitros =
    preco > 0

      ? custos /
        preco

      : null


  const equilibrioDia =
    equilibrioLitros

      ? equilibrioLitros /
        30

      : null


  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="inicio"
      >
        ← Voltar
      </button>


      <h1>
        📊 Rentabilidade
      </h1>

      <p class="subtitle">
        Estimativas com base
        nos custos registados
      </p>


      <section class="card details">

        <div>

          <span>
            Preço do leite
          </span>

          <strong>
            ${euros(
              preco
            )}/L
          </strong>

        </div>


        <div>

          <span>
            Custo estimado/L
          </span>

          <strong>
            ${euros(
              custoLitro
            )}/L
          </strong>

        </div>


        <div>

          <span>
            Margem estimada/L
          </span>

          <strong>
            ${euros(
              margemLitro
            )}/L
          </strong>

        </div>


        <div>

          <span>
            Custos previstos/mês
          </span>

          <strong>
            ${euros(
              custos
            )}
          </strong>

        </div>


        <div>

          <span>
            Leite estimado/mês
          </span>

          <strong>
            ${numero(
              litrosMes,
              0
            )} L
          </strong>

        </div>


        <div>

          <span>
            Receita leite/mês
          </span>

          <strong>
            ${euros(
              receita
            )}
          </strong>

        </div>


        <div>

          <span>
            Margem estimada/mês
          </span>

          <strong>
            ${euros(
              margem
            )}
          </strong>

        </div>

      </section>


      <section class="card">

        <h2>
          ⚖️ Ponto de equilíbrio
        </h2>

        <p>
          Produção mínima aproximada
          para cobrir os custos previstos:
        </p>

        <p>
          <strong>
            ${numero(
              equilibrioLitros,
              0
            )}
            L/mês
          </strong>
        </p>

        <p>
          Cerca de
          <strong>
            ${numero(
              equilibrioDia,
              0
            )}
            L/dia
          </strong>
          ao preço atual.
        </p>

      </section>


      <section class="card">

        <p class="muted">
          Estes cálculos são estimativas.
          Só incluem os custos que estão
          registados na Lavoura+.
        </p>

      </section>

    </main>
  `
}



/* =========================================================
   CLIQUES
========================================================= */

app.addEventListener(
  'click',
  async event => {

    const elemento =
      event.target.closest(
        '[data-action]'
      )


    if (!elemento) {
      return
    }


    const action =
      elemento.dataset.action


    if (
      action ===
      'login'
    ) {

      await login()

      return
    }


    if (
      action ===
      'forgot-password'
    ) {

      await forgotPassword()

      return
    }


    if (
      action ===
      'update-password'
    ) {

      await updatePassword()

      return
    }


    if (
      action ===
      'confirmar-2fa'
    ) {

      await confirmar2FA(
        elemento.dataset.factor
      )

      return
    }


    if (
      action ===
      'inicio'
    ) {

      inicio()

      return
    }


    if (
      action ===
      'alertas'
    ) {

      alertas()

      return
    }


    if (
      action ===
      'animais'
    ) {

      animais()

      return
    }


    if (
      action ===
      'adicionar-animal'
    ) {

      await adicionarAnimal()

      return
    }


    if (
      action ===
      'editar-animal'
    ) {

      await editarAnimal(
        elemento.dataset.id
      )

      return
    }


    if (
      action ===
      'reproducao'
    ) {

      reproducao()

      return
    }


    if (
      action ===
      'producao'
    ) {

      producao()

      return
    }


    if (
      action ===
      'registar-producao'
    ) {

      await registarProducao()

      return
    }


    if (
      action ===
      'financas'
    ) {

      financas()

      return
    }


    if (
      action ===
      'rentabilidade'
    ) {

      rentabilidade()

      return
    }


    if (
      action ===
      'nova-receita'
    ) {

      await registarFinanca(
        'income'
      )

      return
    }


    if (
      action ===
      'nova-despesa'
    ) {

      await registarFinanca(
        'expense'
      )

      return
    }


    if (
      action ===
      'apagar-financa'
    ) {

      await apagarFinanca(
        elemento.dataset.id
      )

      return
    }


    if (
      action ===
      'novo-orcamento'
    ) {

      await novoOrcamento()

      return
    }


    if (
      action ===
      'editar-orcamento'
    ) {

      await editarOrcamento(
        elemento.dataset.id
      )

      return
    }


    if (
      action ===
      'detalhe'
    ) {

      detalhe(
        elemento.dataset.id,
        elemento.dataset.voltar
      )

      return
    }


    if (
      action ===
      'voltar-detalhe'
    ) {

      if (
        voltarDetalhe ===
        'alertas'
      ) {

        alertas()
      }

      else if (
        voltarDetalhe ===
        'reproducao'
      ) {

        reproducao()
      }

      else {

        animais()
      }

      return
    }


    if (
      action ===
      'inseminacao'
    ) {

      await registarIA(
        elemento.dataset.id
      )

      return
    }


    if (
      action ===
      'resultado-ia'
    ) {

      await registarResultadoIA(
        elemento.dataset.id
      )

      return
    }


    if (
      action ===
      'secagem'
    ) {

      await registarSecagem(
        elemento.dataset.id
      )

      return
    }


    if (
      action ===
      'parto'
    ) {

      await registarParto(
        elemento.dataset.id
      )

      return
    }


    if (
      action ===
      'tentar-novamente'
    ) {

      await carregarDados()

      return
    }


    if (
      action ===
      'logout'
    ) {

      await supabase.auth
        .signOut()

      loginScreen(
        'Sessão terminada.'
      )

      return
    }
  }
)



/* =========================================================
   EVENTOS DE AUTENTICAÇÃO
========================================================= */

supabase.auth
  .onAuthStateChange(
    async (
      event,
      session
    ) => {

      if (
        event ===
        'PASSWORD_RECOVERY'
      ) {

        recoveryMode = true

        recoveryScreen()

        return
      }


      if (
        event ===
        'SIGNED_OUT'
      ) {

        if (!recoveryMode) {

          loginScreen()
        }

        return
      }


      if (
        event ===
        'SIGNED_IN' &&
        session &&
        !recoveryMode
      ) {

        return
      }
    }
  )



/* =========================================================
   ARRANQUE
========================================================= */

async function arrancar() {

  const hash =
    new URLSearchParams(
      window.location.hash
        .replace(
          /^#/,
          ''
        )
    )


  const query =
    new URLSearchParams(
      window.location.search
    )


  const recuperacao =
    hash.get('type') ===
      'recovery' ||
    query.get('type') ===
      'recovery'


  const {
    data: {
      session
    }
  } =
    await supabase.auth
      .getSession()


  if (
    recuperacao &&
    session
  ) {

    recoveryMode = true

    recoveryScreen()

    return
  }


  if (!session) {

    loginScreen()

    return
  }


  await verificarSeguranca()
}


arrancar()