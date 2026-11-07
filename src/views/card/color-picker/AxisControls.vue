<script setup lang="ts">
/**
 * 控制坐标轴：滑块 / 横轴 / 纵轴分别对应哪个分量（仅 panel-first 模式显示）。
 *
 * - 三个下拉的选项都是当前模式的分量；
 * - 选到已被其它位置占用的分量时，与目标位置交换，保证三者始终互不相同；
 * - 「重置坐标轴」恢复默认设置。
 * 坐标轴的持久化由页面负责（本组件只 emit 新的设置）。
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import SelectMenu from './SelectMenu.vue'
import { defaultAxisSetting, modeDefinition } from './modes'
import type { AxisSetting } from './pickerState'
import type { ColorFormat } from './color'

const props = defineProps<{
  mode: ColorFormat
  setting: AxisSetting
}>()

const emit = defineEmits<{
  'update:setting': [setting: AxisSetting]
}>()

const { t } = useI18n()

type AxisPosition = 'slider' | 'x' | 'y'

const POSITIONS: readonly AxisPosition[] = ['slider', 'x', 'y']

const POSITION_LABEL_KEYS = {
  slider: 'colorPicker.axisSlider',
  x: 'colorPicker.axisX',
  y: 'colorPicker.axisY',
} as const

/** 三个下拉共用的选项：当前模式的全部分量 */
const options = computed(() =>
  modeDefinition(props.mode).channels.map((channel) => ({
    value: channel.key,
    label: t(channel.labelKey),
  })),
)

/**
 * 修改某一个位置的分量：
 * 若新分量已被其它位置占用，则让两个位置交换（避免出现重复分量）。
 */
function update(position: AxisPosition, key: string): void {
  if (props.setting[position] === key) return

  const next: AxisSetting = { ...props.setting }
  for (const other of POSITIONS) {
    if (other !== position && next[other] === key) next[other] = next[position]
  }
  next[position] = key
  emit('update:setting', next)
}

function reset(): void {
  emit('update:setting', defaultAxisSetting(props.mode))
}
</script>

<template>
  <section class="axis-controls flex flex-col gap-2">
    <h3 class="axis-controls__title">{{ t('colorPicker.axisControls') }}</h3>

    <div class="axis-controls__row flex flex-wrap items-end gap-x-4 gap-y-2">
      <div v-for="position in POSITIONS" :key="position" class="axis-controls__field">
        <span class="axis-controls__label">{{ t(POSITION_LABEL_KEYS[position]) }}</span>
        <SelectMenu
          :model-value="setting[position]"
          :options="options"
          :label="t(POSITION_LABEL_KEYS[position])"
          @update:model-value="update(position, $event)"
        />
      </div>

      <button type="button" class="axis-controls__reset" @click="reset">
        {{ t('colorPicker.resetAxes') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.axis-controls__title {
  margin: 0;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.axis-controls__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 160px;
}

.axis-controls__label {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

/* 重置按钮：白底描边，与页面其它次要按钮风格一致 */
.axis-controls__reset {
  flex: none;
  min-height: 32px;
  padding: 0 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fff;
  color: #334155;
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.axis-controls__reset:hover {
  border-color: #cbd5e1;
  background-color: #f8fafc;
  color: #0f172a;
}

.axis-controls__reset:active {
  background-color: #f1f5f9;
}

.axis-controls__reset:focus-visible {
  outline: 2px solid var(--color-accent-60);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .axis-controls__reset {
    transition-duration: 0.001ms;
  }
}
</style>
