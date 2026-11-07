<script setup lang="ts">
/**
 * CSS 命名色卡片区：只负责把父级筛选后的数据渲染成 CardGrid + ColorCard。
 * 去重 / 搜索 / 中英文名称索引都在页面（web-color.vue）里完成，这里不再重复。
 */
import CardGrid from '@/components/CardGrid.vue'
import type { CssColorItem } from './types'
import ColorCard from './ColorCard.vue'

defineProps<{
  /** 已经完成去重与搜索过滤的 CSS 命名色 */
  items: CssColorItem[]
}>()
</script>

<template>
  <CardGrid :items="items">
    <template #item="{ item, origin }">
      <ColorCard
        :rgb="item.rgb"
        :alpha="item.alpha"
        :shorthand="item.shorthand"
        :name="item.name"
        :mode="item.mode"
        :transparent="item.transparent"
        :origin="origin"
      />
    </template>
  </CardGrid>
</template>
