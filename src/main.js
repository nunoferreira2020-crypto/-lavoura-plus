import './style.css'
import { createClient } from '@supabase/supabase-js'
import {
  buildMilkAnalysisPayload,
  getMilkAnalysisRecords,
  getMilkAnalysisSummary,
  getMilkMetricTrend
} from './milk-analysis.js'

/* =========================================================
   LAVOURA+ 1.2
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


function dataLocal(data) {

  if (!data) {
    return null
  }

  const [ano, mes, dia] =
    String(data)
      .split('-')
      .map(Number)

  return new Date(
    ano,
    mes - 1,
    dia
  )
}


function adicionarDias(
  data,
  quantidade
) {

  const base =
    dataLocal(data)

  if (!base) {
    return null
  }

  base.setDate(
    base.getDate() +
    quantidade
  )

  const ano =
    base.getFullYear()

  const mes =
    String(
      base.getMonth() + 1
    ).padStart(2, '0')

  const dia =
    String(
      base.getDate()
    ).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}


function diasAte(data) {

  if (!data) {
    return 9999
  }

  const destino =
    dataLocal(data)

  return Math.round(
    (
      destino.getTime() -
      hoje().getTime()
    ) /
    86400000
  )
}


function diasDesde(data) {

  if (!data) {
    return 9999
  }

  return -diasAte(data)
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


function resultadoNegativo(resultado) {

  const texto =
    String(
      resultado || ''
    )
      .toLowerCase()
      .trim()

  return (
    texto.includes('vazia') ||
    texto.includes('negativ') ||
    texto.includes('não prenhe') ||
    texto.includes('nao prenhe')
  )
}


function temResultadoIA(resultado) {

  return Boolean(
    String(
      resultado || ''
    ).trim()
  )
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
          ascending: false
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
          ascending: false
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
      .from('milk_monthly_summary')
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'month',
        {
          ascending: false
        }
      )
      .limit(12)


  const finances =
    await supabase
      .from('finance_records')
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'record_date',
        {
          ascending: false
        }
      )
      .limit(150)


  const financeMonth =
    await supabase
      .from('finance_monthly_summary')
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .order(
        'month',
        {
          ascending: false
        }
      )
      .limit(12)


  const budget =
    await supabase
      .from('budget_items')
      .select('*')
      .eq(
        'farm_id',
        FARM_ID
      )
      .eq(
        'active',
        true
      )
      .order('category')


  const dashboard =
    await supabase
      .from('lavoura_v1_dashboard')
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
                String(b.event_date)
                  .localeCompare(
                    String(a.event_date)
                  )
            )


        const ultimaIA =
          eventos.find(
            evento =>
              evento.event_type === 'IA'
          )


        const ultimaSecagem =
          eventos.find(
            evento =>
              evento.event_type === 'SECAGEM'
          )


        const ultimoParto =
          eventos.find(
            evento =>
              evento.event_type === 'PARTO'
          )


        let partoPrevisto =
          ultimaIA?.expected_calving ||
          null


        let secagemPrevista =
          ultimaIA?.expected_dry_off ||
          null


        if (
          resultadoNegativo(
            ultimaIA?.result
          )
        ) {

          partoPrevisto = null
          secagemPrevista = null
        }


        if (
          ultimaSecagem &&
          ultimaIA &&
          ultimaSecagem.event_date >=
            ultimaIA.event_date
        ) {

          secagemPrevista = null
        }


        if (
          ultimoParto &&
          ultimaIA &&
          ultimoParto.event_date >=
            ultimaIA.event_date
        ) {

          partoPrevisto = null
          secagemPrevista = null
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
            ultimaSecagem?.event_date ||
            null,

          ultimoParto:
            ultimoParto?.event_date ||
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
   TAREFAS E ALERTAS 1.2
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
      a.dias - b.dias
  )
}


function obterDiagnosticosPendentes() {

  const diagnosticos = []


  cows.forEach(
    vaca => {

      if (
        !vaca.ia ||
        temResultadoIA(
          vaca.resultadoIA
        )
      ) {
        return
      }


      const diasPosIA =
        diasDesde(
          vaca.ia
        )


      if (
        diasPosIA < 28 ||
        diasPosIA > 60
      ) {
        return
      }


      const dataDiagnostico =
        adicionarDias(
          vaca.ia,
          28
        )


      const dias =
        diasAte(
          dataDiagnostico
        )


      diagnosticos.push({

  tipo:
    'Diagnóstico',

  icon:
    '🩺',

  data:
    dataDiagnostico,

  dias,

  diasPosIA,

  estadoDiagnostico:
    diasPosIA <= 35
      ? 'PRONTO PARA DIAGNÓSTICO'
      : diasPosIA <= 60
        ? 'DIAGNÓSTICO PENDENTE'
        : 'MUITO ATRASADO',

  nivelDiagnostico:
    diasPosIA <= 35
      ? 'pronto'
      : diasPosIA <= 60
        ? 'pendente'
        : 'atrasado',

  vaca
})
    }
  )

  return diagnosticos.sort(
    (a, b) =>
      a.dias - b.dias
  )
}


function obterTarefasExploracao() {

  const tarefas = [
    ...obterAlertas(),
    ...obterDiagnosticosPendentes()
  ]


  return tarefas.sort(
    (a, b) => {

      if (
        a.dias < 0 &&
        b.dias >= 0
      ) {
        return -1
      }

      if (
        b.dias < 0 &&
        a.dias >= 0
      ) {
        return 1
      }

      return (
        a.dias -
        b.dias
      )
    }
  )
}


function prioridadeTarefa(
  tarefa
) {



  if (
    tarefa.tipo === 'Diagnóstico' &&
    tarefa.estadoDiagnostico
  ) {
    return tarefa.estadoDiagnostico
  }

  if (tarefa.dias < 0) {
    return 'ATRASADO'
  }

  if (tarefa.dias === 0) {
    return 'HOJE'
  }

  if (tarefa.dias <= 3) {
    return 'PRÓXIMO'
  }

  


  return 'PLANEADO'
}
 function classePrioridade(
  tarefa
) {

  if (
    tarefa.tipo === 'Diagnóstico'
  ) {

    if (
      tarefa.nivelDiagnostico === 'atrasado'
    ) {
      return 'urgente'
    }

    return 'muted'
  }

  if (tarefa.dias < 0) {
    return 'urgente'
  }

  if (tarefa.dias === 0) {
    return 'urgente'
  }

  return 'muted'
}

function cartaoTarefa(
  tarefa,
  voltar = 'hoje'
) {

  const detalheExtra =
    tarefa.tipo ===
    'Diagnóstico'
      ? `
        <div class="muted">
          ${tarefa.diasPosIA}
          dias após IA
        </div>
      `
      : ''


  return `
    <section
      class="cow-card alerta"
      data-action="detalhe"
      data-id="${tarefa.vaca.id}"
      data-voltar="${voltar}"
    >

      <div>

        <strong>
          ${tarefa.icon}
          ${tarefa.tipo}
        </strong>

        <div>
          🐄 ${tarefa.vaca.id}
        </div>

        <div class="muted">
          ${tarefa.vaca.raca}
        </div>

        ${detalheExtra}

      </div>


      <div class="right">

        <strong>
          ${formatDate(
            tarefa.data
          )}
        </strong>

        <div
          class="${classePrioridade(
            tarefa
          )}"
        >
          ${textoDias(
            tarefa.dias
          )}
        </div>

        <div class="muted">
          ${prioridadeTarefa(
            tarefa
          )}
        </div>

      </div>

    </section>
  `
}
/* =========================================================
   ECRÃ HOJE / TAREFAS
========================================================= */

