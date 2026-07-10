<script setup>
import { ref } from 'vue'

const user = useSupabaseUser()
const showGuest = ref(false)

const handleGuestMode = () => {
  showGuest.value = true
}

const handleLogout = () => {
  showGuest.value = false
}
</script>

<template>
  <ClientOnly>
    <div class="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <template v-if="user || showGuest">
        <AlbumDashboard @logout="handleLogout" />
      </template>
      <template v-else>
        <AuthGate @continue-guest="handleGuestMode" />
      </template>
    </div>

    <!-- Hydration Fallback view to prevent white flashes -->
    <template #fallback>
      <div class="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4">
        <div class="text-center animate-pulse">
          <div class="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-3">
            <span class="text-3xl">🏆</span>
          </div>
          <h1 class="text-lg font-bold tracking-tight text-slate-100">Cargando Álbum...</h1>
          <p class="text-xs text-slate-500 mt-1">Preparando control de figuritas 2026</p>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

