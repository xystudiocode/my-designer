<script setup lang="ts">
/**
 * 网页颜色页的胶囊搜索框（CSS 命名色模式使用）。
 *
 * - 受控组件：v-model 绑定搜索词；
 * - 无障碍：视觉隐藏的 label 关联输入框，输入框带 role="searchbox"；
 * - 有内容时右侧显示「清空搜索」按钮，Esc 也可清空，清空后焦点留在输入框里。
 */
import { ref, useId } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useI18n()

/** 输入框 id：与视觉隐藏的 label 关联（每个实例唯一） */
const inputId = `web-color-search-${useId()}`
const inputEl = ref<HTMLInputElement | null>(null)

function onInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  emit('update:modelValue', target?.value ?? '')
}

/** 清空搜索词并保持焦点在输入框，方便继续输入 */
function clear() {
  emit('update:modelValue', '')
  inputEl.value?.focus()
}
</script>

<template>
  <div class="search-box">
    <label class="sr-only" :for="inputId">{{ t('webColor.searchLabel') }}</label>
    <svg class="search-box__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <input
      :id="inputId"
      ref="inputEl"
      class="search-box__input"
      type="text"
      role="searchbox"
      autocomplete="off"
      spellcheck="false"
      :value="props.modelValue"
      :placeholder="t('webColor.searchPlaceholder')"
      @input="onInput"
      @keydown.esc="clear"
    />
    <button
      v-if="props.modelValue"
      type="button"
      class="search-box__clear"
      :aria-label="t('webColor.clearSearch')"
      :title="t('webColor.clearSearch')"
      @click="clear"
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="m4.5 4.5 7 7M11.5 4.5l-7 7"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px;
  border: 1px solid #e2e8f0;
  border-radius: 9999px;
  background-color: #fff;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.search-box:focus-within {
  border-color: var(--color-accent-60);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent-60) 30%, transparent);
}

.search-box__icon {
  width: 16px;
  height: 16px;
  flex: none;
  color: var(--color-slate-400);
}

.search-box__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background-color: transparent;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.4;
  outline: none;
}

.search-box__input::placeholder {
  color: #94a3b8;
}

/* 清空按钮：圆形小按钮，键盘聚焦时有清晰轮廓 */
.search-box__clear {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 9999px;
  background-color: transparent;
  color: #64748b;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.search-box__clear svg {
  width: 14px;
  height: 14px;
}

.search-box__clear:hover {
  background-color: #f1f5f9;
  color: #334155;
}

.search-box__clear:active {
  background-color: #e2e8f0;
}

.search-box__clear:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .search-box,
  .search-box__clear {
    transition-duration: 0.001ms;
  }
}
</style>
