<script setup lang="ts">
import { computed, ref } from 'vue'
import PreviewLightbox from '@/components/PreviewLightbox.vue'
import ToolCardGrid from '@/components/ToolCardGrid.vue'
import { toolCardDefinitions, type ToolCardData } from '@/data/tools'
import { useI18n } from '@/i18n'

const { t } = useI18n()

/** 运行时卡片数据：{ title, desc, icon, previews } */
const cards = computed<ToolCardData[]>(() =>
  toolCardDefinitions.map((card) => ({
    title: t(card.titleKey),
    desc: t(card.descKey),
    icon: card.icon,
    previews: card.previews,
  })),
)

const lightboxOpen = ref(false)
const lightboxTitle = ref('')
const lightboxImages = ref<string[]>([])
const lightboxIndex = ref(0)

function openPreview(card: ToolCardData, index: number) {
  lightboxTitle.value = card.title
  lightboxImages.value = card.previews
  lightboxIndex.value = index
  lightboxOpen.value = true
}

function closePreview() {
  lightboxOpen.value = false
}

function updatePreviewIndex(index: number) {
  lightboxIndex.value = index
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] px-6 py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight text-slate-900">{{ t('home.listTitle') }}</h1>
      <p class="mt-3 text-lg text-slate-500">{{ t('home.listSubtitle') }}</p>
    </div>

    <!-- Warp 卡片列表：悬浮展开图片预览，点击预览查看大图；暂无卡片时只显示上方标题与描述 -->
    <ToolCardGrid
      v-if="cards.length > 0"
      :cards="cards"
      @preview="({ card, index }) => openPreview(card, index)"
    />

    <PreviewLightbox
      :open="lightboxOpen"
      :title="lightboxTitle"
      :images="lightboxImages"
      :index="lightboxIndex"
      @close="closePreview"
      @update:index="updatePreviewIndex"
    />
  </div>
</template>