function hojeScreen() {

  voltarDetalhe = 'hoje'

  const tarefas =
    obterTarefasExploracao()

  const atrasadas =
    tarefas.filter(
      tarefa => tarefa.dias < 0
    )

  const hoje =
    tarefas.filter(
      tarefa => tarefa.dias === 0
    )

  const proximas =
    tarefas.filter(
      tarefa => tarefa.dias > 0
    )


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        📋 Hoje
      </h1>

      <p class="muted">
        Tarefas e eventos importantes da exploração
      </p>


      <section class="stats-grid">

        <div class="stat-card">
          <span class="stat-number">
            ${atrasadas.length}
          </span>
          <span class="muted">
            Atrasadas
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-number">
            ${hoje.length}
          </span>
          <span class="muted">
            Hoje
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-number">
            ${proximas.length}
          </span>
          <span class="muted">
            Próximas
          </span>
        </div>

      </section>


      ${
        tarefas.length
          ? `
            <section class="card">

              <h2>
                Tarefas
              </h2>

              ${tarefas
                .map(
                  tarefa =>
                    cartaoTarefa(
                      tarefa,
                      'hoje'
                    )
                )
                .join('')}

            </section>
          `
          : `
            <section class="card">

              <h2>
                ✅ Tudo em dia
              </h2>

              <p class="muted">
                Não existem tarefas pendentes neste momento.
              </p>

            </section>
          `
      }

    </main>
  `
}


/* =========================================================
   ALERTAS
========================================================= */

function alertasScreen() {

  voltarDetalhe = 'alertas'

  const alertas =
    obterAlertas()

  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        🔔 Alertas
      </h1>

      <p class="muted">
        Próximos 30 dias
      </p>


      ${
        alertas.length
          ? alertas
              .map(
                alerta =>
                  cartaoTarefa(
                    alerta,
                    'alertas'
                  )
              )
              .join('')
          : `
            <section class="card">

              <h2>
                Sem alertas
              </h2>

              <p class="muted">
                Não existem secagens ou partos próximos.
              </p>

            </section>
          `
      }

    </main>
  `
}


/* =========================================================
   DIAGNÓSTICOS
========================================================= */

function diagnosticosScreen() {

  voltarDetalhe =
    'diagnosticos'

  const diagnosticos =
    obterDiagnosticosPendentes()


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        🩺 Diagnósticos
      </h1>

      <p class="muted">
        Vacas inseminadas há pelo menos 28 dias
        sem resultado registado.
      </p>


      ${
        diagnosticos.length
          ? diagnosticos
              .map(
                diagnostico =>
                  cartaoTarefa(
                    diagnostico,
                    'diagnosticos'
                  )
              )
              .join('')
          : `
            <section class="card">

              <h2>
                ✅ Nenhum diagnóstico pendente
              </h2>

              <p class="muted">
                Neste momento não existem vacas
                a aguardar diagnóstico.
              </p>

            </section>
          `
      }

    </main>
  `
}


/* =========================================================
   LISTA DE ANIMAIS
========================================================= */

function animaisScreenLegacy() {

  voltarDetalhe =
    'animais'

  const lista =
    [...cows].sort(
      (a, b) =>
        String(a.id)
          .localeCompare(
            String(b.id),
            undefined,
            {
              numeric: true
            }
          )
    )


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        🐄 Vacas
      </h1>

      <p class="muted">
        ${lista.length}
        animais registados
      </p>


      <section class="card">

        <input
          id="animalSearch"
          class="search"
          type="search"
          placeholder="Pesquisar número ou nome"
          autocomplete="off"
        >

        <div id="animalList">

          ${renderListaAnimais(
            lista
          )}

        </div>

      </section>

    </main>
  `
}


