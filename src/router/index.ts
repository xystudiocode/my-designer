import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/card/color-picker',
      name: 'card-color-picker',
      // 工具页按需懒加载；卡片定义里的 to 指向该路径（见 src/data/tools.ts）
      component: () => import('../views/card/color-picker.vue'),
    },
    {
      path: '/card/web-color',
      name: 'web-color',
      component: () => import('../views/card/web-color.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue'),
    },
  ],
})

export default router
