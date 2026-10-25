<template>
  <main class="spotify-connect">
    <h1>Spotify verbinden</h1>
    <p>Teste die Anmeldung mit deinem Spotify-Konto. Die Verbindung zur Kaleidosync-Wiedergabe wird separat integriert.</p>
    <button type="button" :disabled="busy" @click="connect">{{ busy ? "Weiterleitung zu Spotify …" : "Mit Spotify anmelden" }}</button>
    <p v-if="error" role="alert">{{ error }}</p>
    <a href="/visualizer">Zurück zu Kaleidosync</a>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { startSpotifyLogin } from "../spotify/pkce";
const busy = ref(false);
const error = ref("");
async function connect() {
  busy.value = true;
  error.value = "";
  try {
    await startSpotifyLogin();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Spotify-Anmeldung konnte nicht gestartet werden.";
    busy.value = false;
  }
}
</script>

<route lang="json">
{
  "name": "Spotify Connect",
  "meta": { "requiresAuth": false }
}
</route>

<style scoped>
.spotify-connect { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem; padding: 2rem; text-align: center; }
button { padding: .8rem 1.4rem; border-radius: 1rem; background: #1db954; color: #000; cursor: pointer; font-weight: 700; }
p { max-width: 32rem; }
</style>
