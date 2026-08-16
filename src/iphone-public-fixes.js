import './delete-cow.js'
import './animal-sort.js'

const STYLE_ID = 'iphone-public-fixes-style'

function ensureIphoneSafeArea() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .app { padding-top: calc(24px + env(safe-area-inset-top)); padding-bottom: calc(140px + env(safe-area-inset-bottom)); overflow-x: hidden; }
    body.com-bottom-nav { padding-bottom: calc(110px + env(safe-area-inset-bottom)); }
    .bottom-nav { bottom: calc(10px + env(safe-area-inset-bottom)); }
    body.auth-flow-screen .bottom-nav { display: none !important; }
    body.auth-flow-screen.com-bottom-nav { padding-bottom: 0; }
    .stats-grid,.filters,.filter-row,.tabs { max-width: 100%; }
    @media (max-width: 480px) {
      .app { padding-left: 14px; padding-right: 14px; }
      h1 { font-size: 34px; overflow-wrap: anywhere; }
      .filters,.filter-row,.tabs { overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; padding-bottom:4px; }
      .filters::-webkit-scrollbar,.filter-row::-webkit-scrollbar,.tabs::-webkit-scrollbar { display:none; }
      .filters > *,.filter-row > *,.tabs > * { flex:0 0 auto; }
    }
  `
  document.head.appendChild(style)
}
function syncAuthFlowScreen() {
  const authInput=document.querySelector('#email, #password, #newPassword, #confirmPassword, #codigo2fa')
  const title=document.querySelector('main.app h1, main.app h2')?.textContent||''
  const checkingSecurity=title.includes('verificar segurança')||title.includes('A verificar segurança')
  document.body.classList.toggle('auth-flow-screen',Boolean(authInput||checkingSecurity))
}
ensureIphoneSafeArea();syncAuthFlowScreen()
let authSyncQueued=false
new MutationObserver(()=>{if(authSyncQueued)return;authSyncQueued=true;queueMicrotask(()=>{authSyncQueued=false;syncAuthFlowScreen()})}).observe(document.body,{childList:true,subtree:true})
