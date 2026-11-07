<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import {
  COLOR_MODES,
  FORMAT_LABELS,
  clamp,
  normalizeRgb,
  type ColorFormat,
  type OutOfGamutInfo,
  type RgbColor,
} from './color-picker/color'
import {
  addPaletteColor,
  loadPickerSettings,
  parseColorInput,
  parsePickerQuery,
  pushHistory,
  removeHistoryColor,
  removePaletteColor,
  savePickerSettings,
  toStoredColor,
  type AxisSettings,
  type StoredColor,
} from './color-picker/pickerState'
import SelectMenu from './color-picker/SelectMenu.vue'
import ModeColorPicker from './color-picker/ModeColorPicker.vue'
import SelectColorSection from './color-picker/SelectColorSection.vue'
import ColorUnits from './color-picker/ColorUnits.vue'
import ColorAssistant from './color-picker/ColorAssistant.vue'
import ColorHistory from './color-picker/ColorHistory.vue'
import ColorPalette from './color-picker/ColorPalette.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/** 进入页面时自动加载上次保存的用户配置（颜色 / 不透明度 / 模式 / 坐标轴 / 历史记录 / 调色板） */
const initialSettings = loadPickerSettings()

/** 当前取色模式（7 种模式都由统一的 ModeColorPicker 渲染） */
const mode = ref<ColorFormat>(initialSettings.mode)

/** 当前颜色（sRGB 0-255）与不透明度（0-100） */
const rgb = ref<RgbColor>(initialSettings.rgb)
const alpha = ref(initialSettings.alpha)

/** 各模式的坐标轴设置（滑块 / 横轴 / 纵轴），由 ModeColorPicker 的「控制坐标轴」写回并持久化 */
const axes = ref<AxisSettings>(initialSettings.axes)

/**
 * 当前模式空间颜色是否超出 sRGB：仅 OKLCH 会给出信息。
 * 非 null 时「选择颜色」卡片分裂为 2~3 张（说明 / 回退 / 浏览器实际显示）。
 */
const gamut = ref<OutOfGamutInfo | null>(null)

/** 取色器实例：页面执行「回退」时需要让它放弃拖拽期间的本地值，重新由 rgb 派生 */
const editorRef = ref<{ resetToRgb: () => void } | null>(null)

/** 历史记录（最新在最前，最多 40 条）与调色板（用户手动添加，不限量） */
const history = ref<StoredColor[]>(initialSettings.history)
const palette = ref<StoredColor[]>(initialSettings.palette)

/** 历史记录保存延迟：滑块停止移动 / 点击结束后再记录，避免拖动过程刷屏 */
const HISTORY_SAVE_DELAY = 600
/** 深链接 / 自带颜色是否已应用（应用后清理 URL query，避免之后刷新又回到旧颜色） */
let hasDeepLink = false
let historyTimer: ReturnType<typeof setTimeout> | undefined
/** 首屏加载 / 深链接应用完成前不写历史记录 */
let historyReady = false

const modeOptions = computed(() =>
  COLOR_MODES.map((value) => ({ value, label: FORMAT_LABELS[value] })),
)

/** 当前完整配置快照（持久化 / 深链接写回都用它） */
function currentSettings() {
  return {
    rgb: rgb.value,
    alpha: alpha.value,
    mode: mode.value,
    axes: axes.value,
    history: history.value,
    palette: palette.value,
  }
}

function persistSettings() {
  savePickerSettings(currentSettings())
}

/**
 * 应用 URL query（深链接）：带上颜色 / 模式跳转时不自动加载本地保存的「选择颜色」，
 * 而是以 query 为准，并把这次配色写回用户配置（之后刷新仍然保留）。
 */