function renderListaAnimais(
  lista
) {

  if (!lista.length) {

    return `
      <p class="muted">
        Nenhum animal encontrado.
      </p>
    `
  }


  return lista
    .map(
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

          </div>


          <div class="right">

            <strong>
              ${vaca.status}
            </strong>

            ${
              vaca.ia
                ? `
                  <div class="muted">
                    IA:
                    ${formatDate(
                      vaca.ia
                    )}
                  </div>
                `
                : `
                  <div class="muted">
                    Sem IA
                  </div>
                `
            }

          </div>

        </section>
      `
    )
    .join('')
}


function pesquisarAnimais(
  termo
) {

  const pesquisa =
    String(termo || '')
      .trim()
      .toLowerCase()


  const lista =
    cows.filter(
      vaca => {

        const numero =
          String(
            vaca.id || ''
          ).toLowerCase()

        const nome =
          String(
            vaca.nome || ''
          ).toLowerCase()

        const raca =
          String(
            vaca.raca || ''
          ).toLowerCase()


        return (
          numero.includes(
            pesquisa
          ) ||
          nome.includes(
            pesquisa
          ) ||
          raca.includes(
            pesquisa
          )
        )
      }
    )


  const container =
    document.querySelector(
      '#animalList'
    )


  if (container) {

    container.innerHTML =
      renderListaAnimais(
        lista
      )
  }
}


/* =========================================================
   DETALHE DO ANIMAL
========================================================= */

function detalheAnimalLegacy(
  id,
  voltar = null
) {

  if (voltar) {
    voltarDetalhe = voltar
  }


  const vaca =
    cows.find(
      animal =>
        String(animal.id) ===
        String(id)
    )


  if (!vaca) {

    animaisScreen()

    return
  }


  const diagnosticoPendente =
    obterDiagnosticosPendentes()
      .find(
        item =>
          String(item.vaca.id) ===
          String(vaca.id)
      )


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="voltar-detalhe"
      >
        ← Voltar
      </button>


      <h1>
        🐄 ${vaca.id}
      </h1>

      ${
        vaca.nome
          ? `
            <p class="muted">
              ${vaca.nome}
            </p>
          `
          : ''
      }


      ${
        diagnosticoPendente
          ? `
            <section class="card">

              <h2>
                🩺 Diagnóstico pendente
              </h2>

              <p>
                Esta vaca foi inseminada há
                <strong>
                  ${diagnosticoPendente.diasPosIA}
                  dias
                </strong>.
              </p>

              <button
                data-action="diagnostico"
                data-id="${vaca.id}"
              >
                Registar diagnóstico
              </button>

            </section>
          `
          : ''
      }


      <section class="card">

        <h2>
          Informação
        </h2>

        <div class="detail-row">
          <span>
            Número
          </span>
          <strong>
            ${vaca.id}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Raça
          </span>
          <strong>
            ${vaca.raca}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Estado
          </span>
          <strong>
            ${vaca.status}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Nascimento
          </span>
          <strong>
            ${formatDate(
              vaca.nascimento
            )}
          </strong>
        </div>

      </section>


      <section class="card">

        <h2>
          Reprodução
        </h2>

        <div class="detail-row">
          <span>
            Última IA
          </span>
          <strong>
            ${formatDate(
              vaca.ia
            )}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Touro
          </span>
          <strong>
            ${vaca.touro || '—'}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Sémen
          </span>
          <strong>
            ${vaca.semen || '—'}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Resultado IA
          </span>
          <strong>
            ${vaca.resultadoIA || '—'}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Parto previsto
          </span>
          <strong>
            ${formatDate(
              vaca.parto
            )}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Secagem prevista
          </span>
          <strong>
            ${formatDate(
              vaca.secagem
            )}
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Última secagem
          </span>
          <strong>
            ${formatDate(
              vaca.ultimaSecagem
            )}
          </strong>
        </div>

        <div class="detail-row">
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

        ${
          vaca.secagem
            ? `
              <button
                data-action="secagem"
                data-id="${vaca.id}"
              >
                ✅ Marcar secagem realizada
              </button>
            `
            : ''
        }

        <button
          data-action="parto"
          data-id="${vaca.id}"
        >
          🐄 Registar parto
        </button>

        <button
          data-action="inseminacao"
          data-id="${vaca.id}"
        >
          ➕ Nova inseminação
        </button>

        ${
          vaca.ia
            ? `
              <button
                class="secondary"
                data-action="diagnostico"
                data-id="${vaca.id}"
              >
                🩺 Registar diagnóstico
              </button>
            `
            : ''
        }

      </section>


      ${
        vaca.eventos?.length
          ? `
            <section class="card">

              <h2>
                Histórico
              </h2>

              ${vaca.eventos
                .slice(0, 10)
                .map(
                  evento => `
                    <div class="detail-row">

                      <span>
                        ${evento.event_type}
                      </span>

                      <strong>
                        ${formatDate(
                          evento.event_date
                        )}
                      </strong>

                    </div>
                  `
                )
                .join('')}

            </section>
          `
          : ''
      }

    </main>
  `
}


/* =========================================================
   VOLTAR DO DETALHE
========================================================= */

function voltarDoDetalheLegacy() {

  if (
    voltarDetalhe ===
    'alertas'
  ) {

    alertasScreen()

    return
  }


  if (
    voltarDetalhe ===
    'diagnosticos'
  ) {

    diagnosticosScreen()

    return
  }


  if (
    voltarDetalhe ===
    'hoje'
  ) {

    hojeScreen()

    return
  }


  animaisScreen()
}
/* =========================================================
   ENCONTRAR ANIMAL
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



/* =========================================================
   NOVA INSEMINAÇÃO
========================================================= */

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
    !dataValida(
      dataIA
    )
  ) {

    alert(
      'Data inválida.'
    )

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
      'Tipo de sémen (Sexado, Convencional, Angus, etc.):',
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
    new Date(
      prevista
    )


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
      `Confirmar IA da vaca ${animalNumero} com o touro ${touro}?`
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
    `✅ Inseminação registada.\nParto previsto: ${formatDate(
      partoPrevisto
    )}`
  )


  await carregarDados()
}



/* =========================================================
   DIAGNÓSTICO DE GESTAÇÃO
========================================================= */

