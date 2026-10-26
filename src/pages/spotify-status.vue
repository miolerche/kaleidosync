<template>
  <main class="spotify-status">
    <h1>Spotify-Wiedergabe</h1>
    <p>{{ status }}</p>
    <section v-if="track">
      <img v-if="track.image" :src="track.image" alt="Albumcover" width="180" height="180" />
      <h2>{{ track.title }}</h2>
      <p>{{ track.artist }}</p>
      <p>{{ track.playing ? "Wird abgespielt" : "Pausiert" }}</p>
    </section>
    <p v-if="error" role="alert">{{ error }}</p>
    <p class="note">Die Wiedergabeinformationen kommen direkt von Spotify. Eine Audio- oder Beat-Synchronisation der Kaleidosync-Visualisierung ist noch nicht integriert.</p>
    <a href="/spotify-connect">Spotify erneut verbinden</a>
    <a href="/visualizer">Zur Visualisierung</a>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { SpotifySession } from "../spotify/pkce";
const status = ref("Spotify-Wiedergabe wird geladen …");
const error = ref("");
const track = ref<{ title: string; artist: string; image: string; playing: boolean } | null>(null);
let poller: ReturnType<typeof setInterval> | undefined;
async function poll() {
  const raw = sessionStorage.getItem("kaleidosync.spotify.session");
  if (!raw) { status.value = "Nicht mit Spotify verbunden."; return; }
  const session = JSON.parse(raw) as SpotifySession;
  if (Date.now() >= session.expires_at) { status.value = "Die Sitzung ist abgelaufen. Bitte erneut anmelden."; return; }
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    if (response.status === 204) { track.value = null; status.value = "Spotify spielt derzeit keinen Titel ab."; error.value = ""; return; }
    if (!response.ok) throw new Error(`Spotify API: HTTP ${response.status}`);
    const data = await response.json() as {
      is_playing: boolean;
      item?: { name?: string; artists?: Array<{ name: string }>; album?: { images?: Array<{ url: string }> } };
    };
    track.value = data.item ? {
      title: data.item.name || "Unbekannter Titel",
      artist: (data.item.artists || []).map(a => a.name).join(", "),
      image: data.item.album?.images?.[0]?.url || "",
      playing: data.is_playing
    } : null;
    status.value = track.value ? "Spotify verbunden" : "Kein Titel verfügbar.";
    error.value = "";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Spotify-Abfrage fehlgeschlagen.";
  }
}
onMounted(() => { void poll(); poller = setInterval(() => { void poll(); }, 5000); });
onUnmounted(() => { if (poller) clearInterval(poller); });
</script>

<style scoped>
.spotify-status { min-height: 100vh; max-width: 620px; margin: auto; padding: 2rem; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1rem; text-align: center; }
img { object-fit: cover; border-radius: 1rem; }
.note { opacity: .75; font-size: .9rem; }
</style>
