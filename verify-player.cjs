const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const html = fs.readFileSync("index.html", "utf8");
const source = fs.readFileSync("assets/player.js", "utf8");
new vm.Script(source);
function harness({
  reduced = false,
  rejectPlay = false,
  hosted = false,
  emptyLocal = false,
} = {}) {
  const elements = {},
    events = {},
    timers = new Map();
  let now = 100,
    id = 0;
  for (const [, name] of html.matchAll(/id="([^"]+)"/g))
    elements[name] = {
      hidden: false,
      disabled: false,
      textContent: "",
      attrs: {},
      events: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      toggleAttribute(k, force) {
        if (force) this.attrs[k] = "";
        else delete this.attrs[k];
      },
      removeAttribute(k) {
        delete this[k];
      },
      addEventListener(k, fn) {
        this.events[k] = fn;
      },
      focus() {
        this.focused = true;
      },
    };
  Object.assign(elements.video, {
    paused: true,
    ended: false,
    currentTime: 0,
    playCalls: 0,
    load() {},
    pause() {
      this.paused = true;
    },
    async play() {
      this.playCalls++;
      if (rejectPlay) throw Error("blocked");
      this.paused = false;
    },
  });
  const motion = {
    matches: reduced,
    addEventListener(k, fn) {
      this.change = fn;
    },
  };
  const document = {
    hidden: false,
    fullscreenEnabled: true,
    documentElement: { requestFullscreen: async () => {} },
    getElementById: (id) => elements[id],
    addEventListener: (k, fn) => (events[k] = fn),
    createElement: () => ({ setAttribute() {}, addEventListener() {} }),
    body: { append() {} },
    querySelector: () => ({ append() {} }),
  };
  const ctx = vm.createContext({
    document,
    window: { addEventListener: (k, fn) => (events["window:" + k] = fn) },
    URL,
    AbortController,
    location: {
      href: hosted ? "https://example.test/" : "file:///C:/showroom/index.html",
      protocol: hosted ? "https:" : "file:",
    },
    matchMedia: () => motion,
    performance: { now: () => now },
    setTimeout: (fn, ms) => {
      timers.set(++id, { fn, ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    setInterval: () => 0,
    fetch: async () => {
      throw Error("offline");
    },
  });
  vm.runInContext(source, ctx);
  if (!hosted && !emptyLocal)
    vm.runInContext(
      "localData=" +
        fs.readFileSync("media/playlist.json", "utf8") +
        ";update(true)",
      ctx,
    );
  return {
    elements,
    events,
    timers,
    document,
    motion,
    run: (s) => vm.runInContext(s, ctx),
    advance: (ms) => (now += ms),
    flush: async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}
(async () => {
  let h = harness();
  await h.flush();
  assert.equal(h.elements.video.paused, false, "autoplay starts");
  h.elements.video.onloadeddata();
  assert.equal(h.elements.notice.hidden, true, "loading clears when ready");
  h.elements.video.currentTime = 12;
  h.elements.toggle.onclick();
  assert.equal(h.elements.video.paused, true);
  h.elements.toggle.onclick();
  await h.flush();
  assert.equal(
    h.elements.video.currentTime,
    12,
    "resume retains video position",
  );
  h.elements.next.onclick();
  assert.equal(h.elements.counter.textContent, "2 / 5");
  h.elements.previous.onclick();
  assert.equal(h.elements.counter.textContent, "1 / 5");
  h.elements.previous.onclick();
  assert.equal(h.elements.counter.textContent, "5 / 5", "previous wraps");
  h.elements.video.onloadeddata();
  h.document.hidden = true;
  h.events.visibilitychange();
  assert.equal(h.elements.video.paused, true);
  h.document.hidden = false;
  h.events.visibilitychange();
  await h.flush();
  assert.equal(h.elements.video.paused, false);
  h.elements.offers.events.click();
  assert.equal(h.elements.video.paused, true, "offer link suspends player");
  h.events["window:focus"]();
  await h.flush();
  assert.equal(h.elements.video.paused, false);
  h.events.keydown({ key: "Tab" });
  assert.equal(
    h.elements.video.paused,
    true,
    "keyboard navigation pauses rotation",
  );
  const stale = h.elements.video.onloadeddata;
  h.elements.next.onclick();
  stale();
  assert.equal(h.run("ready"), false, "stale media events are ignored");
  h.elements.video.onerror();
  assert.equal(h.elements.retry.hidden, false);
  h.elements.retry.onclick();
  assert.equal(h.run("failedCurrent"), false, "retry resets failed item");
  h = harness({ reduced: true });
  await h.flush();
  assert.equal(
    h.elements.video.playCalls,
    0,
    "reduced motion disables autoplay",
  );
  h.elements.video.onloadeddata();
  assert.equal(h.elements.notice.hidden, true, "paused poster available");
  h = harness({ rejectPlay: true });
  await h.flush();
  assert.equal(
    h.elements.resume.hidden,
    false,
    "autoplay rejection offers start button",
  );
  assert.equal(h.run("paused"), true);
  h = harness();
  await h.flush();
  h.run(
    "localData=[{file:'a.jpg',type:'image',seconds:10},{file:'b.jpg',type:'image',seconds:10}];update(true)",
  );
  await h.flush();
  h.elements.image.onload();
  h.advance(4000);
  h.elements.toggle.onclick();
  assert.equal(
    h.run("remaining"),
    6000,
    "photo pause preserves remaining time",
  );
  h.elements.toggle.onclick();
  assert.ok(
    [...h.timers.values()].some((t) => t.ms === 6000),
    "photo resumes remaining duration",
  );
  h.elements.next.onclick();
  h.elements.image.onload();
  const rotation = [...h.timers.values()].find((t) => t.ms === 10000);
  rotation.fn();
  assert.equal(
    h.elements.counter.textContent,
    "1 / 2",
    "photos rotate and wrap",
  );
  h.run("localData=[];update(true)");
  await h.flush();
  assert.equal(h.elements.next.disabled, true);
  assert.equal(h.elements.retry.hidden, false, "empty playlist has recovery");
  h = harness({ hosted: true });
  await h.flush();
  assert.equal(h.elements.retry.hidden, false, "network failure has retry");
  assert.match(h.elements.message.textContent, /Verbindung/);
  h = harness({ emptyLocal: true });
  await h.flush();
  assert.equal(
    h.elements.video.playCalls,
    0,
    "local mode waits for a playlist",
  );
  assert.match(h.elements.message.textContent, /Wiedergabeliste/);
  assert.equal(h.elements["choose-playlist"].hidden, false);
  const picker = h.elements["playlist-file"];
  picker.files = [
    { text: async () => fs.readFileSync("media/playlist.json", "utf8") },
  ];
  await picker.onchange();
  assert.equal(
    h.elements.counter.textContent,
    "1 / 5",
    "local JSON import starts playback",
  );
  h.elements.toggle.onclick();
  assert.ok(
    "hidden" in h.elements["pause-icon"].attrs,
    "pause icon hides while paused",
  );
  assert.ok(
    !("hidden" in h.elements["play-icon"].attrs),
    "play icon appears while paused",
  );
  const before = h.run("signature");
  for (const invalid of [
    "broken JSON",
    "{}",
    '[{"file":"1.mp4","type":"unknown"}]',
  ]) {
    picker.files = [{ text: async () => invalid }];
    await picker.onchange();
    assert.equal(
      h.run("signature"),
      before,
      "invalid import preserves working playlist",
    );
    assert.match(h.elements.feedback.textContent, /nicht geöffnet/);
  }
  assert.match(
    html,
    /<a\s+id="offers"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
  );
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size, "unique IDs");
  for (const item of JSON.parse(fs.readFileSync("media/playlist.json", "utf8")))
    assert.ok(fs.existsSync("media/" + item.file));
  console.log(
    "PASS: syntax, video pause/resume, navigation/wrap, hidden-tab suspension, offer-link suspension, keyboard pause, stale events, failure/retry, reduced motion, blocked autoplay, image timing/rotation, empty playlist, network failure, link attributes, media files.",
  );
})();
