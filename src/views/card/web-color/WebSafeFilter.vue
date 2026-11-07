<script setup lang="ts">
/**
 * 网页安全色的 RGB 筛选工具（网页安全色模式使用）。
 *
 * 三个通道各有一个下拉：R / G / B，选项为「任意」或网页安全色六档
 * （00 / 33 / 66 / 99 / cc / ff），三个通道同时生效；
 * 右侧「重置筛选」按钮在没有任何筛选条件时禁用。
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import SelectMenu from '@/views/card/color-picker/SelectMenu.vue'
import {
  WEB_SAFE_LEVELS,
  defaultWebSafeFilter,
  isWebSafeFilterActive,
  isWebSafeFilterValue,
  type WebSafeRgbFilter,
} from './colorSearch'

type ChannelKey = 'r' | 'g' | 'b'

/** 三个通道：R / G / B 是通道符号，不做翻译 */
const CHANNELS: ReadonlyArray<{ key: ChannelKey; label: string }> = [
  { key: 'r', label: 'R' },
  { key: 'g', label: 'G' },
  { key: 'b', label: 'B' },
]

const props = defineProps<{
  modelValue: WebSafeRgbFilter
}>()

const emit = defineEmits<{
  'update:modelValue': [value: WebSafeRgbFilter]
}>()

const { t } = useI18n()

/** 下拉选项：「任意」+ 六档网页安全色（显示小写，与 HEX 数据一致） */
const options = computed<{ value: string; label: string }[]>(() => [
  { value: 'any', label: t('webColor.filterAny') },
  ...WEB_SAFE_LEVELS.map((level) => ({ value: level, label: level })),
])

const isActive = computed(() => isWebSafeFilterActive(props.modelValue))

function updateChannel(key: ChannelKey, value: string) {
  if (!isWebSafeFilterValue(value)) return
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function reset() {
  if (!isActive.value) return
  emit('update:modelValue', defaultWebSafeFilter())
}
</script>

<template>
  <div class="web-safe-filter" role="group" :aria-label="t('webColor.filterLabel')">
    <span class="web-safe-filter__label" aria-hidden="true">{{ t('webColor.filterLabel') }}</span>

    <div v-for="channel in CHANNELS" :key="channel.key" class="web-safe-filter__channel">
      <span class="web-safe-filter__channel-label" aria-hidden="true">{{ channel.label }}</span>
      <div class="web-safe-filter__select">
        <SelectMenu
          :model-value="modelValue[channel.key]"
          :options="options"
          :label="`${t('webColor.filterLabel')} ${channel.label}`"
          @update:model-value="updateChannel(channel.key, $event)"
        />
      </div>
    </div>

    <button type="button" class="web-safe-filter__reset" :disabled="!isActive" @click="reset">
      {{ t('webColor.resetFilter') }}
    </button>
  </div>
</template>

<style scoped>
.web-safe-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.web-safe-filter__label {
  flex: none;
  color: #334155;
  font-size: 14px;
  line-height: 1.4;
}

.web-safe-filter__channel {
  display: flex;
  align-items: center;
  gap: 4px;
}

.web-safe-filter__channel-label {
  flex: none;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.web-safe-filter__select {
  width: 88px;
}

/* 重置按钮：白底描边，禁用时弱化（没有筛选条件可重置） */
.web-safe-filter__reset {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #334155;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.web-safe-filter__reset:hover:not(:disabled) {
  border-color: #cbd5e1;
  background-color: #f8fafc;
  color: #0f172a;
}

.web-safe-filter__reset:active:not(:disabled) {
  background-color: #f1f5f9;
}

.web-safe-filter__reset:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

.web-safe-filter__reset:disabled {
  border-color: #e2e8f0;
  background-color: #f8fafc;
  color: #94a3b8;
  cursor: default;
}

@media (prefers-reduced-motion: reduce) {
  .web-safe-filter__reset {
    transition-duration: 0.001ms;
  }
}
</style>
