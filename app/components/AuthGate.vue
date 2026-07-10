<script setup>
import { ref } from 'vue'
import { Mail, Lock, LogIn, UserPlus, ShieldAlert, CheckCircle2 } from '@lucide/vue'

const emit = defineEmits(['continue-guest'])
const supabase = useSupabaseClient()

const email = ref('')
const password = ref('')
const isRegister = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const handleAuth = async () => {
  if (!email.value || !password.value) {
    errorMessage.value = 'Por favor completa todos los campos.'
    return
  }

  if (password.value.length < 6) {
    errorMessage.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    if (isRegister.value) {
      const { data, error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      })
      if (error) throw error
      
      if (data?.user && data?.session) {
        successMessage.value = '¡Cuenta creada con éxito! Iniciando sesión...'
      } else {
        successMessage.value = '¡Registro exitoso! Verifica tu correo electrónico para confirmar tu cuenta.'
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      })
      if (error) throw error
      successMessage.value = 'Sesión iniciada correctamente.'
    }
  } catch (err) {
    console.error('Auth error:', err)
    errorMessage.value = err.message || 'Ocurrió un error inesperado durante la autenticación.'
  } finally {
    loading.value = false
  }
}

const toggleMode = () => {
  isRegister.value = !isRegister.value
  errorMessage.value = ''
  successMessage.value = ''
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-4 min-h-screen bg-slate-950 relative overflow-hidden">
    <!-- Ambient background glows -->
    <div class="absolute top-[-20%] left-[-10%] w-[50%] aspect-square rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
    <div class="absolute bottom-[-20%] right-[-10%] w-[50%] aspect-square rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

    <!-- Brand / Title -->
    <div class="text-center mb-8 z-10 animate-fade-in">
      <div class="inline-flex p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/5">
        <span class="text-3xl">🏆</span>
      </div>
      <h1 class="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-emerald-200 to-teal-400 bg-clip-text text-transparent">
        Figuritas FIFA 2026
      </h1>
      <p class="text-slate-400 mt-2 text-sm max-w-[280px] mx-auto">
        Controla tu álbum del Mundial 2026 desde cualquier dispositivo.
      </p>
    </div>

    <!-- Form Container -->
    <div class="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl z-10">
      <h2 class="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
        <component :is="isRegister ? UserPlus : LogIn" class="w-5 h-5 text-emerald-400" />
        {{ isRegister ? 'Crear cuenta nueva' : 'Iniciar Sesión' }}
      </h2>

      <!-- Form -->
      <form @submit.prevent="handleAuth" class="space-y-4">
        <!-- Email Input -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Correo Electrónico
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Mail class="w-4 h-4" />
            </span>
            <input
              v-model="email"
              type="email"
              placeholder="tu@email.com"
              required
              class="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        <!-- Password Input -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Contraseña
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
              <Lock class="w-4 h-4" />
            </span>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              required
              class="w-full bg-slate-950/60 border border-slate-800 focus:border-emerald-500/50 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        <!-- Error Alert -->
        <Transition name="fade">
          <div v-if="errorMessage" class="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
            <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{{ errorMessage }}</span>
          </div>
        </Transition>

        <!-- Success Alert -->
        <Transition name="fade">
          <div v-if="successMessage" class="flex gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl">
            <CheckCircle2 class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{{ successMessage }}</span>
          </div>
        </Transition>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800/50 disabled:text-emerald-500 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
          <span v-else>{{ isRegister ? 'Registrarse' : 'Ingresar' }}</span>
        </button>
      </form>

      <!-- Toggle Mode Link -->
      <div class="mt-4 text-center">
        <button
          type="button"
          @click="toggleMode"
          class="text-xs text-emerald-400/80 hover:text-emerald-300 font-medium cursor-pointer"
        >
          {{ isRegister ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí' }}
        </button>
      </div>

      <!-- Divider -->
      <div class="relative my-6 flex items-center justify-center">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-slate-800"></div>
        </div>
        <span class="relative px-3 text-[10px] font-black uppercase tracking-widest bg-slate-900 text-slate-500">
          O
        </span>
      </div>

      <!-- Guest Mode Button -->
      <button
        type="button"
        @click="emit('continue-guest')"
        class="w-full bg-slate-950/40 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 font-bold py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        <span>🔓 Continuar como Invitado</span>
      </button>
    </div>

    <!-- PWA footer disclaimer -->
    <p class="text-[10px] text-slate-600 mt-8 text-center max-w-[280px]">
      Modo Invitado guarda los datos únicamente en este navegador. Registra una cuenta para guardarlos en la nube de forma permanente.
    </p>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
