import './style.css'

const cows = [
  ["6358","02/08/2025","SUITOR","Frísia","12/05/2026","13/03/2026"],
  ["3546","15/08/2025","OLCROSS","Limousine","25/05/2026","26/03/2026"],
  ["6359","17/09/2025","BOERO","Frísia","27/06/2026","28/04/2026"],
  ["434499700","20/09/2025","RED ZAMARI","Aberdeen Angus","30/06/2026","01/05/2026"],
  ["633206810","23/09/2025","RED ZAMARI","Aberdeen Angus","03/07/2026","04/05/2026"],
  ["4444","18/10/2025","QUINTA B27","Beefmaster","28/07/2026","29/05/2026"],
  ["8662","08/11/2025","IMPERIAL","Aberdeen Angus","18/08/2026","19/06/2026"],
  ["3204","14/12/2025","IMPERIAL","Aberdeen Angus","23/09/2026","25/07/2026"],
  ["5803","28/12/2025","REAPER","Frísia","07/10/2026","08/08/2026"],
  ["8660","05/01/2026","HARQUE","Frísia","15/10/2026","16/08/2026"],
  ["1314","26/01/2026","GLORY ROAD","Aberdeen Angus","05/11/2026","06/09/2026"],
  ["9980","18/02/2026","GLORY ROAD","Aberdeen Angus","28/11/2026","29/09/2026"],
  ["7713","28/02/2026","ABSOLUTE RED","Aberdeen Angus","08/12/2026","09/10/2026"],
  ["3550","05/03/2026","REAPER","Frísia","13/12/2026","14/10/2026"],
  ["633199112","22/03/2026","SKYDIVER","Frísia","30/12/2026","31/10/2026"],
  ["6811","07/04/2026","HOLY P","Frísia","15/01/2027","16/11/2026"],
  ["3865","10/04/2026","JULIUS","Jersey","18/01/2027","19/11/2026"],
  ["4689","13/04/2026","HOA P","Frísia","21/01/2027","22/11/2026"],
  ["3233","13/04/2026","VALENTINO","Frísia","21/01/2027","22/11/2026"],
  ["AIROLO","18/04/2026","ILUSION","Aberdeen Angus","26/01/2027","27/11/2026"],
  ["3226","18/04/2026","ILUSION","Aberdeen Angus","26/01/2027","27/11/2026"],
  ["433144281","02/05/2026","KERSH","Frísia","09/02/2027","11/12/2026"],
  ["633744688","04/05/2026","ILUSION","Aberdeen Angus","11/02/2027","13/12/2026"],
  ["6356","07/05/2026","ABSOLUTE RED","Aberdeen Angus","14/02/2027","16/12/2026"],
  ["9975","12/05/2026","BOSTON RED","Aberdeen Angus","19/02/2027","21/12/2026"],
  ["334629211","14/05/2026","ILUSION","Aberdeen Angus","21/02/2027","23/12/2026"],
  ["3868","15/05/2026","ODEM","Frísia","22/02/2027","24/12/2026"],
  ["134629212","29/05/2026","ILUSION","Aberdeen Angus","08/03/2027","07/01/2027"],
  ["3544","05/06/2026","BOSTON RED","Aberdeen Angus","15/03/2027","14/01/2027"],
  ["6445","15/06/2026","KAREEM","Frísia","25/03/2027","24/01/2027"],
  ["633144280","26/06/2026","VALENTINO","Frísia","05/04/2027","04/02/2027"],
  ["5800","05/07/2026","ILUSION","Aberdeen Angus","14/04/2027","13/02/2027"]
].map(v => ({
  id: v[0],
  ia: v[1],
  touro: v[2],
  raca: v[3],
  parto: v[4],
  secagem: v[5]
}))

const app = document.querySelector('#app')

let voltarDetalhe = 'animais'

function ptDate(data) {
  const [d, m, y] = data.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
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
  return Math.round(
    (ptDate(data).getTime() - hoje().getTime()) / 86400000
  )
}

function textoDias(dias) {
  if (dias < 0) return `${Math.abs(dias)} dias atrasado`
  if (dias === 0) return 'HOJE'
  if (dias === 1) return 'AMANHÃ'
  return `em ${dias} dias`
}

function obterAlertas() {
  const eventos = []

  cows.forEach(vaca => {
    const diasSecagem = diasAte(vaca.secagem)
    const diasParto = diasAte(vaca.parto)

    if (diasSecagem >= -7 && diasSecagem <= 30) {
      eventos.push({
        tipo: 'Secagem',
        icon: '🟠',
        data: vaca.secagem,
        dias: diasSecagem,
        vaca
      })
    }

    if (diasParto >= -7 && diasParto <= 30) {
      eventos.push({
        tipo: 'Parto',
        icon: '🔵',
        data: vaca.parto,
        dias: diasParto,
        vaca
      })
    }
  })

  return eventos.sort((a, b) => a.dias - b.dias)
}

function inicio() {
  const eventos = obterAlertas()

  app.innerHTML = `
    <main class="app">
      <h1>🐄 Lavoura+</h1>
      <p class="subtitle">Gestão da Exploração</p>

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

        <p>
          Gestão do efetivo e informação reprodutiva.
        </p>

        <button data-action="animais">
          Ver animais
        </button>
      </section>

      <section class="card">
        <h2>🥛 Produção</h2>
        <p>
          Registo e acompanhamento da produção de leite.
        </p>
      </section>

      <section class="card">
        <h2>📅 Reprodução</h2>
        <p>
          Inseminações, diagnósticos, secagens e partos.
        </p>
      </section>
    </main>
  `
}

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

      <div>

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
                    ${evento.data}
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
                <strong>
                  ✅ Sem alertas para os próximos 30 dias.
                </strong>
              </section>
            `
        }

      </div>

    </main>
  `
}

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
        placeholder="Pesquisar número, touro ou raça…"
      >

      <div id="lista"></div>

    </main>
  `

  listar('')

  const pesquisa =
    document.querySelector('#pesquisa')

  pesquisa.addEventListener('input', e => {
    listar(e.target.value)
  })
}

function listar(texto) {
  const lista =
    document.querySelector('#lista')

  const q =
    texto.toLowerCase().trim()

  const resultado =
    cows.filter(vaca => {

      const textoVaca = `
        ${vaca.id}
        ${vaca.touro}
        ${vaca.raca}
      `.toLowerCase()

      return textoVaca.includes(q)
    })

  lista.innerHTML =
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

          <strong>
            Parto
          </strong>

          <div>
            ${vaca.parto}
          </div>

        </div>

      </section>

    `).join('')
}

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
          <strong>${vaca.ia}</strong>
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
          <strong>${vaca.parto}</strong>
        </div>

        <div>
          <span>Secagem</span>
          <strong>${vaca.secagem}</strong>
        </div>

      </section>

    </main>
  `
}

/* CONTROLO CENTRAL DOS CLIQUES */

app.addEventListener('click', event => {

  const elemento =
    event.target.closest('[data-action]')

  if (!elemento) return

  const action =
    elemento.dataset.action

  if (action === 'inicio') {
    inicio()
    return
  }

  if (action === 'animais') {
    animais()
    return
  }

  if (action === 'alertas') {
    alertas()
    return
  }

  if (action === 'detalhe') {

    detalhe(
      elemento.dataset.id,
      elemento.dataset.voltar
    )

    return
  }

  if (action === 'voltar-detalhe') {

    if (voltarDetalhe === 'alertas') {
      alertas()
    } else {
      animais()
    }
  }
})

inicio()
