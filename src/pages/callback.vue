<template>
  <main class="spotify-callback">
    <h1>Spotify verbinden</h1>
    <p role="status">{{ status }}</p>
    <a v-if="completed" href="/spotify-status">Aktuellen Spotify-Titel anzeigen</a>
    <a v-if="failed" href="/visualizer">Zurück zur Visualisierung</a>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { finishSpotifyLogin } from "../spotify/pkce";

const status = ref("Spotify-Anmeldung wird abgeschlossen …");
const failed = ref(false);
const completed = ref(false);

onMounted(async () => {
  try {
    await finishSpotifyLogin(window.location.search);
    status.value = "Spotify-Anmeldung erfolgreich. Du kannst jetzt deine aktuelle Wiedergabe prüfen.";
    completed.value = true;
  } catch (error) {
    failed.value = true;
    status.value = error instanceof Error ? error.message : "Spotify-Anmeldung fehlgeschlagen.";
  }
});
</script>

<route lang="json">
{
  "name": "Spotify Callback",
  "meta": {
    "requiresAuth": false
  }
}
</route>

<style scoped>
.spotify-callback {
  display: grid;
  min-height: 100vh;
  align-content: center;
  justify-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}
</style>
