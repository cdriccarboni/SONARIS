const STORAGE_KEY = "sonaris-project-v1";
const state = load();
let audioUrl = null;

const $ = (id) => document.getElementById(id);
const player = $("player");
const projectName = $("projectName");
const noteText = $("noteText");

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
      name: "Nouveau projet SONARIS",
      annotations: []
    };
  } catch {
    return { name: "Nouveau projet SONARIS", annotations: [] };
  }
}

function save() {
  state.name = projectName.value.trim() || "Nouveau projet SONARIS";
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 10);
  return `${m}:${String(s).padStart(2,"0")}.${ms}`;
}

function render() {
  projectName.value = state.name;
  const list = $("annotations");
  list.innerHTML = "";
  $("emptyState").hidden = state.annotations.length > 0;

  state.annotations
    .slice()
    .sort((a,b) => a.time - b.time)
    .forEach((annotation) => {
      const li = document.createElement("li");
      li.className = "annotation-row";
      const time = document.createElement("button");
      time.className = "time";
      time.textContent = formatTime(annotation.time);
      time.title = "Revenir à ce repère";
      time.addEventListener("click", () => {
        player.currentTime = annotation.time;
        player.play().catch(() => {});
      });
      const note = document.createElement("span");
      note.className = "note";
      note.textContent = annotation.text;
      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.title = "Supprimer l’annotation";
      remove.addEventListener("click", () => {
        state.annotations = state.annotations.filter((item) => item.id !== annotation.id);
        save();
        render();
      });
      li.append(time,note,remove);
      list.append(li);
    });
}

function addAnnotation(time = player.currentTime) {
  const text = noteText.value.trim();
  if (!text) {
    noteText.focus();
    return;
  }
  state.annotations.push({
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    time: Number(time) || 0,
    text,
    createdAt: new Date().toISOString()
  });
  noteText.value = "";
  save();
  render();
}

$("audioFile").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = URL.createObjectURL(file);
  player.src = audioUrl;
  state.media = { name: file.name, type: file.type, size: file.size };
  save();
});

$("markBtn").addEventListener("click", () => {
  noteText.focus();
  noteText.dataset.markTime = String(player.currentTime || 0);
});

$("addBtn").addEventListener("click", () => {
  const marked = Number(noteText.dataset.markTime);
  addAnnotation(Number.isFinite(marked) ? marked : player.currentTime);
  delete noteText.dataset.markTime;
});

noteText.addEventListener("keydown", (event) => {
  if (event.key === "Enter") $("addBtn").click();
});
projectName.addEventListener("input", save);

$("exportBtn").addEventListener("click", () => {
  save();
  const payload = {
    format: "sonaris.project",
    version: 1,
    appVersion: "0.1.0",
    ...state,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (state.name || "sonaris").replace(/[^a-z0-9-_]+/gi,"-").toLowerCase() + ".sonaris.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

window.addEventListener("beforeunload", () => {
  if (audioUrl) URL.revokeObjectURL(audioUrl);
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
render();
