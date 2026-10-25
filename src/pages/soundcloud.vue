<template>
  <main class="soundcloud-page">
    <h1>SoundCloud</h1>
    <p>Füge den Link eines öffentlichen SoundCloud-Tracks oder einer Playlist ein. Keine Anmeldung erforderlich.</p>
    <form @submit.prevent="load">
      <label for="soundcloud-url">SoundCloud-Link</label>
      <input id="soundcloud-url" v-model="input" type="url" placeholder="https://soundcloud.com/artist/track" required />
      <button type="submit">Abspielen</button>
    </form>
    <p v-if="error" role="alert">{{ error }}</p>
    <iframe v-if="embedUrl" title="SoundCloud Player" :src="embedUrl" width="100%" height="300" allow="autoplay" loading="lazy"></iframe>
    <p class="note">Hinweis: Der eingebettete Player ist noch nicht mit den Kaleidosync-Visualisierungen synchronisiert. Private oder nicht einbettbare Tracks funktionieren möglicherweise nicht.</p>
    <a href="/visualizer">Zurück zur Visualisierung</a>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
const input = ref("");
const embedUrl = ref("");
const error = ref("");
function load() {
  error.value = "";
  embedUrl.value = "";
  try {
    const url = new URL(input.value.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !["soundcloud.com", "www.soundcloud.com", "m.soundcloud.com"].includes(host)) {
      throw new Error("Bitte einen gültigen öffentlichen SoundCloud-Link mit https://soundcloud.com/ eingeben.");
    }
    if (url.pathname === "/" || url.pathname === "") throw new Error("Bitte einen Track- oder Playlist-Link eingeben.");
    url.hostname = "soundcloud.com";
    url.search = "";
    url.hash = "";
    const widget = new URL("https://w.soundcloud.com/player/");
    widget.searchParams.set("url", url.toString());
    widget.searchParams.set("auto_play", "false");
    widget.searchParams.set("visual", "true");
    embedUrl.value = widget.toString();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Ungültiger SoundCloud-Link.";
  }
}
</script>

<route lang="json">
{
  "name": "SoundCloud",
  "meta": { "requiresAuth": false }
}
</route>

<style scoped>
.soundcloud-page { max-width: 720px; min-height: 100vh; margin: 0 auto; display: flex; flex-direction: column; justify-content: center; gap: 1rem; padding: 2rem; }
form { display: flex; flex-direction: column; gap: .75rem; }
input, button { padding: .8rem 1rem; border-radius: .6rem; }
input { background: #fff; color: #111; }
button { background: #ff5500; color: white; font-weight: 700; cursor: pointer; }
iframe { border: 0; border-radius: .75rem; }
.note { opacity: .75; font-size: .9rem; }
</style>
