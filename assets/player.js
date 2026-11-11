// Wiedergabestatus und Medienwechsel werden über eine Sitzungsnummer abgesichert.
const $ = (id) => document.getElementById(id);
const video = $("video"),
  image = $("image"),
  notice = $("notice"),
  message = $("message"),
  resume = $("resume"),
  retry = $("retry");
const base = new URL("./media/", location.href),
  motion = matchMedia("(prefers-reduced-motion: reduce)");
let playlist = [],
  signature = "",
  index = 0,
  timer = null,
  loadTimer = null,
  session = 0,
  errors = 0,
  refreshing = false;
let paused = motion.matches,
  ready = false,
  failedCurrent = false,
  remaining = 0,
  started = 0,
  leaving = false;
let localData = null;
function active() {
  return !paused && !document.hidden && !leaving;
}
function controls() {
  $("previous").disabled = $("next").disabled = playlist.length < 2;
  $("toggle").disabled = !playlist.length || failedCurrent;
  $("toggle-label").textContent = paused ? "Weiter" : "Pause";
  $("pause-icon").toggleAttribute("hidden", paused);
  $("play-icon").toggleAttribute("hidden", !paused);
  $("toggle").setAttribute(
    "aria-label",
    paused ? "Wiedergabe fortsetzen" : "Wiedergabe pausieren",
  );
  $("counter").textContent = playlist.length
    ? index + 1 + " / " + playlist.length
    : "– / –";
  $("counter").setAttribute(
    "aria-label",
    playlist.length
      ? "Angebot " + (index + 1) + " von " + playlist.length
      : "Noch keine Angebote",
  );
}
function show(text, action) {
  message.textContent = text;
  notice.hidden = false;
  resume.hidden = action !== "resume";
  retry.hidden = action !== "retry";
}
function clearNotice() {
  notice.hidden = true;
  resume.hidden = retry.hidden = true;
  $("stage").setAttribute("aria-busy", "false");
}
function clearMedia() {
  clearTimeout(timer);
  clearTimeout(loadTimer);
  timer = null;
  started = 0;
  video.onended =
    video.onerror =
    video.onloadeddata =
    video.onplaying =
    video.onwaiting =
    video.onstalled =
      null;
  image.onload = image.onerror = null;
  video.pause();
  video.removeAttribute("src");
  video.load();
  image.removeAttribute("src");
  video.hidden = image.hidden = true;
  ready = false;
}
function watchLoad(ticket) {
  clearTimeout(loadTimer);
  loadTimer = setTimeout(() => failed(ticket), 25000);
}
function failed(ticket) {
  if (ticket !== session || failedCurrent) return;
  failedCurrent = true;
  errors++;
  clearMedia();
  $("stage").setAttribute("aria-busy", "false");
  show(
    "Dieses Angebot ist gerade nicht verfügbar. Bitte versuchen Sie es erneut.",
    "retry",
  );
  controls();
  if (active() && playlist.length > 1 && errors < playlist.length)
    timer = setTimeout(() => play(index + 1), 5000);
}
function scheduleImage() {
  clearTimeout(timer);
  timer = null;
  if (!active() || !ready || failedCurrent) return;
  started = performance.now();
  timer = setTimeout(
    () => {
      started = 0;
      play(index + 1);
    },
    Math.max(1, remaining),
  );
}
function suspend() {
  if (started) {
    remaining = Math.max(0, remaining - (performance.now() - started));
    started = 0;
  }
  clearTimeout(timer);
  timer = null;
  video.pause();
  if (ready && !failedCurrent) {
    clearTimeout(loadTimer);
    clearNotice();
  }
}
async function startVideo(ticket) {
  if (!active()) return;
  try {
    await video.play();
    if (ticket !== session) return;
    if (!active()) {
      video.pause();
      return;
    }
    if (ready) clearNotice();
  } catch (error) {
    if (ticket !== session || error.name === "AbortError") return;
    clearTimeout(loadTimer);
    paused = true;
    controls();
    show("Tippen Sie, um die Wiedergabe zu starten.", "resume");
    $("stage").setAttribute("aria-busy", "false");
  }
}
function play(next = 0) {
  const ticket = ++session;
  clearMedia();
  failedCurrent = false;
  if (!playlist.length) {
    show(
      "Zurzeit sind keine Angebote verfügbar. Bitte versuchen Sie es später erneut.",
      "retry",
    );
    $("stage").setAttribute("aria-busy", "false");
    controls();
    return;
  }
  index = (next + playlist.length) % playlist.length;
  const item = playlist[index];
  remaining = item.seconds * 1000;
  controls();
  $("stage").setAttribute("aria-busy", "true");
  show("Angebot wird geladen …");
  watchLoad(ticket);
  if (item.type === "video") {
    video.hidden = false;
    video.src = item.url;
    video.onloadeddata = () => {
      if (ticket !== session) return;
      ready = true;
      errors = 0;
      clearTimeout(loadTimer);
      clearNotice();
      if (!active()) video.pause();
    };
    video.onplaying = () => {
      if (ticket !== session) return;
      if (!active()) {
        video.pause();
        return;
      }
      ready = true;
      errors = 0;
      clearTimeout(loadTimer);
      clearNotice();
    };
    video.onwaiting = video.onstalled = () => {
      if (ticket !== session || !active()) return;
      $("stage").setAttribute("aria-busy", "true");
      show("Video wird geladen …");
      watchLoad(ticket);
    };
    video.onended = () => {
      if (ticket === session && active()) play(index + 1);
    };
    video.onerror = () => failed(ticket);
    if (active()) startVideo(ticket);
  } else {
    image.alt = item.alt || "Angebot " + (index + 1) + " von Autohaus DIL";
    image.onload = () => {
      if (ticket !== session) return;
      ready = true;
      errors = 0;
      clearTimeout(loadTimer);
      clearNotice();
      scheduleImage();
    };
    image.onerror = () => failed(ticket);
    image.hidden = false;
    image.src = item.url;
  }
}
function continuePlayback() {
  if (!active() || !playlist.length || failedCurrent) return;
  if (playlist[index].type === "video") {
    if (video.ended) play(index + 1);
    else startVideo(session);
  } else scheduleImage();
}
function setPaused(value) {
  paused = value;
  if (paused) suspend();
  else {
    leaving = false;
    continuePlayback();
  }
  controls();
}
function normalizePlaylist(data) {
  if (!Array.isArray(data)) throw Error();
  return data.map((item) => {
    if (!item || typeof item.file !== "string") throw Error();
    const url = new URL(item.file, base);
    if (
      !["https:", "http:"].includes(url.protocol) &&
      !(location.protocol === "file:" && url.protocol === "file:")
    )
      throw Error();
    const type =
      item.type || (/\.(mp4|webm)$/i.test(url.pathname) ? "video" : "image");
    if (!["video", "image"].includes(type)) throw Error();
    return {
      url: url.href,
      type,
      seconds: Math.max(3, Math.min(300, Number(item.seconds) || 10)),
      alt: typeof item.alt === "string" ? item.alt : "",
    };
  });
}
async function update(force = false) {
  if (refreshing) return;
  refreshing = true;
  try {
    let data = localData;
    if (location.protocol === "file:" && data === null) {
      show("Bitte öffnen Sie die Wiedergabeliste aus dem Ordner media.");
      $("stage").setAttribute("aria-busy", "false");
      return;
    }
    if (location.protocol !== "file:") {
      const controller = new AbortController(),
        timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(new URL("playlist.json", base), {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw Error();
        data = await response.json();
      } finally {
        clearTimeout(timeout);
      }
    }
    if (!Array.isArray(data)) throw Error();
    const next = normalizePlaylist(data);
    const nextSignature = JSON.stringify(next);
    if (nextSignature !== signature || force) {
      if (!force && paused && playlist.length) return;
      const current = playlist[index]?.url;
      playlist = next;
      signature = nextSignature;
      errors = 0;
      play(
        force
          ? index
          : Math.max(
              0,
              next.findIndex((item) => item.url === current),
            ),
      );
    }
  } catch {
    if (!playlist.length) {
      $("stage").setAttribute("aria-busy", "false");
      show(
        "Die Angebote konnten nicht geladen werden. Bitte prüfen Sie die Verbindung und versuchen Sie es erneut.",
        "retry",
      );
    }
  } finally {
    refreshing = false;
    controls();
  }
}
$("previous").onclick = () => {
  errors = 0;
  play(index - 1);
};
$("next").onclick = () => {
  errors = 0;
  play(index + 1);
};
$("toggle").onclick = () => setPaused(!paused);
resume.onclick = () => {
  setPaused(false);
  $("toggle").focus();
};
retry.onclick = () => {
  errors = 0;
  if (playlist.length) {
    play(index);
    $("toggle").focus();
  } else {
    show("Angebote werden geladen …");
    update(true);
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) suspend();
  else {
    leaving = false;
    continuePlayback();
  }
});
$("offers").addEventListener("click", () => {
  leaving = true;
  suspend();
});
window.addEventListener("focus", () => {
  if (leaving) {
    leaving = false;
    continuePlayback();
  }
});
document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Tab" && !paused) setPaused(true);
  },
  true,
);
motion.addEventListener("change", (event) => {
  if (event.matches) setPaused(true);
});
const fullscreen = $("fullscreen");
if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen)
  fullscreen.hidden = true;
fullscreen.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    $("feedback").textContent =
      "Vollbild ist in diesem Browser gerade nicht verfügbar.";
  }
};
document.addEventListener("fullscreenchange", () => {
  const text = document.fullscreenElement
    ? "Vollbild beenden"
    : "Vollbild starten";
  fullscreen.title = text;
  fullscreen.setAttribute("aria-label", text);
  fullscreen.setAttribute("aria-pressed", String(!!document.fullscreenElement));
});
if (location.protocol === "file:") {
  const picker = $("playlist-file");
  const choose = $("choose-playlist");
  choose.hidden = false;
  choose.onclick = () => picker.click();
  picker.onchange = async () => {
    const file = picker.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      normalizePlaylist(data);
      localData = data;
      await update(true);
      $("feedback").textContent = "Wiedergabeliste wurde geladen.";
    } catch {
      $("feedback").textContent =
        "Diese Wiedergabeliste konnte nicht geöffnet werden.";
    }
    picker.value = "";
  };
}
controls();
update();
setInterval(update, 60000);
