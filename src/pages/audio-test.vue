<template>
  <main class="audio-test">
    <h1>iPad-Audiotest</h1>
    <p>Prüft, ob Spotify weiterläuft, während Safari das iPad-Mikrofon aufnimmt. Es wird nichts gespeichert oder übertragen.</p>
    <p><strong>Test:</strong> Spotify über deine Anlage starten, hier „Mikrofon testen“ drücken und prüfen, ob die Musik weiterläuft.</p>
    <button @click="start" :disabled="active">Mikrofon testen</button>
    <button @click="stop" :disabled="!active">Test beenden</button>
    <p role="status">{{ status }}</p>
    <p v-if="active">Eingangspegel: {{ Math.round(level * 100) }} %</p>
    <p v-if="active">Bass (35–140 Hz): {{ Math.round(bass * 100) }} % · Beat-Impulse: {{ beats }}</p>
    <div v-if="active" class="beat" :class="{ hit: beatFlash }">BASS / BEAT</div>
    <label v-if="active">Empfindlichkeit: {{ sensitivity.toFixed(1) }} × <input v-model.number="sensitivity" type="range" min="1.2" max="3.5" step="0.1" /></label>
    <div class="meter"><div :style="{ width: Math.round(level * 100) + '%' }"></div></div>
    <p v-if="active">Bewegt sich der Balken zur Musik? Stoppt Spotify oder verändert sich der Ton? Bitte beobachte beides.</p>
    <a href="/spotify-status">Zurück zum Spotify-Status</a>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";

const status = ref("Noch nicht gestartet.");
const active = ref(false);
const level = ref(0);
const bass = ref(0);
const beats = ref(0);
const beatFlash = ref(false);
const sensitivity = ref(1.8);
let baseline = 0;
let lastBeat = 0;
let stream: MediaStream | null = null;
let context: AudioContext | null = null;
let frame = 0;

async function start() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      status.value = "Mikrofonzugriff wird von diesem Browser nicht unterstützt.";
      return;
    }
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false
    });
    context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    await context.resume();
    const data = new Uint8Array(analyser.fftSize);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    analyser.smoothingTimeConstant = 0.45;
    active.value = true;
    status.value = "Mikrofon aktiv. Läuft Spotify weiter? Der Balken zeigt das aufgenommene Signal.";
    function update() {
      if (!active.value) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const sample of data) {
        const x = (sample - 128) / 128;
        sum += x * x;
      }
      level.value = Math.min(1, Math.sqrt(sum / data.length) * 5);
      analyser.getByteFrequencyData(spectrum);
      const binHz = context!.sampleRate / analyser.fftSize;
      const start = Math.max(1, Math.ceil(35 / binHz));
      const end = Math.min(spectrum.length - 1, Math.floor(140 / binHz));
      let energy = 0;
      for (let i = start; i <= end; i++) energy += spectrum[i] * spectrum[i];
      const currentBass = end >= start ? Math.sqrt(energy / (end - start + 1)) / 255 : 0;
      bass.value = Math.min(1, currentBass);
      baseline = baseline ? baseline * 0.97 + currentBass * 0.03 : currentBass;
      const now = performance.now();
      const isBeat = currentBass > 0.09 && currentBass > baseline * sensitivity.value && now - lastBeat > 220;
      if (isBeat) { beats.value++; lastBeat = now; }
      beatFlash.value = now - lastBeat < 130;
      frame = requestAnimationFrame(update);
    }
    update();
  } catch (error) {
    stop();
    status.value = error instanceof Error ? "Mikrofon nicht verfügbar: " + error.message : "Mikrofon konnte nicht gestartet werden.";
  }
}
function stop() {
  active.value = false;
  cancelAnimationFrame(frame);
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  if (context) void context.close();
  context = null;
  level.value = 0;
  bass.value = 0;
  beats.value = 0;
  beatFlash.value = false;
  baseline = 0;
  lastBeat = 0;
  status.value = "Test beendet.";
}
onBeforeUnmount(stop);
</script>

<style scoped>
.audio-test { max-width: 640px; min-height: 100vh; margin: 0 auto; padding: 3rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; color: white; background: #12131b; }
button { padding: .8rem 1rem; border-radius: .6rem; background: #48d9a0; color: #111; font-weight: bold; }
button:disabled { opacity: .45; }
.meter { height: 22px; border: 1px solid #777; border-radius: 5px; overflow: hidden; }
.meter > div { height: 100%; background: #48d9a0; transition: width 80ms linear; }
a { color: #86c7ff; }
.beat { padding: 2rem; border-radius: 1rem; text-align: center; background: #24283a; transition: background 80ms; font-size: 1.5rem; font-weight: bold; }
.beat.hit { background: #2cb97f; color: #101510; }
input[type="range"] { width: 100%; }
</style>