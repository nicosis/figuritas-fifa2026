<script setup>
import { computed } from 'vue'

const props = defineProps({
  countryId: {
    type: String,
    required: true
  },
  number: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:quantity'])

// Special/Shiny stickers are the FWC group (Intro) and the number 1 sticker (Shield/Badge) of each team
const isSpecial = computed(() => {
  return props.countryId === 'FWC' || props.number === 1
})

let longPressTimer = null
let startX = 0
let startY = 0
let isScrolling = false
let longPressed = false

const increment = () => {
  emit('update:quantity', props.quantity + 1)
}

const decrement = () => {
  if (props.quantity > 0) {
    emit('update:quantity', props.quantity - 1)
    if (import.meta.client && navigator.vibrate) {
      navigator.vibrate(40)
    }
  }
}

// Touch Handling (Mobile)
const handleTouchStart = (e) => {
  if (e.touches.length > 1) return
  const touch = e.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  isScrolling = false
  longPressed = false
  
  longPressTimer = setTimeout(() => {
    longPressed = true
    decrement()
  }, 500)
}

const handleTouchMove = (e) => {
  if (isScrolling) return
  const touch = e.touches[0]
  const deltaX = Math.abs(touch.clientX - startX)
  const deltaY = Math.abs(touch.clientY - startY)
  
  // If moving more than 10px, assume the user is scrolling the list
  if (deltaX > 10 || deltaY > 10) {
    isScrolling = true
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }
}

const handleTouchEnd = (e) => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
  
  // Prevent triggering default mouse click simulation on mobile
  e.preventDefault()
  
  if (isScrolling) return
  if (longPressed) return
  
  increment()
}

// Mouse Handling (Desktop)
const handleLeftClick = () => {
  increment()
}

const handleRightClick = () => {
  decrement()
}
</script>

<template>
  <button
    type="button"
    class="relative w-full aspect-square flex flex-col items-center justify-center rounded-xl border text-sm font-semibold select-none transition-all duration-300 overflow-hidden cursor-pointer"
    :class="[
      quantity > 0
        ? isSpecial 
          ? 'bg-gradient-to-br from-amber-500/25 via-yellow-500/10 to-amber-600/30 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 hover:scale-[1.03] active:scale-95'
          : 'bg-gradient-to-br from-emerald-500/25 to-emerald-600/30 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.03] active:scale-95'
        : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
    ]"
    @click="handleLeftClick"
    @contextmenu.prevent="handleRightClick"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Shiny/Glitter Shimmer Effect for Special Stickers -->
    <div
      v-if="quantity > 0 && isSpecial"
      class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none"
    />

    <!-- Sticker Number -->
    <span class="text-base md:text-lg font-bold tracking-tight">{{ number }}</span>
    
    <!-- Country Code label -->
    <span 
      class="text-[9px] uppercase font-semibold tracking-widest mt-0.5"
      :class="quantity > 0 ? (isSpecial ? 'text-amber-400/80' : 'text-emerald-400/80') : 'text-slate-600'"
    >
      {{ countryId }}
    </span>

    <!-- Duplicates Counter Badge -->
    <div
      v-if="quantity > 1"
      class="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-black rounded-md leading-none select-none"
      :class="isSpecial ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'"
    >
      +{{ quantity - 1 }}
    </div>
  </button>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
}
.animate-\[shimmer_2\.5s_infinite\] {
  animation: shimmer 2.5s infinite;
}
</style>
