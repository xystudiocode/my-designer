<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps<{
  open: boolean
  title: string
  images: string[]
  index: number
}>()

const emit = defineEmits<{ (e: 'close'): void; (e: 'update:index', value: number): void }>()

const { t } = useI18n()

const total = computed(() => props.images.length)
const current = computed(() => props.images[props.index] ?? '')
const canNavigate = computed(() => total.value > 1)

function close() {
  emit('close')
}

function step(delta: number) {
  if (!canNavigate.value) return
  emit('update:index', (props.index + delta + total.value) % total.value)
}

function onKeydown(event: KeyboardEvent) {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    step(-1)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    step(1)
  }
}

let previousOverflow = ''

watch(
  () => props.open,
  (open) => {
    if (open) {
      previousOverflow = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = previousOverflow
    }
  },
)

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[200] flex flex-col bg-slate-950/75 p-4 backdrop-blur-sm sm:p-8"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click.self="close"
      >
        <div class="flex shrink-0 items-center justify-between gap-4">
          <p class="truncate text-sm font-medium text-white/90">{{ title }}</p>
          <button
            type="button"
            class="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
            :aria-label="t('lightbox.close')"
            @click="close"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div class="relative flex min-h-0 flex-1 items-center justify-center py-4">
          <button
            v-if="canNavigate"
            type="button"
            class="absolute left-0 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
            :aria-label="t('lightbox.prev')"
            @click="step(-1)"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <img
            :src="current"
            :alt="title"
            class="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />

          <button
            v-if="canNavigate"
            type="button"
            class="absolute right-0 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
            :aria-label="t('lightbox.next')"
            @click="step(1)"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-6 w-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <p v-if="canNavigate" class="shrink-0 text-center text-sm text-white/80">
          {{ index + 1 }} / {{ total }}
        </p>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}
</style>