async function registarDiagnostico(
  animalNumero
) {

  const vaca =
    cows.find(
      animal =>
        String(
          animal.id
        ) ===
        String(
          animalNumero
        )
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


  const resposta =
    prompt(
      'Resultado do diagnóstico:\nEscreva PRENHE ou VAZIA',
      vaca.resultadoIA ||
      ''
    )


  if (!resposta) {
    return
  }


  const texto =
    resposta
      .trim()
      .toLowerCase()


  let resultado = ''


  if (
    texto.includes(
      'prenhe'
    ) ||
    texto.includes(
      'positiv'
    )
  ) {

    resultado =
      'Prenhe'
  }

  else if (
    texto.includes(
      'vazia'
    ) ||
    texto.includes(
      'negativ'
    )
  ) {

    resultado =
      'Vazia'
  }

  else {

    alert(
      'Escreva apenas PRENHE ou VAZIA.'
    )

    return
  }


  const confirmar =
    confirm(
      `Confirmar resultado da vaca ${animalNumero}: ${resultado}?`
    )


  if (!confirmar) {
    return
  }


  const { error } =
    await supabase
      .from('reproduction')
      .update({
        result:
          resultado
      })
      .eq(
        'id',
        vaca.iaId
      )


  if (error) {

    alert(
      'Erro ao guardar diagnóstico: ' +
      error.message
    )

    return
  }


  alert(
    `✅ Diagnóstico registado: ${resultado}`
  )


  await carregarDados()
}



/* =========================================================
   SECAGEM
========================================================= */

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
    !dataValida(
      data
    )
  ) {

    alert(
      'Data inválida.'
    )

    return
  }


  const confirmar =
    confirm(
      `Confirmar secagem da vaca ${animalNumero} em ${formatDate(
        data
      )}?`
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



/* =========================================================
   PARTO
========================================================= */

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
    !dataValida(
      data
    )
  ) {

    alert(
      'Data inválida.'
    )

    return
  }


  const confirmar =
    confirm(
      `Confirmar parto da vaca ${animalNumero} em ${formatDate(
        data
      )}?`
    )


  if (!confirmar) {
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


  if (
    parto.error
  ) {

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
    '🐄 Parto registado com sucesso.'
  )


  await carregarDados()
}



/* =========================================================
   ECRÃ REPRODUÇÃO
========================================================= */

function reproducaoScreen() {

  const diagnosticos =
    obterDiagnosticosPendentes()


  const secagens =
    cows
      .filter(
        vaca =>
          vaca.secagem
      )
      .sort(
        (a, b) =>
          String(
            a.secagem
          )
          .localeCompare(
            String(
              b.secagem
            )
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
          String(
            a.parto
          )
          .localeCompare(
            String(
              b.parto
            )
          )
      )


  const ultimasIA =
    cows
      .filter(
        vaca =>
          vaca.ia
      )
      .sort(
        (a, b) =>
          String(
            b.ia
          )
          .localeCompare(
            String(
              a.ia
            )
          )
      )


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="inicio"
      >
        ← Voltar
      </button>

      <h1>
        📅 Reprodução
      </h1>


      <section class="stats-grid">

        <div class="stat-card">

          <span class="stat-number">
            ${diagnosticos.length}
          </span>

          <span class="muted">
            Diagnósticos
          </span>

        </div>


        <div class="stat-card">

          <span class="stat-number">
            ${secagens.length}
          </span>

          <span class="muted">
            Secagens
          </span>

        </div>


        <div class="stat-card">

          <span class="stat-number">
            ${partos.length}
          </span>

          <span class="muted">
            Partos
          </span>

        </div>

      </section>


      <section class="card">

        <h2>
          🩺 Diagnósticos pendentes
        </h2>

        ${
          diagnosticos.length

            ? diagnosticos
                .map(
                  item =>
                    cartaoTarefa(
                      item,
                      'diagnosticos'
                    )
                )
                .join('')

            : `
              <p class="muted">
                Sem diagnósticos pendentes.
              </p>
            `
        }

      </section>


      <section class="card">

        <h2>
          🟠 Próximas secagens
        </h2>

        ${
          secagens.length

            ? secagens
                .slice(
                  0,
                  15
                )
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
                )
                .join('')

            : `
              <p class="muted">
                Sem secagens previstas.
              </p>
            `
        }

      </section>


      <section class="card">

        <h2>
          🔵 Próximos partos
        </h2>

        ${
          partos.length

            ? partos
                .slice(
                  0,
                  15
                )
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
                )
                .join('')

            : `
              <p class="muted">
                Sem partos previstos.
              </p>
            `
        }

      </section>


      <section class="card">

        <h2>
          🧬 Últimas IA
        </h2>

        ${
          ultimasIA.length

            ? ultimasIA
                .slice(
                  0,
                  20
                )
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
                          Touro:
                          ${vaca.touro}
                        </div>

                        ${
                          vaca.resultadoIA
                            ? `
                              <div class="muted">
                                Resultado:
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
              <p class="muted">
                Sem inseminações registadas.
              </p>
            `
        }

      </section>

    </main>
  `
}
/* =========================================================
   PRODUÇÃO
========================================================= */

function producaoScreen() {

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
        class="secondary"
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


            <section class="card">

              <div class="detail-row">

                <span>
                  Vacas em ordenha
                </span>

                <strong>
                  ${vacas || '—'}
                </strong>

              </div>


              <div class="detail-row">

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


              <div class="detail-row">

                <span>
                  Preço/L
                </span>

                <strong>
                  ${euros(
                    preco
                  )}
                </strong>

              </div>


              <div class="detail-row">

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

              <div class="detail-row">
                <span>
                  Gordura
                </span>
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
              </div>

              <div class="detail-row">
                <span>
                  Proteína
                </span>
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
              </div>

              <div class="detail-row">
                <span>
                  Células somáticas
                </span>
                <strong>
                  ${numero(
                    ultimo.somatic_cells,
                    0
                  )}
                </strong>
              </div>

              <div class="detail-row">
                <span>
                  UFC
                </span>
                <strong>
                  ${numero(
                    ultimo.ufc,
                    0
                  )}
                </strong>
              </div>

              <div class="detail-row">
                <span>
                  Ureia
                </span>
                <strong>
                  ${numero(
                    ultimo.urea,
                    1
                  )}
                </strong>
              </div>

              <div class="detail-row">
                <span>
                  Lactose
                </span>
                <strong>
                  ${numero(
                    ultimo.lactose,
                    2
                  )}
                </strong>
              </div>

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

  producaoScreen()
}



/* =========================================================
   FINANÇAS
========================================================= */

function financasScreen() {

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
        class="secondary"
        data-action="inicio"
      >
        ← Voltar
      </button>


      <h1>
        💶 Finanças
      </h1>


      <section class="card">

        <div class="detail-row">

          <span>
            Receitas registadas
          </span>

          <strong>
            ${euros(
              receitasMes
            )}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Despesas registadas
          </span>

          <strong>
            ${euros(
              despesasMes
            )}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Saldo registado
          </span>

          <strong>
            ${euros(
              saldo
            )}
          </strong>

        </div>


        <div class="detail-row">

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
      'outros'
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

  financasScreen()
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

  financasScreen()
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

  financasScreen()
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

  financasScreen()
}



/* =========================================================
   RENTABILIDADE
========================================================= */

function rentabilidadeScreen() {

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
      ? custos / preco
      : null


  const equilibrioDia =
    equilibrioLitros
      ? equilibrioLitros / 30
      : null


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
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


      <section class="card">

        <div class="detail-row">
          <span>
            Preço do leite
          </span>
          <strong>
            ${euros(
              preco
            )}/L
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Custo estimado/L
          </span>
          <strong>
            ${euros(
              custoLitro
            )}/L
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Margem estimada/L
          </span>
          <strong>
            ${euros(
              margemLitro
            )}/L
          </strong>
        </div>

        <div class="detail-row">
          <span>
            Custos previstos/mês
          </span>
          <strong>
            ${euros(
              custos
            )}
          </strong>
        </div>

        <div class="detail-row">
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

        <div class="detail-row">
          <span>
            Receita leite/mês
          </span>
          <strong>
            ${euros(
              receita
            )}
          </strong>
        </div>

        <div class="detail-row">
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
   ADICIONAR ANIMAL
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


  if (raca === null) {
    return
  }


  const nome =
    prompt(
      'Nome (opcional):',
      ''
    )


  if (nome === null) {
    return
  }


  const notas =
    prompt(
      'Notas (opcional):',
      ''
    )


  if (notas === null) {
    return
  }


  const { error } =
    await supabase
      .from('animals')
      .insert({

        farm_id:
          FARM_ID,

        number:
          numeroAnimal.trim(),

        breed:
          raca.trim() ||
          null,

        name:
          nome.trim() ||
          null,

        notes:
          notas.trim() ||
          null
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

  animaisScreen()
}



/* =========================================================
   EDITAR ANIMAL
========================================================= */

async function editarAnimal(
  animalNumero
) {

  const vaca =
    cows.find(
      animal =>
        String(animal.id) ===
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
      'Estado:',
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

  detalheAnimal(
    animalNumero,
    voltarDetalhe
  )
}



/* =========================================================
   LISTA DE ANIMAIS 1.2
========================================================= */

function animaisScreen() {

  voltarDetalhe =
    'animais'


  const lista =
    [...cows].sort(
      (a, b) =>
        String(a.id)
          .localeCompare(
            String(b.id),
            undefined,
            {
              numeric: true
            }
          )
    )


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="inicio"
      >
        ← Voltar
      </button>


      <h1>
        🐄 Vacas
      </h1>

      <p class="muted">
        ${lista.length}
        animais registados
      </p>


      <section class="card">

        <button
          data-action="adicionar-animal"
        >
          ➕ Adicionar animal
        </button>

      </section>


      <section class="card">

        <input
          id="animalSearch"
          class="search"
          type="search"
          placeholder="Pesquisar número, nome ou raça"
          autocomplete="off"
        >

        <div id="animalList">

          ${renderListaAnimais(
            lista
          )}

        </div>

      </section>

    </main>
  `
}



