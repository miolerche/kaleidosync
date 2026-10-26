<template>
  <main class="player">
    <header><h1>Kaleidosync · Präzisionsplayer</h1><p>Musik direkt abspielen und ihre tatsächlichen Bassfrequenzen analysieren – ohne Mikrofon.</p></header>
    <section class="controls">
      <label>Musikdateien auswählen <input type="file" accept="audio/*" multiple @change="addFiles"></label>
      <form @submit.prevent="addUrl"><label>Direkte Audio-URL (MP3, OGG usw.) <input v-model="urlInput" type="url" placeholder="https://example.org/song.mp3" required></label><button>URL hinzufügen</button></form>
      <p class="hint">Streaming funktioniert nur bei erlaubten direkten Audio-URLs mit passenden CORS-Headern. Spotify- und SoundCloud-Seitenlinks sind keine Audio-URLs.</p>
    </section>
    <canvas ref="canvas" width="800" height="400" aria-label="Musikreaktive Bassvisualisierung"></canvas>
    <section class="controls">
      <h2>{{ current?.name || "Noch kein Titel ausgewählt" }}</h2>
      <div class="buttons"><button @click="previous" :disabled="!queue.length">◀◀</button><button @click="toggle" :disabled="!current">{{ playing ? "Pause" : "Abspielen" }}</button><button @click="next" :disabled="!queue.length">▶▶</button></div>
      <input type="range" min="0" :max="duration || 1" step=".1" :value="position" @input="seek" :disabled="!duration" aria-label="Wiedergabeposition">
      <p>{{ formatTime(position) }} / {{ formatTime(duration) }} · Bass {{ Math.round(bass * 100) }} % · Beat-Impulse {{ beats }}</p>
      <label>Empfindlichkeit <input v-model.number="sensitivity" type="range" min="1.1" max="3.5" step=".1"> {{ sensitivity.toFixed(1) }}×</label>
      <p v-if="error" role="alert">{{ error }}</p>
    </section>
    <section class="controls"><h2>Warteschlange</h2><p v-if="!queue.length">Noch keine Titel hinzugefügt.</p>
      <ol><li v-for="(item, index) in queue" :key="item.id"><button @click="playIndex(index)" :aria-label="'Titel abspielen: ' + item.name">{{ index === selected ? "♫ " : "" }}{{ item.name }}</button><button @click="move(index,-1)" :disabled="index===0" aria-label="Nach oben">↑</button><button @click="move(index,1)" :disabled="index===queue.length-1" aria-label="Nach unten">↓</button><button @click="remove(index)" aria-label="Entfernen">×</button></li></ol>
    </section>
    <audio ref="audio" playsinline crossorigin="anonymous" @timeupdate="syncTime" @loadedmetadata="syncTime" @ended="next" @play="playing=true" @pause="playing=false" @error="onAudioError"></audio>
    <a href="/visualizer">Zurück zu Kaleidosync</a>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
