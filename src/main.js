import './style.css'
import { createClient } from '@supabase/supabase-js'

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

window.lavouraSupabase = supabase

const app =
  document.querySelector('#app')

let cows = []

let milkRecords = []

let milkMonthly = []

let voltarDetalhe =
  'animais'

let recoveryMode =
  false


/* =========================
   UTILIDADES
========================= */

function formatDate(data) {

  if (!data) {
    return '—'
  }

  const [ano, mes, dia] =
    data.split('-')

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
    ) / 86400000
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


function numero(
  valor,
  casas = 1
) {

  const n =
    Number(valor)

  if (
    valor === null ||
    valor === undefined ||
    Number.isNaN(n)
  ) {
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


function euros(
  valor
) {

  const n =
    Number(valor)

  if (
    valor === null ||
    valor === undefined ||
    Number.isNaN(n)
  ) {
    return '—'
  }

  return n.toLocaleString(
    'pt-PT',
    {
      style: 'currency',
      currency: 'EUR'
    }
  )
}


/* =========================
   LOGIN
========================= */

function loginScreen(
  mensagem = ''
) {

  recoveryMode = false

  app.innerHTML = `
    <main class="app">

      <h1>🐄 Lavoura+</h1>

      <p class="subtitle">
        Acesso seguro
      </p>

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
        </button>

        <br><br>

        <button
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


/* =========================
   RECUPERAÇÃO PASSWORD
========================= */

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
    '✅ Email de recuperação enviado. Verifique a sua caixa de entrada.'
}


function recoveryScreen() {

  recoveryMode = true

  app.innerHTML = `
    <main class="app">

      <h1>
        🔑 Nova palavra-passe
      </h1>

      <section class="card">

        <h2>
          Alterar palavra-passe
        </h2>

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
      .querySelector('#newPassword')
      .value

  const confirmPassword =
    document
      .querySelector('#confirmPassword')
      .value

  const msg =
    document
      .querySelector('#passwordMsg')

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
    confirmPassword
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

  msg.textContent =
    '✅ Palavra-passe alterada com sucesso.'

  recoveryMode = false

  window.history.replaceState(
    {},
    document.title,
    window.location.pathname
  )

  setTimeout(
    async () => {
      await verificarSeguranca()
    },
    1000
  )
}


/* =========================
   2FA
========================= */

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

  const { data, error } =
    await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()

  if (error) {

    loginScreen(
      'Erro ao verificar segurança.'
    )

    return
  }

  if (
    data.currentLevel === 'aal2'
  ) {

    await carregarDados()

    return
  }

  if (
    data.nextLevel === 'aal2'
  ) {

    await pedirCodigo2FA()

    return
  }

  await carregarDados()
}


async function pedirCodigo2FA() {

  const { data, error } =
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

        <h2>
          Código de segurança
        </h2>

        <input
          id="codigo2fa"
          class="search"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
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

  const input =
    document
      .querySelector('#codigo2fa')

  const msg =
    document
      .querySelector('#mfaMsg')

  if (
    !input ||
    !msg
  ) {
    return
  }

  const codigo =
    input.value.trim()

  if (
    !/^\d{6}$/.test(codigo)
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
        code: codigo
      })

  if (verify.error) {

    msg.textContent =
      'Código incorreto ou expirado.'

    return
  }

  await carregarDados()
}