function applyQuery(query: Record<string, unknown>): boolean {
  const parsed = parsePickerQuery(query)
  if (!parsed.hasQuery) return false

  if (parsed.rgb) rgb.value = normalizeRgb(parsed.rgb)
  if (parsed.alpha !== null) alpha.value = parsed.alpha
  else if (parsed.rgb) alpha.value = 100
  if (parsed.mode) mode.value = parsed.mode

  // 颜色 / 模式换了，旧的色域信息立即作废（新信息等 ModeColorPicker 回调）
  gamut.value = null

  hasDeepLink = true
  persistSettings()
  return true
}

// 首次进入先处理深链接（要在两个 watch 创建之前，避免被当成用户操作写入历史记录）
applyQuery(route.query as Record<string, unknown>)

// 当前配置的任何变化都立即持久化；历史记录 / 调色板随后由用户操作更新
watch([rgb, alpha, mode, axes, history, palette], persistSettings, { deep: true })

// 颜色 / 不透明度变化 → 停止操作 600ms 后写入历史记录（滑块松手、二维色板点击、输入框提交都会触发）
watch(
  [rgb, alpha],
  () => {
    if (!historyReady) return
    if (historyTimer !== undefined) clearTimeout(historyTimer)
    historyTimer = setTimeout(() => {
      historyTimer = undefined
      history.value = pushHistory(history.value, toStoredColor(rgb.value, alpha.value))
    }, HISTORY_SAVE_DELAY)
  },
  { deep: true },
)

/** 使用历史记录 / 调色板中的颜色 */
function applyStoredColor(color: StoredColor) {
  rgb.value = { r: color.r, g: color.g, b: color.b }
  alpha.value = color.a
}

/** 采用 OKLCH 的回退颜色：颜色改为可显示的回退色，并让取色器放弃拖拽本地值（回到单卡状态） */
function applyFallbackColor(fallback: RgbColor) {
  rgb.value = normalizeRgb(fallback)
  editorRef.value?.resetToRgb()
}

function addCurrentColorToPalette() {
  palette.value = addPaletteColor(palette.value, toStoredColor(rgb.value, alpha.value))
}

/** 配色助手子菜单的「保存到调色板」：把该色块颜色加入调色板 */
function saveAssistantColorToPalette(color: StoredColor) {
  palette.value = addPaletteColor(palette.value, color)
}

function removePaletteItem(index: number) {
  palette.value = removePaletteColor(palette.value, index)
}

function removeHistoryItem(index: number) {
  history.value = removeHistoryColor(history.value, index)
}

/** EyeDropper API 的最小类型声明（DOM lib 里不一定有） */
interface EyeDropperResult {
  sRGBHex: string
}

interface EyeDropperInstance {
  open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>
}

type EyeDropperConstructor = new () => EyeDropperInstance

/** 浏览器不支持 EyeDropper 时的提示：用 Element Plus 的 ElMessage（顶部悬浮、自动消失） */
function notifyEyeDropperUnsupported() {
  ElMessage.error({
    message: t('colorPicker.eyedropperUnsupported'),
    duration: 4000,
    offset: 16,
    showClose: false,
  })
}

/** 从屏幕中选取颜色：不支持时用 ElMessage 弹出错误提示 */
async function pickColorFromScreen() {
  const EyeDropperCtor = (window as Window & { EyeDropper?: EyeDropperConstructor }).EyeDropper
  if (typeof EyeDropperCtor !== 'function') {
    notifyEyeDropperUnsupported()
    return
  }

  try {
    const result = await new EyeDropperCtor().open()
    const parsed = parseColorInput(result.sRGBHex)
    if (!parsed) return
    rgb.value = normalizeRgb(parsed.rgb)
    alpha.value = parsed.alpha ?? 100
  } catch {
    // 用户按 Esc 取消取色：静默忽略
  }
}

function selectMode(value: string) {
  mode.value = value as ColorFormat
  // 模式切换后旧色域信息立即作废，等 ModeColorPicker 按新颜色重新回调
  gamut.value = null
}

function updateRgb(next: RgbColor) {
  rgb.value = normalizeRgb(next)
}

function updateAlpha(next: number) {
  alpha.value = Math.round(clamp(next, 0, 100))
}

