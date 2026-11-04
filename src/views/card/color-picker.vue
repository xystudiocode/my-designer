<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import {
  COLOR_MODES,
  FORMAT_LABELS,
  clamp,
  normalizeRgb,
  type ColorFormat,
  type RgbColor,
} from './color-picker/color'
import SelectMenu from './color-picker/SelectMenu.vue'
import RgbEditor from './color-picker/RgbEditor.vue'
import HslEditor from './color-picker/HslEditor.vue'
import ColorUnits from './color-picker/ColorUnits.vue'
import ColorAssistant from './color-picker/ColorAssistant.vue'
import DisplayColor from './color-picker/DisplayColor.vue'

const { t } = useI18n()

/** 选择模式：目前只有 RGB / HSL 有编辑器，其它格式先留空 */
const mode = ref<ColorFormat>('rgb')

/** 当前颜色（sRGB 0-255）与不透明度（0-100） */
const rgb = ref<RgbColor>({ r: 59, g: 130, b: 246 })
const alpha = ref(100)

const modeOptions = computed(() =>
  COLOR_MODES.map((value) => ({ value, label: FORMAT_LABELS[value] })),
)

function selectMode(value: string) {
  mode.value = value as ColorFormat
}

function updateRgb(next: RgbColor) {
  rgb.value = normalizeRgb(next)
}

function updateAlpha(next: number) {
  alpha.value = Math.round(clamp(next, 0, 100))
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1440px] px-6 py-10">
    <h1 class="text-3xl font-bold tracking-tight text-slate-900">{{ t('colorPicker.title') }}</h1>

    <div class="picker-layout">
      <div class="picker-layout__main">
        <div class="picker-mode">
          <span class="picker-mode__label">{{ t('colorPicker.mode') }}</span>
          <div class="picker-mode__select">
            <SelectMenu
              :model-value="mode"
              :options="modeOptions"
              :label="t('colorPicker.mode')"
              @update:model-value="selectMode"
            />
          </div>
        </div>

        <div class="picker-editor">
          <RgbEditor
            v-if="mode === 'rgb'"
            :rgb="rgb"
            :alpha="alpha"
            @update:rgb="updateRgb"
            @update:alpha="updateAlpha"
          />
          <HslEditor
            v-else-if="mode === 'hsl'"
            :rgb="rgb"
            :alpha="alpha"
            @update:rgb="updateRgb"
            @update:alpha="updateAlpha"
          />
          <p v-else class="picker-editor__placeholder">
            {{ t('colorPicker.unsupportedMode') }}
          </p>
        </div>

        <ColorAssistant class="picker-assistant" :rgb="rgb" :alpha="alpha" />
      </div>

      <aside class="picker-layout__side">
        <section class="picker-units">
          <h2 class="picker-section-title">{{ t('colorPicker.colorConversion') }}</h2>
          <ColorUnits :rgb="rgb" :alpha="alpha" />
        </section>

        <section class="picker-display">
          <h2 class="picker-section-title">{{ t('colorPicker.selectColor') }}</h2>
          <DisplayColor :rgb="rgb" :alpha="alpha" />
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.picker-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  margin-top: 24px;
}

/* 左列：模式选择 / 颜色选择器 / 配色助手；右列：颜色转换 / 选择颜色 */
.picker-layout__main {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.picker-layout__side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.picker-mode {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picker-mode__label {
  flex: none;
  color: #334155;
  font-size: 14px;
}

.picker-mode__select {
  width: 180px;
}

.picker-editor {
  min-height: 220px;
}

.picker-editor__placeholder {
  margin: 0;
  padding: 64px 24px;
  border-radius: 8px;
  background-color: #f1f5f9;
  color: #64748b;
  font-size: 14px;
  text-align: center;
}

.picker-units,
.picker-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.picker-section-title {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

/*
 * 窄屏（平板 / 手机）单列展示，顺序为：
 * 选择框 → 颜色选择器 → 选择颜色 → 颜色转换 → 配色助手。
 * 这里把两个列容器设为 display: contents，让 5 个区块成为同级 flex item 后用 order 排序。
 */
@media (max-width: 1100px) {
  .picker-layout {
    display: flex;
    flex-direction: column;
    /* 宽屏 grid 的 align-items: start 在 flex 列布局里会把子项收成内容宽度，
       这里必须恢复 stretch，否则颜色转换面板 / RGB 滑块轨道都会只剩很窄一条 */
    align-items: stretch;
    gap: 24px;
  }

  .picker-layout__main,
  .picker-layout__side {
    display: contents;
  }

  .picker-mode {
    order: 1;
  }

  .picker-editor {
    order: 2;
  }

  .picker-display {
    order: 3;
  }

  .picker-units {
    order: 4;
  }

  .picker-assistant {
    order: 5;
  }
}
</style>
