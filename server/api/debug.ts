export default defineEventHandler(() => {
  return {
    NUXT_PUBLIC_SUPABASE_URL: process.env.NUXT_PUBLIC_SUPABASE_URL || 'not set',
    NUXT_PUBLIC_SUPABASE_KEY: process.env.NUXT_PUBLIC_SUPABASE_KEY || 'not set',
    SUPABASE_URL: process.env.SUPABASE_URL || 'not set',
    SUPABASE_KEY: process.env.SUPABASE_KEY || 'not set',
    NUXT_SUPABASE_URL: process.env.NUXT_SUPABASE_URL || 'not set',
    NUXT_SUPABASE_KEY: process.env.NUXT_SUPABASE_KEY || 'not set',
  }
})