/* =========================================================
   DETALHE DO ANIMAL 1.2
========================================================= */

function detalheAnimal(
  id,
  voltar = null
) {

  if (voltar) {
    voltarDetalhe = voltar
  }


  const vaca =
    cows.find(
      animal =>
        String(animal.id) ===
        String(id)
    )


  if (!vaca) {

    animaisScreen()

    return
  }


  const diagnosticoPendente =
    obterDiagnosticosPendentes()
      .find(
        item =>
          String(item.vaca.id) ===
          String(vaca.id)
      )


  app.innerHTML = `
    <main class="app">

      <button
        class="secondary"
        data-action="voltar-detalhe"
      >
        ← Voltar
      </button>


      <h1>
        🐄 ${vaca.id}
      </h1>

      ${
        vaca.nome
          ? `
            <p class="muted">
              ${vaca.nome}
            </p>
          `
          : ''
      }


      ${
        diagnosticoPendente
          ? `
            <section class="card">

              <h2>
                🩺 Diagnóstico pendente
              </h2>

              <p>
                IA realizada há
                <strong>
                  ${diagnosticoPendente.diasPosIA}
                  dias
                </strong>.
              </p>

              <button
                data-action="diagnostico"
                data-id="${vaca.id}"
              >
                Registar diagnóstico
              </button>

            </section>
          `
          : ''
      }


      <section class="card">

        <h2>
          Informação
        </h2>


        <div class="detail-row">

          <span>
            Número
          </span>

          <strong>
            ${vaca.id}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Raça
          </span>

          <strong>
            ${vaca.raca}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Estado
          </span>

          <strong>
            ${vaca.status}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Nascimento
          </span>

          <strong>
            ${formatDate(
              vaca.nascimento
            )}
          </strong>

        </div>

      </section>


      <section class="card">

        <h2>
          Reprodução
        </h2>


        <div class="detail-row">

          <span>
            Última IA
          </span>

          <strong>
            ${formatDate(
              vaca.ia
            )}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Touro
          </span>

          <strong>
            ${vaca.touro || '—'}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Sémen
          </span>

          <strong>
            ${vaca.semen || '—'}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Resultado IA
          </span>

          <strong>
            ${vaca.resultadoIA || '—'}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Secagem prevista
          </span>

          <strong>
            ${formatDate(
              vaca.secagem
            )}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Parto previsto
          </span>

          <strong>
            ${formatDate(
              vaca.parto
            )}
          </strong>

        </div>


        <div class="detail-row">

          <span>
            Última secagem
          </span>

          <strong>
            ${formatDate(
              vaca.ultimaSecagem
            )}
          </strong>

        </div>


        <div class="detail-row">

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


        ${
          vaca.ia
            ? `
              <button
                data-action="diagnostico"
                data-id="${vaca.id}"
              >
                🩺 Registar diagnóstico
              </button>

              <br><br>
            `
            : ''
        }


        ${
          vaca.secagem
            ? `
              <button
                data-action="secagem"
                data-id="${vaca.id}"
              >
                ✅ Marcar secagem realizada
              </button>

              <br><br>
            `
            : ''
        }


        <button
          data-action="parto"
          data-id="${vaca.id}"
        >
          🐄 Registar parto
        </button>

        <br><br>


        <button
          class="secondary"
          data-action="editar-animal"
          data-id="${vaca.id}"
        >
          ✏️ Editar ficha
        </button>

      </section>


      ${
        vaca.eventos?.length
          ? `
            <section class="card">

              <h2>
                📋 Histórico
              </h2>

              ${vaca.eventos
                .slice(0, 15)
                .map(
                  evento => `

                    <div class="detail-row">

                      <span>
                        ${nomeEvento(
                          evento.event_type
                        )}
                      </span>

                      <strong>
                        ${formatDate(
                          evento.event_date
                        )}
                      </strong>

                    </div>

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

                  `
                )
                .join('')}

            </section>
          `
          : ''
      }

    </main>
  `
}



