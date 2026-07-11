<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { countries } from "~/utils/countries.js";
import { useAlbumStore } from "~/composables/useAlbumStore.js";
import {
  LogOut,
  LogIn,
  Search,
  RotateCcw,
  Check,
  RefreshCw,
  Award,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
} from "@lucide/vue";

const emit = defineEmits(["logout"]);
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const store = useAlbumStore();

// Destructure store properties for top-level reactivity auto-unwrapping in template
const {
  stickers,
  loading,
  syncError,
  stats,
  countryStats,
  loadStoreData,
  updateSticker,
  completeCountry,
  resetAlbum,
} = store;

// State
const selectedCountry = ref(countries[0]);
const searchQuery = ref("");
const filterMode = ref("all"); // 'all', 'missing', 'duplicates'
const showResetConfirm = ref(false);
const isCountryGridExpanded = ref(true);

// Initialize store on mount
onMounted(() => {
  loadStoreData();
});

// Filter countries based on search query
const filteredCountries = computed(() => {
  if (!searchQuery.value) return countries;
  const query = searchQuery.value.toLowerCase().trim();
  return countries.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query),
  );
});

// Auto-select first country in filtered list if current is filtered out
watch(filteredCountries, (newVal) => {
  if (
    newVal.length > 0 &&
    !newVal.find((c) => c.id === selectedCountry.value.id)
  ) {
    selectedCountry.value = newVal[0];
  }
});

// Stickers visible in the grid based on filter
const visibleStickers = computed(() => {
  const c = selectedCountry.value;
  if (!c) return [];

  const list = [];
  for (let i = 1; i <= c.total; i++) {
    const key = `${c.id}_${i}`;
    const qty = stickers.value[key] || 0;

    if (filterMode.value === "missing" && qty > 0) continue;
    if (filterMode.value === "duplicates" && qty <= 1) continue;

    list.push({ number: i, key });
  }
  return list;
});

// Handlers
const handleSignOut = async () => {
  await supabase.auth.signOut();
  emit("logout");
};

const handleSignInRedirect = () => {
  emit("logout"); // Bypasses guest view and shows AuthGate
};

const handleReset = async () => {
  await resetAlbum();
  showResetConfirm.value = false;
};

const selectCountryAndCollapse = (c) => {
  selectedCountry.value = c;
  // Auto collapse on mobile for better usability
  if (import.meta.client && window.innerWidth < 640) {
    isCountryGridExpanded.value = false;
  }
};

const handleCompleteCountry = async () => {
  if (!selectedCountry.value) return;
  await completeCountry(selectedCountry.value.id, selectedCountry.value.total);
};
</script>

