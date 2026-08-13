const STYLE_ID = 'iphone-public-fixes-style'

function ensureIphoneSafeArea() {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .app {
      padding-top: calc(24px + env(safe-area-inset-top));
      padding-bottom: calc(140px + env(safe-area-inset-bottom));
      overflow-x: hidden;
    }

    body.com-bottom-nav {
      padding-bottom: calc(110px + env(safe-area-inset-bottom));
    }

    .bottom-nav {
      bottom: calc(10px + env(safe-area-inset-bottom));
    }

    .stats-grid,
    .filters,
    .filter-row,
    .tabs {
      max-width: 100%;
    }

    @media (max-width: 480px) {
      .app {
        padding-left: 14px;
        padding-right: 14px;
      }

      h1 {
        font-size: 34px;
        overflow-wrap: anywhere;
      }

      .filters,
      .filter-row,
      .tabs {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
        padding-bottom: 4px;
      }

      .filters::-webkit-scrollbar,
      .filter-row::-webkit-scrollbar,
      .tabs::-webkit-scrollbar {
        display: none;
      }

      .filters > *,
      .filter-row > *,
      .tabs > * {
        flex: 0 0 auto;
      }
    }
  `
  document.head.appendChild(style)
}

ensureIphoneSafeArea()
