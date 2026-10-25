<template>
  <template v-if="standalonePage">
    <SoundCloudPage v-if="standalonePage === 'soundcloud'" />
    <SpotifyConnectPage v-else-if="standalonePage === 'spotify-connect'" />
    <SpotifyCallbackPage v-else-if="standalonePage === 'callback'" />
    <SpotifyStatusPage v-else-if="standalonePage === 'spotify-status'" />
    <AudioTestPage v-else-if="standalonePage === 'audio-test'" />
    <PrecisionPlayerPage v-else-if="standalonePage === 'precision-player'" />
  </template>
  <template v-else>
    <Root />
    <Renderer />
    <Toast />
    <Popover />
  </template>
</template>

<script lang="ts" setup>
import { Root, Toast, Popover } from "@wearesage/vue";
import Renderer from "./components/Renderer.vue";
import SoundCloudPage from "./pages/soundcloud.vue";
import SpotifyConnectPage from "./pages/spotify-connect.vue";
import SpotifyCallbackPage from "./pages/callback.vue";
import SpotifyStatusPage from "./pages/spotify-status.vue";
import AudioTestPage from "./pages/audio-test.vue";
import PrecisionPlayerPage from "./pages/precision-player.vue";

// The Sage router can redirect unknown routes to its default visualizer.
// Mount standalone integration pages directly so they remain accessible.
const path = window.location.pathname.replace(/\/+$/, "") || "/";
const standalonePage =
  path === "/soundcloud" ? "soundcloud" :
  path === "/spotify-connect" ? "spotify-connect" :
  path === "/callback" ? "callback" :
  path === "/spotify-status" ? "spotify-status" :
  path === "/audio-test" ? "audio-test" :
  path === "/precision-player" ? "precision-player" : null;
</script>

<style lang="scss">
@import "@wearesage/vue/css";
@import "@wearesage/vue/styles/appkit-custom.css";
</style>