/* =========================================================
   VOLTAR DO DETALHE 1.2
========================================================= */

function voltarDoDetalhe() {

  if (
    voltarDetalhe ===
    'alertas'
  ) {

    alertasScreen()

    return
  }


  if (
    voltarDetalhe ===
    'diagnosticos'
  ) {

    diagnosticosScreen()

    return
  }


  if (
    voltarDetalhe ===
    'hoje'
  ) {

    hojeScreen()

    return
  }


  if (
    voltarDetalhe ===
    'reproducao'
  ) {

    reproducaoScreen()

    return
  }


  if (
    voltarDetalhe ===
    'inicio'
  ) {

    inicio()

    return
  }


  animaisScreen()
}



/* =========================================================
   PAINEL PRINCIPAL
========================================================= */

function inicio() {

  const tarefas =
    obterTarefasExploracao()


  const atrasadas =
    tarefas.filter(
      tarefa =>
        tarefa.dias < 0
    )


  const tarefasHoje =
    tarefas.filter(
      tarefa =>
        tarefa.dias === 0
    )


  const proximos7 =
    tarefas.filter(
      tarefa =>
        tarefa.dias > 0 &&
        tarefa.dias <= 7
    )


  const diagnosticos =
    obterDiagnosticosPendentes()


  const leite =
    milkRecords[0] ||
    null


  const litros =
    dashboardData
      ?.latest_liters ??
    leite?.liters ??
    null


  const vacasOrdenha =
    dashboardData
      ?.latest_milking_cows ??
    leite?.milking_cows ??
    null


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
          ☀️ Hoje na exploração
        </h2>


        <p>
          ${
            atrasadas.length
              ? `
                🔴
                <strong>
                  ${atrasadas.length}
                </strong>
                tarefas atrasadas
              `
              : `
                ✅ Sem tarefas atrasadas
              `
          }
        </p>


        <p>
          📌
          <strong>
            ${tarefasHoje.length}
          </strong>
          para hoje
        </p>


        <p>
          📅
          <strong>
            ${proximos7.length}
          </strong>
          nos próximos 7 dias
        </p>


        <p>
          🩺
          <strong>
            ${diagnosticos.length}
          </strong>
          diagnósticos pendentes
        </p>


        <button
          data-action="hoje"
        >
          Ver tarefas
        </button>

      </section>


      ${
        tarefas.length
          ? `
            <h2>
              Prioridades
            </h2>

            ${tarefas
              .slice(0, 5)
              .map(
                tarefa =>
                  cartaoTarefa(
                    tarefa,
                    'inicio'
                  )
              )
              .join('')}
          `
          : `
            <section class="card">

              <h2>
                ✅ Tudo em dia
              </h2>

              <p class="muted">
                Não existem tarefas reprodutivas pendentes.
              </p>

            </section>
          `
      }


      <section class="card">

        <h2>
          📊 Resumo da exploração
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
          🐄 Animais
        </h2>

        <p>
          Gestão das fichas
          do rebanho.
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
          IA, diagnósticos,
          secagens e partos.
        </p>

        <button
          data-action="reproducao"
        >
          Ver reprodução
        </button>

      </section>


      <section class="card">

        <h2>
          🩺 Diagnósticos
        </h2>

        <p>
          <strong>
            ${diagnosticos.length}
          </strong>
          pendentes
        </p>

        <button
          data-action="diagnosticos"
        >
          Ver diagnósticos
        </button>

      </section>


      <section class="card">

        <h2>
          🔔 Alertas
        </h2>

        <p>
          Secagens e partos
          próximos.
        </p>

        <button
          data-action="alertas"
        >
          Ver alertas
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
          Saldo registado:
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
      action === 'login'
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
      action === 'inicio'
    ) {

      inicio()

      return
    }


    if (
      action === 'hoje'
    ) {

      hojeScreen()

      return
    }


    if (
      action === 'alertas'
    ) {

      alertasScreen()

      return
    }


    if (
      action ===
      'diagnosticos'
    ) {

      diagnosticosScreen()

      return
    }


    if (
      action === 'animais'
    ) {

      animaisScreen()

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

      reproducaoScreen()

      return
    }


    if (
      action ===
      'producao'
    ) {

      producaoScreen()

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

      financasScreen()

      return
    }


    if (
      action ===
      'rentabilidade'
    ) {

      rentabilidadeScreen()

      return
    }
    if (
      action ===
      'definicoes'
    ) {

      definicoesScreen()

      return
    }


    if (
      action ===
      'analises-leite'
    ) {

      analisesLeiteScreen()

      return
    }


    if (
      action ===
      'adicionar-analise-fotografia'
    ) {

      document
        .querySelector(
          '#milkAnalysisPhoto'
        )
        ?.click()

      return
    }


    if (
      action ===
      'relatorios'
    ) {

      relatoriosScreen()

      return
    }


    if (
      action ===
      'mais'
    ) {

      marcarBarraAtiva(
        'mais'
      )

      maisScreen()

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

      detalheAnimal(
        elemento.dataset.id,
        elemento.dataset.voltar
      )

      return
    }


    if (
      action ===
      'voltar-detalhe'
    ) {

      voltarDoDetalhe()

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
      'diagnostico'
    ) {

      await registarDiagnostico(
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
      action === 'logout'
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
   PESQUISA DE ANIMAIS
========================================================= */

app.addEventListener(
  'input',
  event => {

    if (
      event.target.id ===
      'animalSearch'
    ) {

      pesquisarAnimais(
        event.target.value
      )
    }
  }
)


app.addEventListener(
  'change',
  event => {

    if (
      event.target.id ===
      'milkAnalysisPhoto'
    ) {

      prepararLeituraAnaliseImagem(
        event.target.files?.[0]
      )
    }
  }
)


app.addEventListener(
  'submit',
  async event => {

    if (
      event.target.id ===
      'milkAnalysisForm'
    ) {

      event.preventDefault()

      await guardarAnaliseLeite()
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

/* =========================================================
   NAVEGAÇÃO INFERIOR
========================================================= */

function criarBarraInferior() {

  if (
    document.querySelector(
      '.bottom-nav'
    )
  ) {
    return
  }

  const barra =
    document.createElement(
      'nav'
    )

  barra.className =
    'bottom-nav'

  barra.innerHTML = `
    <button
      class="bottom-nav-item"
      data-action="inicio"
    >
      <span class="bottom-nav-icon">
        🏠
      </span>
      <span>
        Início
      </span>
    </button>

    <button
      class="bottom-nav-item"
      data-action="animais"
    >
      <span class="bottom-nav-icon">
        🐄
      </span>
      <span>
        Animais
      </span>
    </button>

    <button
      class="bottom-nav-item"
      data-action="reproducao"
    >
      <span class="bottom-nav-icon">
        🧬
      </span>
      <span>
        Reprodução
      </span>
    </button>

    <button
      class="bottom-nav-item"
      data-action="producao"
    >
      <span class="bottom-nav-icon">
        🥛
      </span>
      <span>
        Produção
      </span>
    </button>

    <button
      class="bottom-nav-item"
      data-action="mais"
    >
      <span class="bottom-nav-icon">
        ☰
      </span>
      <span>
        Mais
      </span>
    </button>
  `

  document.body.appendChild(
    barra
  )
}


function atualizarBarraInferior() {

  const existeApp =
    document.querySelector(
      'main.app'
    )

  const estaLogin =
    document.querySelector(
      '#email'
    ) ||
    document.querySelector(
      '#password'
    )

  const barra =
    document.querySelector(
      '.bottom-nav'
    )

  if (
    existeApp &&
    !estaLogin
  ) {

    criarBarraInferior()

    document.body.classList.add(
      'com-bottom-nav'
    )

  } else {

    if (barra) {
      barra.remove()
    }

    document.body.classList.remove(
      'com-bottom-nav'
    )
  }
}


const observadorBarra =
  new MutationObserver(
    () => {
      atualizarBarraInferior()
    }
  )


observadorBarra.observe(
  app,
  {
    childList: true,
    subtree: true
  }
)


atualizarBarraInferior()

document.addEventListener('click', event => {
  const item = event.target.closest('.bottom-nav-item')

  if (!item) return

  const action = item.dataset.action

  if (action === 'inicio') {
  marcarBarraAtiva('inicio')
  inicio()
  return
}

if (action === 'animais') {
  marcarBarraAtiva('animais')
  animaisScreen()
  return
}

if (action === 'reproducao') {
  marcarBarraAtiva('reproducao')
  reproducaoScreen()
  return
}

if (action === 'producao') {
  marcarBarraAtiva('producao')
  producaoScreen()
  return
}

if (action === 'mais') {
  marcarBarraAtiva('mais')
  maisScreen()
  return
}
})

function marcarBarraAtiva(action) {
  document
    .querySelectorAll('.bottom-nav-item')
    .forEach(item => {
      item.classList.remove('ativo')
    })

  const ativo = document.querySelector(
    `.bottom-nav-item[data-action="${action}"]`
  )

  if (ativo) {
    ativo.classList.add('ativo')
  }
}

function maisScreen() {

  app.innerHTML = `
    <main class="app">

      <section class="hero">
        <h1>☰ Mais</h1>
        <p>Gestão da exploração</p>
      </section>

      
<section class="card">
  <h2>💶 Finanças</h2>
  <p>Receitas, despesas e resultado da exploração.</p>
  <button data-action="financas">
    Abrir finanças
  </button>
</section>

<section class="card">
  <h2>🥛 Análises do leite</h2>
  <p>Gordura, proteína, células somáticas, UFC e histórico.</p>
  <button data-action="analises-leite">
    Abrir análises
  </button>
</section>

<section class="card">
  <h2>📊 Relatórios</h2>
  <p>Resumo da produção, reprodução e desempenho.</p>
  <button data-action="relatorios">
    Abrir relatórios
  </button>
</section>

      <section class="card">
        <h2>⚙️ Definições</h2>
        <p>Configurações da Lavoura+.</p>
        <button data-action="definicoes">
          Abrir definições
        </button>
      </section>

      <section class="card">
        <h2>🔐 Conta</h2>
        <p>Sessão e acesso à aplicação.</p>
        <button data-action="logout">
          Sair
        </button>
      </section>

    </main>
  `
}

function definicoesScreen() {
  app.innerHTML = `
    <main class="app">

      <section class="hero">
        <h1>⚙️ Definições</h1>
        <p>Configurações da Lavoura+</p>
      </section>

      <section class="card">
        <h2>🐄 Exploração</h2>
        <p>Preferências gerais da exploração.</p>
      </section>

      <section class="card">
        <h2>🔔 Alertas</h2>
        <p>Configurações de avisos e tarefas.</p>
      </section>

      <section class="card">
        <h2>📱 Aplicação</h2>
        <p>Preferências da Lavoura+.</p>
      </section>

      <button data-action="mais">
        ← Voltar
      </button>

    </main>
  `
}
function analisesLeiteScreen() {
  const analises =
    getMilkAnalysisRecords(
      milkRecords
    )

  const medias =
    getMilkAnalysisSummary(
      analises
    )

  const indicador = (
    metric,
    melhorQuandoDesce = false
  ) => {
    const tendencia =
      getMilkMetricTrend(
        analises,
        metric
      )

    if (tendencia === 'stable') {
      return '<span class="milk-trend stable" title="Sem alteração">→</span>'
    }

    const melhorou =
      melhorQuandoDesce
        ? tendencia === 'down'
        : tendencia === 'up'

    return `<span class="milk-trend ${melhorou ? 'better' : 'worse'}" title="Evolução face à análise anterior">${tendencia === 'up' ? '↑' : '↓'}</span>`
  }

  const media = (
    valor,
    casas = 2
  ) => valor === null
    ? '—'
    : numero(valor, casas)

  app.innerHTML = `
    <main class="app">

      <section class="hero">
        <h1>🥛 Análises do leite</h1>
        <p>Qualidade e composição do leite</p>
      </section>

      <section class="milk-summary" aria-label="Médias das análises">
        <div class="milk-stat">
          <span>Gordura média</span>
          <strong>${media(medias.fat)}% ${indicador('fat')}</strong>
        </div>
        <div class="milk-stat">
          <span>Proteína média</span>
          <strong>${media(medias.protein)}% ${indicador('protein')}</strong>
        </div>
        <div class="milk-stat">
          <span>Células médias</span>
          <strong>${media(medias.somatic_cells, 0)} ${indicador('somatic_cells', true)}</strong>
        </div>
        <div class="milk-stat">
          <span>UFC média</span>
          <strong>${media(medias.ufc, 0)} ${indicador('ufc', true)}</strong>
        </div>
      </section>

      <section class="card">
        <h2>➕ Nova análise</h2>
        <form id="milkAnalysisForm" class="milk-analysis-form">
          <label>
            Data
            <input name="record_date" type="date" value="${hojeISO()}" required>
          </label>
          <label>
            Gordura %
            <input name="fat" type="number" inputmode="decimal" min="0" step="0.01" required>
          </label>
          <label>
            Proteína %
            <input name="protein" type="number" inputmode="decimal" min="0" step="0.01" required>
          </label>
          <label>
            Células somáticas
            <input name="somatic_cells" type="number" inputmode="numeric" min="0" step="1" required>
          </label>
          <label>
            UFC
            <input name="ufc" type="number" inputmode="numeric" min="0" step="1" required>
          </label>
          <label class="full-width">
            Observações
            <textarea name="notes" rows="3" maxlength="1000" placeholder="Informação adicional (opcional)"></textarea>
          </label>
          <div class="milk-form-actions full-width">
            <button type="submit">
              Guardar análise
            </button>
            <button type="button" class="back" data-action="adicionar-analise-fotografia">
              📷 Adicionar por fotografia
            </button>
          </div>
          <input
            id="milkAnalysisPhoto"
            class="visually-hidden"
            type="file"
            accept="image/*"
            capture="environment"
          >
          <p id="milkAnalysisPhotoStatus" class="muted full-width" aria-live="polite">
            A fotografia pode ser tirada ou selecionada no iPhone. A leitura automática será adicionada numa próxima fase.
          </p>
        </form>
      </section>

      <h2>📈 Histórico</h2>

      ${
        analises.length
          ? analises.map(registo => `
              <section class="card milk-history-item">
                <strong>${formatDate(registo.record_date)}</strong>
                <div class="milk-history-values">
                  <span>Gordura <b>${numero(registo.fat, 2)}%</b></span>
                  <span>Proteína <b>${numero(registo.protein, 2)}%</b></span>
                  <span>Células <b>${numero(registo.somatic_cells, 0)}</b></span>
                  <span>UFC <b>${numero(registo.ufc, 0)}</b></span>
                </div>
                ${registo.notes ? `<p class="muted milk-notes"></p>` : ''}
              </section>
            `).join('')
          : '<section class="card"><p class="muted">Ainda não existem análises registadas.</p></section>'
      }

      <button data-action="mais">
        ← Voltar
      </button>

    </main>
  `

  app
    .querySelectorAll(
      '.milk-history-item'
    )
    .forEach((item, index) => {
      const notes =
        analises[index]?.notes

      if (notes) {
        item.querySelector(
          '.milk-notes'
        ).textContent = notes
      }
    })
}


async function guardarAnaliseLeite() {
  const form =
    document.querySelector(
      '#milkAnalysisForm'
    )

  if (!form?.reportValidity()) {
    return
  }

  const values =
    Object.fromEntries(
      new FormData(form)
    )

  const payload =
    buildMilkAnalysisPayload(
      values,
      FARM_ID
    )

  const existente =
    milkRecords.find(registo =>
      registo.record_date ===
      payload.record_date
    )

  const query = existente
    ? supabase
      .from('milk_records')
      .update(payload)
      .eq('id', existente.id)
    : supabase
      .from('milk_records')
      .insert(payload)

  const { error } =
    await query

  if (error) {
    alert(
      'Erro ao guardar análise: ' +
      error.message
    )
    return
  }

  await carregarDados()

  analisesLeiteScreen()

  alert('✅ Análise guardada.')
}


function prepararLeituraAnaliseImagem(file) {
  const status =
    document.querySelector(
      '#milkAnalysisPhotoStatus'
    )

  if (!file || !status) {
    return
  }

  status.textContent =
    `Fotografia “${file.name}” selecionada. A leitura automática ainda não está ativa; nenhum valor foi preenchido.`
}

function relatoriosScreen() {
  app.innerHTML = `
    <main class="app">

      <section class="hero">
        <h1>📊 Relatórios</h1>
        <p>Resumo da exploração</p>
      </section>

      <section class="card">
        <h2>🥛 Produção</h2>
        <p>Produção diária, médias e evolução.</p>
      </section>

      <section class="card">
        <h2>🧬 Reprodução</h2>
        <p>Inseminações, diagnósticos, partos e secagens.</p>
      </section>

      <section class="card">
        <h2>💶 Finanças</h2>
        <p>Receitas, despesas e resultado da exploração.</p>
      </section>

      <button data-action="mais">
        ← Voltar
      </button>

    </main>
  `
}