/* =========================
   CARREGAR DADOS
========================= */

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
        number,
        breed,
        status,
        notes
      `)
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
      .select(`
        id,
        farm_id,
        record_date,
        liters,
        milking_cows,
        price_per_liter,
        fat,
        protein,
        somatic_cells,
        ufc,
        urea,
        lactose,
        created_at
      `)
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
      .limit(60)

  if (milk.error) {

    erroDados(
      milk.error.message
    )

    return
  }

  milkRecords =
    milk.data || []

  const monthly =
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

  milkMonthly =
    monthly.error
      ? []
      : monthly.data || []

  cows =
    animals.data.map(
      animal => {

        const eventosAnimal =
          reproduction.data
            .filter(
              r =>
                r.animal_id ===
                animal.id
            )
            .sort(
              (a, b) =>
                b.event_date.localeCompare(
                  a.event_date
                )
            )

        const ultimaIA =
          eventosAnimal.find(
            r =>
              r.event_type ===
              'IA'
          )

        const ultimaSecagem =
          eventosAnimal.find(
            r =>
              r.event_type ===
              'SECAGEM'
          )

        const ultimoParto =
          eventosAnimal.find(
            r =>
              r.event_type ===
              'PARTO'
          )

        let secagemPrevista =
          ultimaIA
            ?.expected_dry_off ||
          null

        let partoPrevisto =
          ultimaIA
            ?.expected_calving ||
          null

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

          raca:
            animal.breed || '—',

          status:
            animal.status || '—',

          ia:
            ultimaIA?.event_date || null,

          touro:
            ultimaIA?.bull || '—',

          parto:
            partoPrevisto,

          secagem:
            secagemPrevista,

          ultimaSecagem:
            ultimaSecagem?.event_date || null,

          ultimoParto:
            ultimoParto?.event_date || null,

          notas:
            animal.notes || '',

          eventos:
            eventosAnimal
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


/* =========================
   ALERTAS
========================= */

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
            tipo: 'Secagem',
            icon: '🟠',
            data: vaca.secagem,
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
            tipo: 'Parto',
            icon: '🔵',
            data: vaca.parto,
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


/* =========================
   INÍCIO
========================= */

function inicio() {

  const eventos =
    obterAlertas()

  const comIA =
    cows.filter(
      vaca =>
        vaca.ia
    ).length

  const comPartoPrevisto =
    cows.filter(
      vaca =>
        vaca.parto
    ).length

  const leite =
    milkRecords[0] || null

  const litrosVaca =
    leite &&
    leite.milking_cows
      ? Number(leite.liters) /
        Number(leite.milking_cows)
      : null

  app.innerHTML = `
    <main class="app">

      <h1>
        🐄 Lavoura+
      </h1>

      <p class="subtitle">
        Gestão da Exploração
      </p>

      <h2>
        Painel Principal
      </h2>


      <section class="card">

        <h2>
          🔔 Alertas
        </h2>

        <p>
          <strong>
            ${eventos.length}
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
          🐄 Vacas
        </h2>

        <p>
          <strong>
            ${cows.length} animais
          </strong>
          registados
        </p>

        <button
          data-action="animais"
        >
          Ver animais
        </button>

      </section>


      <section class="card">

        <h2>
          🥛 Produção
        </h2>

        ${
          leite
            ? `
              <p>
                <strong>
                  ${numero(
                    leite.liters,
                    0
                  )} L
                </strong>
                em
                ${formatDate(
                  leite.record_date
                )}
              </p>

              <p>
                ${numero(
                  litrosVaca,
                  1
                )}
                L/vaca/dia
              </p>
            `
            : `
              <p>
                Sem produção registada.
              </p>
            `
        }

        <button
          data-action="producao"
        >
          Ver produção
        </button>

      </section>


      <section class="card">

        <h2>
          📅 Reprodução
        </h2>

        <p>
          <strong>
            ${comIA}
          </strong>
          animais com IA registada
        </p>

        <p>
          <strong>
            ${comPartoPrevisto}
          </strong>
          partos previstos
        </p>

        <button
          data-action="reproducao"
        >
          Ver reprodução
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


/* =========================
   PRODUÇÃO
========================= */

