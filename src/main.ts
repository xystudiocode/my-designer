import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// Element Plus 组件与样式由 unplugin-vue-components / unplugin-auto-import 按需引入，
// 语言（locale）由 App.vue 的 <el-config-provider> 提供，因此这里不再全量注册。
app.use(createPinia())
app.use(router)

app.mount('#app')
