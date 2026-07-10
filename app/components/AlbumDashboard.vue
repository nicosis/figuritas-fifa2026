<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { countries } from '~/utils/countries.js'
import { useAlbumStore } from '~/composables/useAlbumStore.js'
import { 
  LogOut, 
  LogIn, 
  Search, 
  RotateCcw, 
  Check, 
  RefreshCw,
  Award,
  Layers,
  HelpCircle
} from '@lucide/vue'

const emit = defineEmits(['logout'])
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const store = useAlbumStore()

// Destructure store properties for top-level reactivity auto-unwrapping in template
const {
  stickers,
  loading,
  syncError,
  stats,
  countryStats,
  loadStoreData,
  updateSticker,
  resetAlbum
} = store

// State
const selectedCountry = ref(countries[0])
const searchQuery = ref('')
const filterMode = ref('all') // 'all', 'missing', 'duplicates'
const showResetConfirm = ref(false)

// Drag to Scroll horizontal country navigation variables
const scrollContainer = ref(null)
let isDragging = false
let startX = 0
let scrollLeft = 0
let dragMoved = false

const startDrag = (e) => {
  isDragging = true
  dragMoved = false
  startX = e.pageX - scrollContainer.value.offsetLeft
  scrollLeft = scrollContainer.value.scrollLeft
}

const stopDrag = () => {
  isDragging = false
}

const onDrag = (e) => {
  if (!isDragging) return
  e.preventDefault()
  const x = e.pageX - scrollContainer.value.offsetLeft
  const walk = (x - startX) * 1.5 // Adjust scrolling sensitivity multiplier
  if (Math.abs(walk) > 5) {
    dragMoved = true
  }
  scrollContainer.value.scrollLeft = scrollLeft - walk
}

const selectCountryWithDragCheck = (c) => {
  if (dragMoved) return // Skip selection if the user was dragging the container
  selectedCountry.value = c
}

// Watch selected country to automatically center it in the horizontal swiper
watch(selectedCountry, (newVal) => {
  if (!newVal || !import.meta.client) return
  nextTick(() => {
    const container = scrollContainer.value
    if (!container) return
    const activeBtn = container.querySelector(`[data-country-id="${newVal.id}"]`)
    if (activeBtn) {
      const containerWidth = container.clientWidth
      const btnOffsetLeft = activeBtn.offsetLeft
      const btnWidth = activeBtn.clientWidth
      
      container.scrollTo({
        left: btnOffsetLeft - (containerWidth / 2) + (btnWidth / 2),
        behavior: 'smooth'
      })
    }
  })
})

// Initialize store on mount
onMounted(() => {
  loadStoreData()
})

// Filter countries based on search query
const filteredCountries = computed(() => {
  if (!searchQuery.value) return countries
  const query = searchQuery.value.toLowerCase().trim()
  return countries.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.id.toLowerCase().includes(query)
  )
})

// Auto-select first country in filtered list if current is filtered out
watch(filteredCountries, (newVal) => {
  if (newVal.length > 0 && !newVal.find(c => c.id === selectedCountry.value.id)) {
    selectedCountry.value = newVal[0]
  }
})

// Stickers visible in the grid based on filter
const visibleStickers = computed(() => {
  const c = selectedCountry.value
  if (!c) return []
  
  const list = []
  for (let i = 1; i <= c.total; i++) {
    const key = `${c.id}_${i}`
    const qty = stickers.value[key] || 0
    
    if (filterMode.value === 'missing' && qty > 0) continue
    if (filterMode.value === 'duplicates' && qty <= 1) continue
    
    list.push({ number: i, key })
  }
  return list
})

// Handlers
const handleSignOut = async () => {
  await supabase.auth.signOut()
  emit('logout')
}

const handleSignInRedirect = () => {
  emit('logout') // Bypasses guest view and shows AuthGate
}

const handleReset = async () => {
  await resetAlbum()
  showResetConfirm.value = false
}
</script>