<template>
  <div class="max-w-2xl mx-auto w-full flex-1 flex flex-col pb-12">
    <!-- Top Sticky Header -->
    <header
      class="sticky top-0 bg-slate-950/80 backdrop-blur-md z-30 border-b border-slate-900 py-3 px-4 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span class="text-xl">🏆</span>
        <div>
          <h2
            class="text-sm font-extrabold text-slate-100 tracking-tight leading-none"
          >
            Figuritas - FIFA 2026
          </h2>
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
            <span
              class="text-[9px] font-semibold text-slate-400 tracking-wide uppercase"
            >
              {{ loading ? "Sincronizando..." : "Sincronizado" }}
            </span>
          </div>
        </div>
      </div>

      <!-- User Auth Panel -->
      <div class="flex items-center gap-2">
        <div v-if="user" class="flex items-center gap-2">
          <div class="flex flex-col items-end">
            <span
              class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest leading-none"
              >Usuario</span
            >
            <span
              class="text-xs font-bold text-slate-300 max-w-[120px] truncate"
              :title="user.email"
            >
              {{ user.email }}
            </span>
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
          <span
            class="px-2 py-0.5 text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-400 rounded-md uppercase tracking-wider"
          >
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
    <div
      v-if="syncError"
      class="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center justify-between"
    >
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
      <section
        class="bg-gradient-to-br from-slate-900/60 to-slate-950/40 backdrop-blur-xl border border-slate-900 rounded-3xl p-5 shadow-xl relative overflow-hidden"
      >
        <!-- Background Accent Glow -->
        <div
          class="absolute -right-10 -bottom-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"
        ></div>

        <div class="flex items-end justify-between mb-2">
          <div>
            <span
              class="text-[10px] font-bold uppercase tracking-widest text-slate-500"
              >Progreso Total</span
            >
            <div class="text-3xl font-black text-slate-50">
              {{ stats.progressPercent }}%
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold text-slate-300">
              {{ stats.uniqueCollected }}
              <span class="text-slate-600">/ {{ stats.total }}</span>
            </span>
            <div
              class="text-[9px] font-bold text-slate-500 uppercase tracking-wider"
            >
              Figuritas Únicas
            </div>
          </div>
        </div>

        <!-- Glowing Progress Bar -->
        <div
          class="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-900 overflow-hidden mb-5"
        >
          <div
            class="bg-gradient-to-r h-full rounded-full transition-all duration-500 relative"
            :class="stats.progressPercent === 100 ? 'from-amber-500 to-yellow-400' : 'from-emerald-500 to-teal-400'"
            :style="{ width: `${stats.progressPercent}%` }"
          >
            <!-- Shinning bar stripe -->
            <div
              class="absolute inset-0 bg-white/20 skew-x-12 translate-x-[-50%] animate-[shimmer_2s_infinite]"
            ></div>
          </div>
        </div>

        <!-- Stat metrics grid -->
        <div class="grid grid-cols-3 gap-2 text-center">
          <div
            class="bg-slate-950/40 rounded-2xl py-2.5 border border-slate-900/40"
          >
            <div
              class="text-emerald-400 font-bold text-base flex items-center justify-center gap-1"
            >
              <Award class="w-3.5 h-3.5 shrink-0" />
              {{ stats.uniqueCollected }}
            </div>
            <div
              class="text-[9px] font-semibold uppercase text-slate-500 mt-0.5 tracking-wider"
            >
              Pegadas
            </div>
          </div>

          <div
            class="bg-slate-950/40 rounded-2xl py-2.5 border border-slate-900/40"
          >
            <div
              class="text-slate-400 font-bold text-base flex items-center justify-center gap-1"
            >
              <HelpCircle class="w-3.5 h-3.5 shrink-0" />
              {{ stats.missing }}
            </div>
            <div
              class="text-[9px] font-semibold uppercase text-slate-500 mt-0.5 tracking-wider"
            >
              Faltantes
            </div>
          </div>

          <div
            class="bg-slate-950/40 rounded-2xl py-2.5 border border-slate-900/40"
          >
            <div
              class="text-amber-400 font-bold text-base flex items-center justify-center gap-1"
            >
              <Layers class="w-3.5 h-3.5 shrink-0" />
              {{ stats.duplicates }}
            </div>
            <div
              class="text-[9px] font-semibold uppercase text-slate-500 mt-0.5 tracking-wider"
            >
              Repetidas
            </div>
          </div>
        </div>
      </section>

      <!-- Search & Filters -->
      <section class="space-y-3">
        <!-- Search bar -->
        <div class="relative">
          <span
            class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500"
          >
            <Search class="w-4 h-4" />
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar país o código (ej. ARG, México)..."
            class="w-full bg-slate-900/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl py-2.5 pl-10 pr-9 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            type="button"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Filter Mode tabs -->
        <div class="flex bg-slate-950 p-1 border border-slate-900 rounded-xl">
          <button
            @click="filterMode = 'all'"
            class="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="
              filterMode === 'all'
                ? 'bg-slate-900 text-emerald-400 shadow-md'
                : 'text-slate-500 hover:text-slate-300'
            "
          >
            Todas
          </button>
          <button
            @click="filterMode = 'missing'"
            class="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="
              filterMode === 'missing'
                ? 'bg-slate-900 text-emerald-400 shadow-md'
                : 'text-slate-500 hover:text-slate-300'
            "
          >
            Faltantes ({{ stats.missing }})
          </button>
          <button
            @click="filterMode = 'duplicates'"
            class="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
            :class="
              filterMode === 'duplicates'
                ? 'bg-slate-900 text-emerald-400 shadow-md'
                : 'text-slate-500 hover:text-slate-300'
            "
          >
            Repetidas ({{ stats.duplicates }})
          </button>
        </div>
      </section>

      <!-- Collapsible Country Selector Grid -->
      <section
        class="bg-slate-900/40 border border-slate-900 rounded-3xl p-4 space-y-3"
      >
        <div class="flex items-center justify-between px-1">
          <span
            class="text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            {{
              isCountryGridExpanded
                ? "Selecciona un País / Grupo"
                : "Selección Activa"
            }}
          </span>
          <button
            @click="isCountryGridExpanded = !isCountryGridExpanded"
            class="text-xs text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer flex items-center gap-1 select-none"
          >
            <span>{{
              isCountryGridExpanded ? "Contraer" : "Ver Todos (49)"
            }}</span>
            <component
              :is="isCountryGridExpanded ? ChevronUp : ChevronDown"
              class="w-3.5 h-3.5"
            />
          </button>
        </div>

        <!-- 1. Collapsed View: Show only the active country card -->
        <div
          v-if="!isCountryGridExpanded"
          class="flex items-center justify-between bg-slate-950 p-3 border border-slate-900 rounded-2xl animate-fade-in"
        >
          <div class="flex items-center gap-3">
            <span class="text-3xl select-none">{{ selectedCountry.flag }}</span>
            <div>
              <h4
                class="text-sm font-extrabold text-slate-50 flex items-center gap-2"
              >
                {{ selectedCountry.name }}
                <span
                  class="text-[9px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-black text-slate-400"
                  >{{ selectedCountry.id }}</span
                >
              </h4>
              <p
                class="text-[10px] font-bold text-slate-500 uppercase tracking-widest"
              >
                {{ selectedCountry.pages }}
              </p>
            </div>
          </div>
          <div class="text-right flex items-center gap-3">
            <div>
              <span class="text-xs font-black text-slate-300">
                {{ countryStats[selectedCountry.id]?.collected }} /
                {{ selectedCountry.total }}
              </span>
              <div
                class="w-16 bg-slate-900 h-1 rounded-full overflow-hidden mt-1"
              >
                <div
                  class="h-full rounded-full"
                  :class="countryStats[selectedCountry.id]?.percent === 100 ? 'bg-amber-400' : 'bg-emerald-500'"
                  :style="{
                    width: `${countryStats[selectedCountry.id]?.percent}%`,
                  }"
                ></div>
              </div>
            </div>
            <button
              @click="isCountryGridExpanded = true"
              class="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black uppercase text-emerald-400 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Cambiar
            </button>
          </div>
        </div>

        <!-- 2. Expanded View: Grid of all filtered countries -->
        <div
          v-else
          class="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto pr-1 animate-fade-in"
        >
          <button
            v-for="c in filteredCountries"
            :key="c.id"
            @click="selectCountryAndCollapse(c)"
            class="border rounded-2xl p-2 flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[92px]"
            :class="[
              countryStats[c.id]?.percent === 100
                ? selectedCountry.id === c.id
                  ? 'bg-gradient-to-b from-slate-950/60 to-amber-950/20 border-amber-400 text-slate-50 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/30'
                  : 'bg-gradient-to-b from-slate-950/60 to-amber-950/10 border-amber-950/50 text-amber-500/80 hover:border-amber-500/30'
                : selectedCountry.id === c.id
                  ? 'bg-slate-950/60 hover:bg-slate-900 border-emerald-500 text-slate-50 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 hover:bg-slate-900 border-slate-900 text-slate-400 hover:border-slate-800'
            ]"
          >
            <!-- Country Flag -->
            <span class="text-2xl select-none">{{ c.flag }}</span>
            <!-- Country Code -->
            <span
              class="text-[9px] font-black tracking-wider uppercase mt-1 leading-none"
              >{{ c.id }}</span
            >
            <!-- Progress text -->
            <span
              class="text-[9px] font-bold"
              :class="countryStats[c.id]?.percent === 100 ? 'text-amber-500' : 'text-slate-500'"
            >
              {{ countryStats[c.id]?.collected }}/{{ c.total }}
            </span>
            <!-- Country tiny progress bar -->
            <div
              class="w-full bg-slate-900 h-1 rounded-full overflow-hidden mt-1"
            >
              <div
                class="h-full rounded-full"
                :class="countryStats[c.id]?.percent === 100 ? 'bg-amber-400' : 'bg-emerald-500'"
                :style="{ width: `${countryStats[c.id]?.percent}%` }"
              ></div>
            </div>
          </button>

          <!-- Empty list indicator -->
          <div
            v-if="filteredCountries.length === 0"
            class="col-span-full text-center py-6 text-xs text-slate-600 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl"
          >
            No se encontraron selecciones.
          </div>
        </div>
      </section>

      <!-- Active Country Header -->
      <section v-if="selectedCountry" class="space-y-3">
        <!-- Selected country title & metadata -->
        <div
          class="flex items-center justify-between border-b border-slate-900 pb-2 px-1"
        >
          <div>
            <h3
              class="text-base font-extrabold text-slate-100 flex items-center gap-1.5"
            >
              <span class="text-2xl select-none">{{
                selectedCountry.flag
              }}</span>
              {{ selectedCountry.name }}
            </h3>
            <span
              class="text-[10px] font-bold uppercase tracking-widest text-slate-500"
            >
              {{ selectedCountry.pages }}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="handleCompleteCountry"
              title="Marcar todas las figuritas de este país como pegadas"
              class="text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/20 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-0.5 select-none"
            >
              <span>Pegar Todo</span>
            </button>
            <div class="text-right">
              <span class="text-xs font-black text-slate-300">
                {{ countryStats[selectedCountry.id]?.collected }} /
                {{ selectedCountry.total }}
              </span>
              <span
                class="text-[9px] text-slate-500 uppercase font-bold block leading-none"
                >Coleccionadas</span
              >
            </div>
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
            @update:quantity="
              (val) => updateSticker(selectedCountry.id, sticker.number, val)
            "
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
            <span v-else> No hay figuritas para mostrar. </span>
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
        <div
          v-else
          class="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 text-center space-y-3"
        >
          <h4 class="text-xs font-black text-red-400 uppercase tracking-wider">
            ¿Estás completamente seguro?
          </h4>
          <p class="text-[11px] text-slate-400 max-w-sm mx-auto">
            Esta acción borrará de forma permanente todas tus figuritas
            guardadas tanto a nivel local como en la nube. No se puede deshacer.
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

      <!-- Footer -->
      <footer
        class="text-center pt-8 pb-4 text-[10px] font-black tracking-widest text-slate-700 uppercase"
      >
        made by
        <a
          href="https://github.com/nicosis"
          target="_blank"
          class="hover:text-emerald-400 transition-colors"
          >@nicosis</a
        >
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Smooth fade-in for selector toggle */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Custom compact scrollbar for countries grid list */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #10b981;
}
</style>
