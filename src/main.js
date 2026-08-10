import './style.css'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  'https://oegbnvwwrudnskycgbdl.supabase.co'

const SUPABASE_KEY =
  'sb_publishable_b86gGWtrtFM2MVhU_-h10g_5vttckRp'

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

let voltarDetalhe =
  'animais'

let recoveryMode =
  false


/* =========================
   DATAS
========================= */

function formatDate(data) {

  if (!data) {
    return '—'
  }

  const [ano, mes, dia] =
    data.split('-')

  return `${dia}/${mes}/${ano}`
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
   RECUPERAR PALAVRA-PASSE
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

        <p>
          Introduza a nova palavra-passe
          que pretende utilizar.
        </p>

        <input
          id="newPassword"
          class="search"
          type="password"
          placeholder="Nova palavra-passe"
          autocomplete="new-password"
        >

        <input
          id="confirmPassword"
          class="search"
          type="password"
          placeholder="Confirmar palavra-passe"
          autocomplete="new-password"
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

  window.history
    .replaceState(
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
   DADOS DO SUPABASE
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

        /*
          Se já houve uma secagem
          depois da IA, deixa de aparecer
          como secagem pendente.
        */

        if (
          ultimaSecagem &&
          ultimaIA &&
          ultimaSecagem.event_date >=
            ultimaIA.event_date
        ) {

          secagemPrevista =
            null
        }

        /*
          Se já houve parto
          depois da IA, deixa de aparecer
          parto/secagem dessa gestação.
        */

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
            animal.breed ||
            '—',

          status:
            animal.status ||
            '—',

          ia:
            ultimaIA
              ?.event_date ||
            null,

          touro:
            ultimaIA
              ?.bull ||
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

          notas:
            animal.notes ||
            ''
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


/* =========================
   INÍCIO
========================= */

function inicio() {

  const eventos =
    obterAlertas()

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

        <p>
          Registo e acompanhamento
          da produção de leite.
        </p>

      </section>


      <section class="card">

        <h2>
          📅 Reprodução
        </h2>

        <p>
          Inseminações, diagnósticos,
          secagens e partos.
        </p>

      </section>


      <section class="card">

        <h2>
          🔐 Conta
        </h2>

        <p>
          Sessão protegida.
        </p>

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
   LISTA DE ALERTAS
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
                    🐄 ${evento.vaca.id}
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
        placeholder="Pesquisar vaca, touro ou raça…"
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
    texto
      .toLowerCase()
      .trim()

  const resultado =
    cows.filter(
      vaca =>
        `${vaca.id} ${vaca.touro} ${vaca.raca}`
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

  app.innerHTML = `
    <main class="app">

      <button
        class="back"
        data-action="voltar-detalhe"
      >
        ← Voltar
      </button>

      <section
        class="card hero"
      >

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


      <section
        class="card details"
      >

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
            Raça
          </span>

          <strong>
            ${vaca.raca}
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

    </main>
  `
}


/* =========================
   REGISTAR SECAGEM
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

  const dataHoje =
    new Date()
      .toISOString()
      .slice(0, 10)

  const dataSecagem =
    prompt(
      'Data da secagem (AAAA-MM-DD):',
      dataHoje
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
   REGISTAR PARTO
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

  const dataHoje =
    new Date()
      .toISOString()
      .slice(0, 10)

  const dataParto =
    prompt(
      'Data do parto (AAAA-MM-DD):',
      dataHoje
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

  const {
    error:
      animalUpdateError
  } =
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

  if (animalUpdateError) {

    alert(
      'Parto guardado, mas houve erro ao atualizar a vaca: ' +
      animalUpdateError.message
    )

    return
  }

  alert(
    '🐄 Parto registado com sucesso.'
  )

  await carregarDados()
}


/* =========================
   NOVA INSEMINAÇÃO
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

  const dataHoje =
    new Date()
      .toISOString()
      .slice(0, 10)

  const dataIA =
    prompt(
      'Data da inseminação (AAAA-MM-DD):',
      dataHoje
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
      'animais'
    ) {

      animais()

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

      voltarDetalhe ===
      'alertas'

        ? alertas()

        : animais()

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


    if (
      action ===
      'tentar-novamente'
    ) {

      await carregarDados()

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
      'inseminacao'
    ) {

      await registarIA(
        elemento.dataset.id
      )

      return
    }
  }
)


/* =========================
   EVENTOS DE AUTENTICAÇÃO
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

      /*
        O arranque normal trata
        da abertura da aplicação.
        Não é necessário duplicar
        carregarDados aqui.
      */

      return
    }
  }
)


/* =========================
   ARRANQUE
========================= */

async function arrancar() {

  /*
    Links antigos do Supabase podem
    trazer type=recovery no URL.
  */

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