function producao() {

  const ultimo =
    milkRecords[0] || null

  const litros =
    ultimo
      ? Number(ultimo.liters)
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

  const receitaDia =
    litros &&
    preco
      ? litros * preco
      : null

  const receitaMes =
    receitaDia
      ? receitaDia * 30
      : null

  const litrosMes =
    litros
      ? litros * 30
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

      <p class="subtitle">
        Produção e qualidade do leite
      </p>


      ${
        ultimo
          ? `
            <section class="card hero">

              <p class="muted">
                Produção mais recente
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
                  Vacas em lactação
                </span>

                <strong>
                  ${vacas || '—'}
                </strong>
              </div>


              <div>
                <span>
                  Litros/vaca/dia
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
                    receitaDia
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Estimativa 30 dias
                </span>

                <strong>
                  ${euros(
                    receitaMes
                  )}
                </strong>
              </div>


              <div>
                <span>
                  Litros em 30 dias
                </span>

                <strong>
                  ${numero(
                    litrosMes,
                    0
                  )} L
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
                      ? numero(
                          ultimo.fat,
                          2
                        ) + '%'
                      : '—'
                  }
                </strong>
              </p>

              <p>
                Proteína:
                <strong>
                  ${
                    ultimo.protein !== null
                      ? numero(
                          ultimo.protein,
                          2
                        ) + '%'
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

            </section>
          `
          : `
            <section class="card">
              Ainda não existem registos
              de produção.
            </section>
          `
      }


      <section class="card">

        <h2>
          ➕ Novo registo
        </h2>

        <p>
          Registar ou atualizar
          a produção do dia.
        </p>

        <button
          data-action="registar-producao"
        >
          Registar produção
        </button>

      </section>


      <h2>
        📋 Histórico
      </h2>

      ${
        milkRecords.length
          ? milkRecords
            .slice(0, 15)
            .map(
              registo => {

                const lpv =
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
                        ${
                          registo.milking_cows
                            || '—'
                        }
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
                          lpv,
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
                        )} L
                      </strong>
                    </p>

                    <p>
                      Média/dia:
                      <strong>
                        ${numero(
                          mes.avg_liters_per_recorded_day,
                          0
                        )} L
                      </strong>
                    </p>

                    <p>
                      Média/vaca:
                      <strong>
                        ${numero(
                          mes.avg_liters_per_cow,
                          1
                        )} L
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


/* =========================
   REGISTAR PRODUÇÃO
========================= */

async function registarProducao() {

  const data =
    prompt(
      'Data da produção (AAAA-MM-DD):',
      hojeISO()
    )

  if (!data) {
    return
  }

  const litrosTexto =
    prompt(
      'Litros produzidos:',
      milkRecords[0]
        ?.liters || '700'
    )

  if (!litrosTexto) {
    return
  }

  const vacasTexto =
    prompt(
      'Número de vacas em lactação:',
      milkRecords[0]
        ?.milking_cows || '33'
    )

  if (!vacasTexto) {
    return
  }

  const precoTexto =
    prompt(
      'Preço por litro (€):',
      milkRecords[0]
        ?.price_per_liter || '0.42'
    )

  if (!precoTexto) {
    return
  }

  const litros =
    Number(
      litrosTexto
        .replace(',', '.')
    )

  const vacas =
    Number(
      vacasTexto
        .replace(',', '.')
    )

  const preco =
    Number(
      precoTexto
        .replace(',', '.')
    )

  if (
    !litros ||
    litros <= 0 ||
    !vacas ||
    vacas <= 0 ||
    !preco ||
    preco <= 0
  ) {

    alert(
      'Verifique os valores introduzidos.'
    )

    return
  }

  const gorduraTexto =
    prompt(
      'Gordura (%) — pode deixar vazio:',
      ''
    )

  const proteinaTexto =
    prompt(
      'Proteína (%) — pode deixar vazio:',
      ''
    )

  const gordura =
    gorduraTexto
      ? Number(
          gorduraTexto.replace(
            ',',
            '.'
          )
        )
      : null

  const proteina =
    proteinaTexto
      ? Number(
          proteinaTexto.replace(
            ',',
            '.'
          )
        )
      : null

  const existente =
    milkRecords.find(
      r =>
        r.record_date === data
    )

  const payload = {

    farm_id:
      FARM_ID,

    record_date:
      data,

    liters:
      litros,

    milking_cows:
      vacas,

    price_per_liter:
      preco,

    fat:
      gordura,

    protein:
      proteina
  }


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
      '✅ Produção do dia atualizada.'
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
      '✅ Produção registada com sucesso.'
    )
  }

  await carregarDados()

  producao()
}


/* =========================
   REPRODUÇÃO
========================= */

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

  const proximasSecagens =
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

  const proximosPartos =
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
            ${proximasSecagens.length}
          </strong>
          secagens previstas
        </p>

        <p>
          🔵
          <strong>
            ${proximosPartos.length}
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
            .slice(0, 15)
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
              Sem inseminações registadas.
            </section>
          `
      }


      <h2>
        🟠 Próximas secagens
      </h2>

      ${
        proximasSecagens.length
          ? proximasSecagens
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
            <section class="card">
              Sem secagens previstas.
            </section>
          `
      }


      <h2>
        🔵 Próximos partos
      </h2>

      ${
        proximosPartos.length
          ? proximosPartos
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
            <section class="card">
              Sem partos previstos.
            </section>
          `
      }

    </main>
  `
}


/* =========================
   ALERTAS
========================= */

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
        Próximos 30 dias
      </p>

      ${
        eventos.length
          ? eventos
            .map(
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
                    🐄 ${evento.vaca.id}
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
            )
            .join('')
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


/* =========================
   ANIMAIS
========================= */

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
        ${cows.length} vacas
      </p>

      <input
        id="pesquisa"
        class="search"
        placeholder="Pesquisar vaca, touro, raça ou estado…"
      >

      <div id="lista"></div>

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
    texto
      .toLowerCase()
      .trim()

  const resultado =
    cows.filter(
      vaca =>
        `${vaca.id} ${vaca.touro} ${vaca.raca} ${vaca.status}`
          .toLowerCase()
          .includes(q)
    )

  const lista =
    document
      .querySelector('#lista')

  lista.innerHTML =
    resultado.length
      ? resultado
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
        )
        .join('')
      : `
        <section class="card">
          Nenhum animal encontrado.
        </section>
      `
}


