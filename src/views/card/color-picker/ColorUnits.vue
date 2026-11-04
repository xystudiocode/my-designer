<script setup lang="ts">
/**
 * 颜色选择器右侧的单位颜色列表。
 *
 * 8 种格式（RGB / HEX / HSL / HWB / LAB / OKLCH / CMYK / YCbCr）的取值卡片，
 * 点击卡片或右侧复制按钮复制对应文本，并通过 CopyIcon 播放「复制 → 对勾」动画。
 * 「显示颜色」结果卡片已拆到 DisplayColor.vue，由页面负责摆放。
 */
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from '@/i18n'
import {
  formatColorEntries,
  type ColorFormat,
  type FormattedColorEntry,
  type RgbColor,
} from './color'
import CopyIcon from './CopyIcon.vue'
import { copyText } from './clipboard'

const props = defineProps<{
  rgb: RgbColor
  alpha: number
}>()

const { t } = useI18n()

/** 复制成功后图标恢复的延迟（ms） */
const COPY_RESET_DELAY = 2000

const entries = computed(() => formatColorEntries(props.rgb, props.alpha))

/** 复制成功后的读屏播报（视觉上隐藏） */
const copiedAnnouncement = computed(() =>
  copiedFormats.value.size > 0 ? t('colorPicker.copied') : '',
)

/** 当前处于「已复制」状态的格式行；每行独立计时，互不影响 */
const copiedFormats = ref(new Set<ColorFormat>())
const resetTimers = new Map<ColorFormat, ReturnType<typeof setTimeout>>()

/** 标记某行复制成功，并重置该行自己的 2s 计时器 */
function markCopied(format: ColorFormat) {
  const pending = resetTimers.get(format)
  if (pending !== undefined) clearTimeout(pending)

  copiedFormats.value.add(format)
  resetTimers.set(
    format,
    setTimeout(() => {
      resetTimers.delete(format)
      copiedFormats.value.delete(format)
    }, COPY_RESET_DELAY),
  )
}

/** 复制某个格式的文本；复制失败（如权限受限）时不播放成功动画 */
async function handleCopy(entry: FormattedColorEntry) {
  const copied = await copyText(entry.value)
  if (copied) markCopied(entry.format)
}

onBeforeUnmount(() => {
  for (const timer of resetTimers.values()) clearTimeout(timer)
  resetTimers.clear()
})
</script>

<template>
  <div class="flex w-full min-w-0 flex-col">
    <div class="rounded-[4px] bg-slate-100 p-4">
      <div class="flex flex-col gap-3">
        <div v-for="entry in entries" :key="entry.format">
          <div class="mb-1.5 text-sm leading-5 text-slate-700">{{ entry.label }}</div>
          <div
            role="button"
            tabindex="0"
            class="flex cursor-pointer select-none items-center justify-between gap-2 rounded-[4px] bg-slate-200 p-3 transition-colors hover:bg-slate-300 active:bg-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-60"
            :aria-label="`${t('colorPicker.copy')} ${entry.label}`"
            @click="handleCopy(entry)"
            @keydown.enter.prevent="handleCopy(entry)"
            @keydown.space.prevent="handleCopy(entry)"
          >
            <span class="min-w-0 break-words text-xs leading-[1.4] text-slate-700">
              {{ entry.value }}
            </span>
            <button
              type="button"
              class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center bg-transparent text-zinc-800"
              :aria-label="
                copiedFormats.has(entry.format)
                  ? t('colorPicker.copied')
                  : `${t('colorPicker.copy')} ${entry.label}`
              "
              @click.stop="handleCopy(entry)"
            >
              <CopyIcon :copied="copiedFormats.has(entry.format)" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <span class="sr-only" role="status" aria-live="polite">{{ copiedAnnouncement }}</span>
  </div>
</template>