/** 坐标轴设置由取色器写回：整份替换后由 watch 持久化 */
function updateAxes(next: AxisSettings) {
  axes.value = next
}

/** 取色器判定当前模式空间颜色是否超出 sRGB（OKLCH 之外恒为 null） */
function updateGamut(next: OutOfGamutInfo | null) {
  gamut.value = next
}

onMounted(() => {
  historyReady = true
  // 深链接应用后清理 query：之后刷新 / 前进后退不会再把旧配色读回来
  if (hasDeepLink) void router.replace({ path: route.path, query: {} })
})

// 页面已打开时再次通过 URL 跳转（同一路由、不同 query）：同样应用并清理
watch(
  () => route.query,
  (query) => {
    if (applyQuery(query as Record<string, unknown>)) {
      void router.replace({ path: route.path, query: {} })
    }
  },
)

onBeforeUnmount(() => {
  if (historyTimer !== undefined) clearTimeout(historyTimer)
})
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
          <ModeColorPicker
            ref="editorRef"
            :mode="mode"
            :rgb="rgb"
            :alpha="alpha"
            :axes="axes"
            @update:rgb="updateRgb"
            @update:alpha="updateAlpha"
            @update:axes="updateAxes"
            @update:gamut="updateGamut"
          />
        </div>

        <ColorAssistant
          class="picker-assistant"
          :mode="mode"
          :rgb="rgb"
          :alpha="alpha"
          @save-to-palette="saveAssistantColorToPalette"
        />

        <ColorHistory
          class="picker-history"
          :items="history"
          @apply="applyStoredColor"
          @remove="removeHistoryItem"
        />

        <ColorPalette
          class="picker-palette"
          :items="palette"
          @apply="applyStoredColor"
          @remove="removePaletteItem"
          @add="addCurrentColorToPalette"
        />
      </div>

      <aside class="picker-layout__side">
        <!-- 宽屏右栏的「选择颜色」；窄屏隐藏，改由取色器在二维图区域 / 多滑块区域最下面各显示一个「显示颜色」 -->
        <div class="picker-display">
          <SelectColorSection
            :rgb="rgb"
            :alpha="alpha"
            :gamut="gamut"
            @pick-from-screen="pickColorFromScreen"
            @use-fallback="applyFallbackColor"
          />
        </div>
        <section class="picker-units">
          <h2 class="picker-section-title">{{ t('colorPicker.colorConversion') }}</h2>
          <ColorUnits :rgb="rgb" :alpha="alpha" />
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

/* 左列：模式选择 / 颜色选择器 / 配色助手 / 历史记录 / 调色板；右列：选择颜色 / 颜色转换 */
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

/*
 * 编辑器区域不再固定最小高度：高度交给内容自然撑开，切换模式时按实际内容收缩。
 */
.picker-editor {
  min-height: 0;
}

.picker-units {
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

/* 窄屏（平板 / 手机）单列展示，顺序为：
 * 选择框 → 颜色选择器（二维图区域 + 多滑块区域，各含一个「显示颜色」）→ 颜色转换 → 配色助手 → 历史记录 → 调色板。
 * 这里把两个列容器设为 display: contents，让各区块成为同级 flex item 后用 order 排序。
 */
@media (max-width: 1100px) {
  .picker-layout {
    display: flex;
    flex-direction: column;
    /* 宽屏 grid 的 align-items: start 在 flex 列布局里会把子项收成内容宽度，
       这里必须恢复 stretch，否则颜色转换面板 / 滑块轨道都会只剩很窄一条 */
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

  /* 窄屏不显示右栏的「选择颜色」：改由取色器在二维图区域 / 多滑块区域最下面各显示一个「显示颜色」 */
  .picker-display {
    display: none;
  }

  .picker-units {
    order: 4;
  }

  .picker-assistant {
    order: 5;
  }

  .picker-history {
    order: 6;
  }

  .picker-palette {
    order: 7;
  }
}
</style>