/* =========================
   FICHA DA VACA
========================= */

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
      .slice(0, 15)

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

        <p class="muted">
          Estado:
          ${vaca.status}
        </p>

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


      <h2>
        📋 Histórico reprodutivo
      </h2>

      ${
        historico.length
          ? historico
            .map(
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
            )
            .join('')
          : `
            <section class="card">
              Sem histórico reprodutivo.
            </section>
          `
      }

    </main>
  `
}


/* =========================
   SECAGEM
========================= */

async function registarSecagem(
  animalNumero
) {

  const {
    data: animal,
    error: animalError
  } =
    await supabase
      .from('animals')
      .select(
        'id, farm_id'
      )
      .eq(
        'number',
        animalNumero
      )
      .single()

  if (animalError) {

    alert(
      'Erro ao localizar a vaca: ' +
      animalError.message
    )

    return
  }

  const dataSecagem =
    prompt(
      'Data da secagem (AAAA-MM-DD):',
      hojeISO()
    )

  if (!dataSecagem) {
    return
  }

  const confirmar =
    confirm(
      `Confirmar secagem da vaca ${animalNumero} em ${dataSecagem}?`
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
          dataSecagem
      })

  if (error) {

    alert(
      'Erro ao guardar a secagem: ' +
      error.message
    )

    return
  }

  alert(
    '✅ Secagem registada com sucesso.'
  )

  await carregarDados()
}


/* =========================
   PARTO
========================= */

async function registarParto(
  animalNumero
) {

  const {
    data: animal,
    error: animalError
  } =
    await supabase
      .from('animals')
      .select(
        'id, farm_id'
      )
      .eq(
        'number',
        animalNumero
      )
      .single()

  if (animalError) {

    alert(
      'Erro ao localizar a vaca: ' +
      animalError.message
    )

    return
  }

  const dataParto =
    prompt(
      'Data do parto (AAAA-MM-DD):',
      hojeISO()
    )

  if (!dataParto) {
    return
  }

  const confirmar =
    confirm(
      `Confirmar parto da vaca ${animalNumero} em ${dataParto}?`
    )

  if (!confirmar) {
    return
  }

  const {
    error: partoError
  } =
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
          dataParto
      })

  if (partoError) {

    alert(
      'Erro ao guardar o parto: ' +
      partoError.message
    )

    return
  }

  await supabase
    .from('animals')
    .update({
      last_calving_date:
        dataParto
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


/* =========================
   INSEMINAÇÃO
========================= */

async function registarIA(
  animalNumero
) {

  const {
    data: animal,
    error: animalError
  } =
    await supabase
      .from('animals')
      .select(
        'id, farm_id'
      )
      .eq(
        'number',
        animalNumero
      )
      .single()

  if (animalError) {

    alert(
      'Erro ao localizar a vaca: ' +
      animalError.message
    )

    return
  }

  const dataIA =
    prompt(
      'Data da inseminação (AAAA-MM-DD):',
      hojeISO()
    )

  if (!dataIA) {
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

  const confirmar =
    confirm(
      `Confirmar inseminação da vaca ${animalNumero} em ${dataIA} com o touro ${touro}?`
    )

  if (!confirmar) {
    return
  }

  const dataPrevista =
    new Date(
      dataIA +
      'T12:00:00'
    )

  dataPrevista.setDate(
    dataPrevista.getDate() +
    283
  )

  const partoPrevisto =
    dataPrevista
      .toISOString()
      .slice(0, 10)

  const dataSecagem =
    new Date(
      dataPrevista
    )

  dataSecagem.setDate(
    dataSecagem.getDate() -
    60
  )

  const secagemPrevista =
    dataSecagem
      .toISOString()
      .slice(0, 10)

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
          touro,

        expected_calving:
          partoPrevisto,

        expected_dry_off:
          secagemPrevista
      })

  if (error) {

    alert(
      'Erro ao guardar a inseminação: ' +
      error.message
    )

    return
  }

  alert(
    '✅ Inseminação registada com sucesso.'
  )

  await carregarDados()
}


/* =========================
   CLIQUES
========================= */

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
      action === 'forgot-password'
    ) {

      await forgotPassword()

      return
    }


    if (
      action === 'update-password'
    ) {

      await updatePassword()

      return
    }


    if (
      action === 'confirmar-2fa'
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
      action === 'animais'
    ) {

      animais()

      return
    }


    if (
      action === 'alertas'
    ) {

      alertas()

      return
    }


    if (
      action === 'producao'
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
      action === 'reproducao'
    ) {

      reproducao()

      return
    }


    if (
      action === 'detalhe'
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
      action === 'logout'
    ) {

      await supabase.auth
        .signOut()

      loginScreen(
        'Sessão terminada.'
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
      action === 'secagem'
    ) {

      await registarSecagem(
        elemento.dataset.id
      )

      return
    }


    if (
      action === 'parto'
    ) {

      await registarParto(
        elemento.dataset.id
      )

      return
    }


    if (
      action === 'inseminacao'
    ) {

      await registarIA(
        elemento.dataset.id
      )

      return
    }
  }
)


/* =========================
   AUTENTICAÇÃO
========================= */

supabase.auth.onAuthStateChange(
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


/* =========================
   ARRANQUE
========================= */

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

  const linkRecuperacao =
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
    linkRecuperacao &&
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