import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Injects the Content-Security-Policy meta tag.
 * Build: strict `script-src 'self'`.
 * Dev server: also allows the inline React Refresh preamble and the HMR websocket.
 */
function cspPlugin(): Plugin {
  let isDev = false
  return {
    name: 'motionforge-csp',
    configResolved(config) {
      isDev = config.command === 'serve'
    },
    transformIndexHtml() {
      const script = isDev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'"
      const connect = isDev ? "connect-src 'self' ws://localhost:*" : "connect-src 'self'"
      const content = [
        "default-src 'self'",
        script,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        connect
      ].join('; ')
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content },
          injectTo: 'head-prepend'
        }
      ]
    }
  }
}

// Folder layout follows spec section 4:
// electron/ = main + preload, src/ = React renderer.
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { main: resolve(__dirname, 'electron/main.ts') }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: { preload: resolve(__dirname, 'electron/preload.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html')
      }
    },
    plugins: [cspPlugin(), react(), tailwindcss()]
  }
})
