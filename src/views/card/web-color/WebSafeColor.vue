<script setup lang="ts">
/**
 * 网页安全色卡片区：只负责把父级筛选后的 216 个颜色渲染成 CardGrid + ColorCard。
 * R / G / B 筛选逻辑在 colorSearch.ts，页面（web-color.vue）计算后传入。
 */
import CardGrid from '@/components/CardGrid.vue'
import type { WebSafeColorItem } from './types'
import ColorCard from './ColorCard.vue'

defineProps<{
  /** 已经完成 R / G / B 筛选的网页安全色 */
  items: WebSafeColorItem[]
}>()
</script>

<template>
  <CardGrid :items="items">
    <template #item="{ item, origin }">
      <ColorCard :rgb="item.rgb" :origin="origin" />
    </template>
  </CardGrid>
</template>