type Item = { id: number; name: string; src: string; local: boolean };
const queue = ref<Item[]>([]);
const selected = ref(-1);
const current = computed(() => queue.value[selected.value] || null);
const audio = ref<HTMLAudioElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const urlInput = ref("");
const error = ref("");
const playing = ref(false);
const position = ref(0);
const duration = ref(0);
const bass = ref(0);
const beats = ref(0);
const sensitivity = ref(1.6);
let counter = 0, ctx: AudioContext | null = null, analyser: AnalyserNode | null = null, frame = 0, lastBeat = 0, baseline = 0;
function addFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (const file of Array.from(files)) queue.value.push({ id: ++counter, name: file.name, src: URL.createObjectURL(file), local: true });
  if (selected.value < 0 && queue.value.length) void playIndex(0);
  (e.target as HTMLInputElement).value = "";
}
function addUrl() {
  try {
    const u = new URL(urlInput.value);
    if (u.protocol !== "https:") throw new Error("Nur HTTPS-Audio-URLs sind erlaubt.");
    queue.value.push({ id: ++counter, name: decodeURIComponent(u.pathname.split("/").pop() || u.hostname), src: u.href, local: false });
    urlInput.value = "";
    if (selected.value < 0) void playIndex(0);
  } catch (e) { error.value = e instanceof Error ? e.message : "Ungültige URL"; }
}
async function prepare() {
  if (!audio.value) return;
  if (!ctx) {
    ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio.value);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = .5;
    source.connect(analyser);
    analyser.connect(ctx.destination);
  }
  if (ctx.state !== "running") await ctx.resume();
}
async function playIndex(index: number) {
  if (!audio.value || !queue.value[index]) return;
  error.value = "";
  selected.value = index;
  audio.value.src = queue.value[index].src;
  audio.value.load();
  try { await prepare(); await audio.value.play(); } catch (e) { error.value = "Wiedergabe nicht möglich: " + (e instanceof Error ? e.message : String(e)); }
}
async function toggle() {
  if (!audio.value || !current.value) return;
  if (!audio.value.paused) audio.value.pause();
  else { try { await prepare(); await audio.value.play(); } catch (e) { error.value = String(e); } }
}
function next() { if (queue.value.length) void playIndex((selected.value + 1) % queue.value.length); }
function previous() { if (queue.value.length) void playIndex((selected.value - 1 + queue.value.length) % queue.value.length); }
function move(index: number, direction: number) {
  const to = index + direction;
  if (to < 0 || to >= queue.value.length) return;
  const id = current.value?.id;
  const [item] = queue.value.splice(index, 1);
  queue.value.splice(to, 0, item);
  selected.value = queue.value.findIndex(x => x.id === id);
}
function remove(index: number) {
  const item = queue.value[index];
  const wasCurrent = index === selected.value;
  queue.value.splice(index, 1);
  if (item.local) URL.revokeObjectURL(item.src);
  if (wasCurrent) {
    audio.value?.pause();
    selected.value = -1;
    if (queue.value.length) void playIndex(Math.min(index, queue.value.length - 1));
    else if (audio.value) audio.value.removeAttribute("src");
  } else if (index < selected.value) selected.value--;
}
function syncTime() { position.value = audio.value?.currentTime || 0; duration.value = Number.isFinite(audio.value?.duration) ? audio.value!.duration : 0; }
function seek(e: Event) { if (audio.value) audio.value.currentTime = Number((e.target as HTMLInputElement).value); }
function formatTime(t: number) { return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2,"0")}`; }
function onAudioError() { error.value = "Audiodatei nicht erreichbar oder Format nicht unterstützt. Bei Online-URLs auch CORS prüfen."; }
function render() {
  frame = requestAnimationFrame(render);
  const element = canvas.value, context = element?.getContext("2d");
  if (!element || !context) return;
  const w = element.width, h = element.height;
  context.fillStyle = "#090b19"; context.fillRect(0,0,w,h);
  const spectrum = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
  if (spectrum && analyser && ctx && audio.value && !audio.value.paused) {
    analyser.getByteFrequencyData(spectrum);
    const hz = ctx.sampleRate / analyser.fftSize;
    const start = Math.max(1,Math.ceil(35/hz)), end = Math.min(spectrum.length-1,Math.floor(140/hz));
    let energy = 0;
    for (let i=start;i<=end;i++) energy += spectrum[i]*spectrum[i];
    bass.value = end>=start ? Math.sqrt(energy/(end-start+1))/255 : 0;
    baseline = baseline ? baseline*.96 + bass.value*.04 : bass.value;
    const now = performance.now();
    if (bass.value > .09 && bass.value > baseline*sensitivity.value && now-lastBeat > 220) { beats.value++; lastBeat=now; }
  } else { bass.value *= .7; baseline *= .98; }
  const pulse = Math.max(0,1-(performance.now()-lastBeat)/260);
  const radius = 45 + bass.value*170 + pulse*60;
  const gradient = context.createRadialGradient(w/2,h/2,8,w/2,h/2,radius*2);
  gradient.addColorStop(0,"rgba(115,255,219,.95)"); gradient.addColorStop(.3,"rgba(67,110,255,.65)"); gradient.addColorStop(1,"rgba(40,12,90,0)");
  context.fillStyle=gradient; context.beginPath(); context.arc(w/2,h/2,radius*2,0,Math.PI*2); context.fill();
  context.strokeStyle="#a8ffe8"; context.lineWidth=2+bass.value*18;
  for(let ring=0;ring<5;ring++){ context.beginPath();context.arc(w/2,h/2,radius*(.45+ring*.24),0,Math.PI*2);context.stroke(); }
  if(spectrum){ const bars=48; for(let i=0;i<bars;i++){const idx=Math.min(spectrum.length-1,Math.floor(i*spectrum.length/bars/4));const v=spectrum[idx]/255;context.fillStyle="rgba(114,255,205,.65)";context.fillRect(i*w/bars,h-v*h*.35,w/bars-3,v*h*.35);}}
}
onMounted(() => { render(); });
onBeforeUnmount(() => { cancelAnimationFrame(frame); audio.value?.pause(); queue.value.filter(x=>x.local).forEach(x=>URL.revokeObjectURL(x.src)); if(ctx) void ctx.close(); });
</script>
<style scoped>
.player{min-height:100vh;background:#0a0b17;color:#f5f6ff;padding:2rem;display:grid;gap:1rem;font-family:system-ui,sans-serif}
header,.controls{max-width:850px;width:100%;margin:auto}.controls{background:#191b30;padding:1rem;border-radius:1rem}
canvas{width:min(100%,850px);height:auto;margin:auto;border-radius:1rem}
button,input{font:inherit}button{padding:.5rem .8rem;margin:.15rem;border:0;border-radius:.5rem;background:#8fe6c4;color:#111;cursor:pointer}button:disabled{opacity:.4}
input[type="url"]{display:block;width:100%;padding:.6rem;margin:.5rem 0;background:white;color:#111;border-radius:.4rem}
input[type="range"]{width:100%}ol{padding-left:1.5rem}li{margin:.4rem 0}li button:first-child{max-width:60%;overflow-wrap:anywhere;text-align:left}
.buttons{display:flex;justify-content:center}.hint{opacity:.75;font-size:.9rem}a{color:#9fd9ff}
</style>
