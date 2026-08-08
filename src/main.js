import './style.css'
import { createClient } from '@supabase/supabase-js'

document.querySelector('#app').innerHTML = `
  <div style="
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    max-width: 700px;
    margin: auto;
    padding: 24px;
  ">
    <h1>🐄 Lavoura+</h1>
    <p>Gestão da Exploração</p>

    <hr>

    <h2>Painel Principal</h2>

    <div style="
      padding: 20px;
      border-radius: 14px;
      background: #f3f7f2;
      margin-top: 20px;
    ">
      <h3>🐄 Vacas</h3>
      <p>Gestão do efetivo e informação reprodutiva.</p>
      <button>Ver animais</button>
    </div>

    <div style="
      padding: 20px;
      border-radius: 14px;
      background: #f3f7f2;
      margin-top: 15px;
    ">
      <h3>🥛 Produção</h3>
      <p>Registo e acompanhamento da produção de leite.</p>
    </div>

    <div style="
      padding: 20px;
      border-radius: 14px;
      background: #f3f7f2;
      margin-top: 15px;
    ">
      <h3>📅 Reprodução</h3>
      <p>Inseminações, diagnósticos, secagens e partos.</p>
    </div>
  </div>
`
