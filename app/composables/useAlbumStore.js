import { ref, computed, watch } from "vue";
import { countries } from "~/utils/countries.js";

// Helper to initialize the stickers dictionary with all possible numbers set to 0
const createDefaultStickers = () => {
  const obj = {};
  for (const c of countries) {
    for (let i = 1; i <= c.total; i++) {
      obj[`${c.id}_${i}`] = 0;
    }
  }
  return obj;
};

// Global reactive states shared by all composable instances
const stickers = ref(createDefaultStickers());
const isInitialized = ref(false);
const loading = ref(false);
const syncError = ref(null);

export const useAlbumStore = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  // Helper to determine the key for localStorage
  const getStorageKey = () => {
    if (user.value) {
      return `album_figuritas_data_${user.value.id}`;
    }
    return `album_figuritas_data_guest`;
  };

  // Load data from LocalStorage and Supabase
  const loadStoreData = async () => {
    if (!import.meta.client) return;

    loading.value = true;
    syncError.value = null;

    try {
      const storageKey = getStorageKey();
      const localData = localStorage.getItem(storageKey);

      // 1. Instantly load local cache to keep the UI snappy
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          stickers.value = { ...createDefaultStickers(), ...parsed };
        } catch (e) {
          console.error("Error parsing local stickers storage", e);
        }
      } else {
        stickers.value = createDefaultStickers();
      }

      // 2. If user is authenticated, sync with remote Supabase database
      if (user.value) {
        const { data: remoteData, error: fetchError } = await supabase
          .from("figuritas")
          .select("country_id, number, quantity");

        if (fetchError) throw fetchError;

        // Check if there is guest progress to migrate
        const guestDataStr = localStorage.getItem("album_figuritas_data_guest");
        let guestData = null;
        let guestStickersCount = 0;

        if (guestDataStr) {
          try {
            guestData = JSON.parse(guestDataStr);
            guestStickersCount = Object.values(guestData).reduce(
              (sum, val) => sum + val,
              0,
            );
          } catch (e) {
            console.error("Error parsing guest data", e);
          }
        }

        // Migration logic: if Supabase has no stickers AND user has guest stickers
        if (
          (!remoteData || remoteData.length === 0) &&
          guestStickersCount > 0
        ) {
          console.log(
            "Migrating guest progress to Supabase for the new user...",
          );

          const rowsToUpsert = [];
          for (const [key, qty] of Object.entries(guestData)) {
            if (qty > 0) {
              const [country_id, numberStr] = key.split("_");
              const number = parseInt(numberStr, 10);
              rowsToUpsert.push({
                user_id: user.value.id,
                country_id,
                number,
                quantity: qty,
              });
            }
          }

          if (rowsToUpsert.length > 0) {
            const { error: upsertError } = await supabase
              .from("figuritas")
              .upsert(rowsToUpsert);

            if (upsertError) throw upsertError;

            // Set current state to the migrated guest stickers
            stickers.value = { ...createDefaultStickers(), ...guestData };
            // Save to user-specific localStorage key
            localStorage.setItem(storageKey, JSON.stringify(stickers.value));
            // Clear guest data from storage to avoid repeated migrations
            localStorage.removeItem("album_figuritas_data_guest");
          }
        } else if (remoteData && remoteData.length > 0) {
          // If remote data exists, it overrides the local state (server is single-source of truth)
          const newStickers = createDefaultStickers();
          for (const row of remoteData) {
            newStickers[`${row.country_id}_${row.number}`] = row.quantity;
          }
          stickers.value = newStickers;
          localStorage.setItem(storageKey, JSON.stringify(stickers.value));
        }
      }
      isInitialized.value = true;
    } catch (e) {
      console.error("Error in loadStoreData:", e);
      syncError.value = e.message || "Error al sincronizar con Supabase";
    } finally {
      loading.value = false;
    }
  };

  // Update a single sticker quantity (reactive state + localStorage + Supabase)
  const updateSticker = async (countryId, number, quantity) => {
    if (!import.meta.client) return;

    const key = `${countryId}_${number}`;
    stickers.value[key] = quantity;

    // Update LocalStorage immediately
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(stickers.value));

    // Update Supabase in the background if logged in
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    const userId = currentUser?.id || user.value?.id;

    if (userId) {
      try {
        const { error } = await supabase.from("figuritas").upsert(
          {
            user_id: userId,
            country_id: countryId,
            number: number,
            quantity: quantity,
          },
          { onConflict: "user_id,country_id,number" },
        );

        if (error) throw error;
      } catch (e) {
        console.error("Failed to sync sticker update to Supabase:", e);
        syncError.value =
          "Guardado localmente. Error de conexión con Supabase.";
      }
    }
  };

  // Mark all stickers of a country as collected (set to 1 if currently 0)
  const completeCountry = async (countryId, totalStickers) => {
    if (!import.meta.client) return;

    loading.value = true;
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      const userId = currentUser?.id || user.value?.id;

      const storageKey = getStorageKey();
      const rowsToUpsert = [];

      for (let i = 1; i <= totalStickers; i++) {
        const key = `${countryId}_${i}`;
        const currentQty = stickers.value[key] || 0;
        if (currentQty === 0) {
          stickers.value[key] = 1;
          if (userId) {
            rowsToUpsert.push({
              user_id: userId,
              country_id: countryId,
              number: i,
              quantity: 1,
            });
          }
        }
      }

      localStorage.setItem(storageKey, JSON.stringify(stickers.value));

      // console.log('DEBUG completeCountry payload:', {
      //   userId,
      //   userEmail: currentUser?.email || user.value?.email,
      //   rowsCount: rowsToUpsert.length,
      //   rows: JSON.parse(JSON.stringify(rowsToUpsert))
      // })

      if (userId && rowsToUpsert.length > 0) {
        const { error } = await supabase
          .from("figuritas")
          .upsert(rowsToUpsert, { onConflict: "user_id,country_id,number" });
        if (error) throw error;
      }
    } catch (e) {
      console.error("Error completing country:", e);
      syncError.value = e.message || "Error al completar la selección";
    } finally {
      loading.value = false;
    }
  };

  // Reset entire album state
  const resetAlbum = async () => {
    if (!import.meta.client) return;

    loading.value = true;
    try {
      stickers.value = createDefaultStickers();
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(stickers.value));

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userId = currentUser?.id || user.value?.id;

      if (userId) {
        const { error } = await supabase
          .from("figuritas")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
      }
    } catch (e) {
      console.error("Error resetting album:", e);
      syncError.value = e.message || "Error al reiniciar el álbum";
    } finally {
      loading.value = false;
    }
  };

  // Calculated global stats
  const stats = computed(() => {
    let uniqueCollected = 0;
    let totalCollected = 0;
    let duplicates = 0;
    const totalStickersCount = Object.keys(stickers.value).length;

    for (const qty of Object.values(stickers.value)) {
      if (qty > 0) {
        uniqueCollected++;
        totalCollected += qty;
        if (qty > 1) {
          duplicates += qty - 1;
        }
      }
    }

    const missing = totalStickersCount - uniqueCollected;
    const progressPercent =
      totalStickersCount > 0
        ? Math.round((uniqueCollected / totalStickersCount) * 100)
        : 0;

    return {
      total: totalStickersCount,
      uniqueCollected,
      totalCollected,
      missing,
      duplicates,
      progressPercent,
    };
  });

  // Grouped stats by country
  const countryStats = computed(() => {
    const statsObj = {};
    for (const c of countries) {
      let collected = 0;
      let duplicates = 0;
      for (let i = 1; i <= c.total; i++) {
        const qty = stickers.value[`${c.id}_${i}`] || 0;
        if (qty > 0) {
          collected++;
          if (qty > 1) {
            duplicates += qty - 1;
          }
        }
      }
      statsObj[c.id] = {
        collected,
        total: c.total,
        duplicates,
        percent: Math.round((collected / c.total) * 100),
      };
    }
    return statsObj;
  });

  // Automatically watch auth state to reload correct storage scope
  watch(user, () => {
    loadStoreData();
  });

  return {
    stickers,
    isInitialized,
    loading,
    syncError,
    stats,
    countryStats,
    loadStoreData,
    updateSticker,
    completeCountry,
    resetAlbum,
  };
};