<template>
  <div class="max-w-2xl mx-auto w-full flex-1 flex flex-col pb-12">
    <!-- Top Sticky Header -->
    <header class="sticky top-0 bg-slate-950/80 backdrop-blur-md z-30 border-b border-slate-900 py-3 px-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xl">🏆</span>
        <div>
          <h2 class="text-sm font-extrabold text-slate-100 tracking-tight leading-none">Figuritas 2026</h2>
          <!-- Sync Status Indicator -->
          <div class="flex items-center gap-1 mt-1">
            <span class="relative flex h-1.5 w-1.5">
              <span 
                class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                :class="loading ? 'bg-amber-400' : 'bg-emerald-400'"
              ></span>
              <span 
                class="relative inline-flex rounded-full h-1.5 w-1.5"
                :class="loading ? 'bg-amber-500' : 'bg-emerald-500'"
              ></span>
            </span>
            <span class="text-[9px] font-semibold text-slate-400 tracking-wide uppercase">
              {{ loading ? 'Sincronizando...' : 'Sincronizado' }}
            </span>
          </div>
        </div>
      </div>

      <!-- User Auth Panel -->
      <div class="flex items-center gap-2">
        <div v-if="user" class="flex items-center gap-2">
          <div class="hidden xs:flex flex-col items-end">
            <span class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest leading-none">Usuario</span>
            <span class="text-xs font-bold text-emerald-400 max-w-[120px] truncate">{{ user.email }}</span>
          </div>
          <button 
            @click="handleSignOut" 
            title="Cerrar sesión"
            class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
        <div v-else class="flex items-center gap-2">
          <span class="px-2 py-0.5 text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-400 rounded-md uppercase tracking-wider">
            🔓 Invitado
          </span>
          <button 
            @click="handleSignInRedirect"
            class="flex items-center gap-1 text-[11px] font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1.5 rounded-lg transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <LogIn class="w-3 h-3" />
            <span>Nube</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Sync Error Alert Banner -->
    <div v-if="syncError" class="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-sm">⚠️</span>
        <span>{{ syncError }}</span>
      </div>
      <button 
        @click="loadStoreData()" 
        class="text-[10px] font-black uppercase text-red-400 hover:underline tracking-wider"
      >
        Reintentar
      </button>
    </div>

    <!-- Main Container -->
    <div class="px-4 mt-4 space-y-4">
      
      <!-- Stats Dashboard Card -->
      <section class="bg-gradient-to-br from-slate-900/60 to-slate-950/40 backdrop-blur-xl border border-slate-900 rounded-3xl p-5 shadow-xl relative overflow-hidden">
        <!-- Background Accent Glow -->
        <div class="absolute -right-10 -bottom-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div class="flex items-end justify-between mb-2">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Progreso Total</span>
            <div class="text-3xl font-black text-slate-50">{{ stats.progressPercent }}%</div>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-slate-300">
              {{ stats.uniqueCollected }} <span class="text-slate-600">/ {{ stats.total }}</span>
            </span>
            <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Figuritas Únicas</div>
          </div>
        </div>

        <!-- Glowing Progress Bar -->
        <div class="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-900 overflow-hidden mb-5">
          <div 
            class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500 relative"
            :style="{ width: `${stats.progressPercent}%` }"
          >
            <!-- Shinning bar stripe -->
            <div class="absolute inset-0 bg-white/20 skew-x-12 translate-x-[-50%] animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>

        <!-- Stat metrics grid -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-slate-950/40 rounded-2xl py-2.5 border border-slate-900/40">
            <div class="text-emerald-400 font-bold text-base flex items-center justify-center gap-1">
              <Award class="w-3.5 h-3.5 shrink-0" />
              {{ stats.uniqueCollected }}
            </div>
            <div class="text-[9px] font-semibold uppercase text-slate-500 mt-0.5 tracking-wider">Pegadas</div>
          </div>
          
          <div class="bg-slate-950/40 rounded-2xl py-2.5 border border-slate-900/40">
            <div class="text-slate-400 font-bold text-base flex items-center justify-center gap-1">
              <HelpCircle class="w-3.5 h-3.5 shrink-0" />
              {{ stats.missing }}
            </div>
            <div class="text-[9px] font-semibold uppercase text-slate-500 mt-0.5 tracking-wider">Faltantes</div>
          </div>

          <div class="bg-slate-950/40 rounded-2xl py-2.5 border border-slate-900/40">
            <div class="text-amber-400 font-bold text-base flex items-center justify-center gap-1">
              <Layers class="w-3.5 h-3.5 shrink-0" />
              {{ stats.duplicates }}
            </div>
            <div class="text-[9px] font-semibold uppercase text-slate-500 mt-0.5 tracking-wider">Repetidas</div>
          </div>
        </div>
      </section>

      <!-- Search & Filters -->
      <section class="space-y-3">
        <!-- Search bar -->
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
            <Search class="w-4 h-4" />
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar país o código (ej. ARG, México)..."
            class="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
          />
        </div>

        <!-- Filter Mode tabs -->
        <div class="flex bg-slate-950 p-1 border border-slate-900 rounded-xl">
          <button 
            @click="filterMode = 'all'"
            class="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="filterMode === 'all' ? 'bg-slate-900 text-emerald-400 shadow-md' : 'text-slate-500 hover:text-slate-300'"
          >
            Todas
          </button>
          <button 
            @click="filterMode = 'missing'"
            class="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="filterMode === 'missing' ? 'bg-slate-900 text-emerald-400 shadow-md' : 'text-slate-500 hover:text-slate-300'"
          >
            Faltantes ({{ stats.missing }})
          </button>
          <button 
            @click="filterMode = 'duplicates'"
            class="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="filterMode === 'duplicates' ? 'bg-slate-900 text-emerald-400 shadow-md' : 'text-slate-500 hover:text-slate-300'"
          >
            Repetidas ({{ stats.duplicates }})
          </button>
        </div>
      </section>

      <!-- Horizontal Countries Scroll Bar -->
      <section class="relative">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2 px-1">Selecciones</span>
        
        <div 
          ref="scrollContainer"
          class="flex gap-2 overflow-x-auto pb-2 scrollbar-none cursor-grab active:cursor-grabbing select-none scroll-smooth"
          @mousedown="startDrag"
          @mouseleave="stopDrag"
          @mouseup="stopDrag"
          @mousemove="onDrag"
        >
          <button
            v-for="c in filteredCountries"
            :key="c.id"
            :data-country-id="c.id"
            @click="selectCountryWithDragCheck(c)"
            class="shrink-0 min-w-[76px] bg-slate-900/60 hover:bg-slate-900 border rounded-2xl p-2.5 flex flex-col items-center justify-between text-center transition-all cursor-pointer"
            :class="selectedCountry.id === c.id 
              ? 'border-emerald-500 text-slate-50 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30' 
              : 'border-slate-900 text-slate-400 hover:border-slate-800'
            "
          >
            <!-- Country Flag -->
            <span class="text-xl select-none">{{ c.flag }}</span>
            <!-- Country Code -->
            <span class="text-[10px] font-black tracking-wider uppercase mt-1.5">{{ c.id }}</span>
            <!-- Progress text -->
            <span class="text-[9px] font-bold text-slate-500 mt-0.5">
              {{ countryStats[c.id]?.collected }}/{{ c.total }}
            </span>
            <!-- Country tiny progress bar -->
            <div class="w-full bg-slate-950 h-1 rounded-full overflow-hidden mt-1.5">
              <div 
                class="bg-emerald-500 h-full rounded-full"
                :style="{ width: `${countryStats[c.id]?.percent}%` }"
              ></div>
            </div>
          </button>

          <!-- Empty list indicator -->
          <div 
            v-if="filteredCountries.length === 0" 
            class="w-full text-center py-6 text-xs text-slate-600 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl"
          >
            No se encontraron selecciones.
          </div>
        </div>
      </section>

      <!-- Active Country Panel & Stickers Grid -->
      <section v-if="selectedCountry" class="space-y-3">
        <!-- Selected country title & metadata -->
        <div class="flex items-center justify-between border-b border-slate-900 pb-2 px-1">
          <div>
            <h3 class="text-base font-extrabold text-slate-100 flex items-center gap-1.5">
              <span class="text-2xl">{{ selectedCountry.flag }}</span>
              {{ selectedCountry.name }}
            </h3>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {{ selectedCountry.pages }}
            </span>
          </div>

          <div class="text-right">
            <span class="text-xs font-black text-slate-300">
              {{ countryStats[selectedCountry.id]?.collected }} / {{ selectedCountry.total }}
            </span>
            <span class="text-[9px] text-slate-500 uppercase font-bold block leading-none">Coleccionadas</span>
          </div>
        </div>

        <!-- Stickers Grid -->
        <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
          <StickerButton
            v-for="sticker in visibleStickers"
            :key="sticker.key"
            :country-id="selectedCountry.id"
            :number="sticker.number"
            :quantity="stickers[sticker.key]"
            @update:quantity="(val) => updateSticker(selectedCountry.id, sticker.number, val)"
          />
        </div>

        <!-- Empty Filter State -->
        <div 
          v-if="visibleStickers.length === 0" 
          class="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-900 rounded-3xl bg-slate-950/20"
        >
          <span class="text-2xl mb-2">🎉</span>
          <p class="text-xs font-medium text-slate-500 max-w-[280px]">
            <span v-if="filterMode === 'missing'">
              ¡Completaste esta selección! No te faltan figuritas aquí.
            </span>
            <span v-else-if="filterMode === 'duplicates'">
              No tienes figuritas repetidas en esta selección.
            </span>
            <span v-else>
              No hay figuritas para mostrar.
            </span>
          </p>
        </div>
      </section>

      <!-- Danger Reset Area -->
      <section class="pt-8 border-t border-slate-900">
        <div v-if="!showResetConfirm" class="flex justify-center">
          <button 
            @click="showResetConfirm = true"
            class="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 font-bold px-4 py-2 hover:bg-red-500/5 border border-transparent hover:border-red-500/10 rounded-xl transition-all cursor-pointer"
          >
            <RotateCcw class="w-3.5 h-3.5" />
            Reiniciar Álbum Completo
          </button>
        </div>
        <div v-else class="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 text-center space-y-3">
          <h4 class="text-xs font-black text-red-400 uppercase tracking-wider">¿Estás completamente seguro?</h4>
          <p class="text-[11px] text-slate-400 max-w-sm mx-auto">
            Esta acción borrará de forma permanente todas tus figuritas guardadas tanto a nivel local como en la nube. No se puede deshacer.
          </p>
          <div class="flex gap-2 justify-center">
            <button 
              @click="handleReset"
              class="bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold px-3 py-2 rounded-lg transition-all cursor-pointer"
            >
              Sí, reiniciar
            </button>
            <button 
              @click="showResetConfirm = false"
              class="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-extrabold px-3 py-2 rounded-lg transition-all border border-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
