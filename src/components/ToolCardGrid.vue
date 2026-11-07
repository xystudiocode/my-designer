<!-- ToolCardGrid.vue（可选：保留旧 API） -->
<script setup lang="ts">
import CardGrid from './CardGrid.vue'
import ToolCard from './ToolCard.vue'
import type { ToolCardData } from '@/data/tools'

defineProps<{ cards: ToolCardData[] }>()
const emit = defineEmits<{ (e: 'preview', payload: { card: ToolCardData; index: number }): void }>()
</script>

<template>
  <CardGrid :items="cards">
    <template #item="{ item, origin }">
      <ToolCard
        :card="item"
        :origin="origin"
        @preview="(index) => emit('preview', { card: item, index })"
      />
    </template>
  </CardGrid>
</template>
