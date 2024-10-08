import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import boolAttr from './bool-attr'
import { setupGlobalFuncs } from './markdown-bridge'
import { worker } from './nostr-mocks/browser'
import { deleteStampCacheIDB } from './lib/stampCache'
import './styles/global.scss'

import('katex/dist/katex.css')

setupGlobalFuncs()

await worker.start({
  onUnhandledRequest: 'bypass'
})

const app = createApp(App)
app.use(router)
app.use(store)

app.use(boolAttr)

app.mount('#app')

if (import.meta.env.MODE === 'development') {
  app.config.performance = true
}

deleteStampCacheIDB()
