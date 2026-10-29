/* DOG — dance/sing/sleep states, love notes, achievements, treats, secrets, lyrics */

/* =====================================================
   DOG: dances, "sings", reacts, sleeps  +  love notes, achievements, keyboard
===================================================== */
var DOG = { idle: 'assets/dog/idle.png', sing: 'assets/dog/sing.png', hum: 'assets/dog/hum.png', sleep: 'assets/dog/sleep.gif', rose: 'assets/dog/rose.png', eat: 'assets/dog/eat.gif', rosedance: 'assets/dog/rosedance.gif', walk: 'assets/dog/walk.gif', sit: 'assets/dog/sit.gif', hop: null };
/* Own sprites? put the file next to this html and set e.g.  DOG.sleep = 'dog_sleep.png';  DOG.hop = 'dog_hop.png'; */

/* Love notes: per-track via  NOTES[0] = "..."  or a  note:"..."  field on the track. Otherwise these play in order. */
var NOTES = { /* 0: "your own note for track 1", 1: "...", */ };
var DEFAULT_NOTES = [
  "this one's for you.", "i hope this makes you smile.", "every song here reminds me of you.",
  "press play and stay a while.", "you are my favorite echo.", "play this one when you miss me.",
  "some songs sound like you.", "thank you for listening."
];
/* Synced lyrics (optional, add your own):  lyr:[[0,"first line"],[12,"second line"]]  on a track = [seconds, text] */

var sp = $('s-player'), dog = $('dog'), dogWrap = $('dog-wrap'), fx = $('dog-fx'), bubble = $('dog-bubble');
var dogState = 'idle', idleSince = performance.now(), lastFx = 0, lastZ = 0, bubbleT = null, bpm = 110, noteOpen = false, noteT = null;
var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
var FXC = ['#ff8fb8', '#c9a0ff', '#ffcfa0'];
var PAL = [[255,76,138],[168,110,255],[70,210,190],[255,180,70],[90,150,255],[255,130,100],[150,225,100],[230,80,220]];

var store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
var heard = store.get('eoy_heard', {}), unlocked = store.get('eoy_ach', {}), pets = store.get('eoy_pets', 0), secretFound = store.get('eoy_secret', 0);

/* ---- accessories (unlock by listening) ---- */
var ACC = [
  { id: 'band', only: 'sleep', x: 200, y: 40, w: 32, src: 'assets/acc/band.png' }
]; 
var accLayer = $('dog-acc'), accLv = 0, gifT0 = 0;
ACC.forEach(function (a) { var im = new Image(); im.src = a.src; im.alt = ''; im.style.width = (a.w * 21 / 1300 * 100).toFixed(3) + '%'; accLayer.appendChild(im); a.el = im; a.l = ''; a.t = ''; });
function accLevel() { var n = heardCount(); return ACC.filter(function (a) { return n >= (a.need === 'all' ? TRACKS.length : a.need); }).length; }
function syncAcc(announce) {
  var lv = accLevel();
  ACC.forEach(function (a) { a.on = true; });
  
  accLv = lv;
}
syncAcc(false);
dog.addEventListener('load', function () { gifT0 = performance.now(); });
/* where the head is, per pose (matches how each gif was rendered) */
function accBasis(now) {
  var pose = roseOn ? (ovrKey === 'rosedance' ? 'none' : 'still') : dogState;
  if (pose === 'sing' || pose === 'singmic') return { dx: 180, dy: 24 };
  if (pose === 'still') return { dx: 180, dy: 24 };
  if (pose === 'sleep') {
    var j = Math.floor((now - gifT0) / 120) % 28, ph = 2 * Math.PI * j / 28, f = .46 + .035 * Math.sin(ph - 1.2);
    var nod = Math.floor(8 * (.5 + .5 * Math.sin(ph - 1.2))), by = 980 - Math.floor(456 * f) + 10;
    return { dx: 181, dy: by + nod - 626 };
  }
  return null;
}
function updateAcc(now) {
  var b = accBasis(now);
  if (!b) { accLayer.style.display = 'none'; return; }
  accLayer.style.display = 'block';
  ACC.forEach(function (a) {
    var vis = a.on && (!a.only || (a.only === 'sleep' && !roseOn && dogState === 'sleep'));
    if (a.vis !== vis) { a.el.style.display = vis ? 'block' : 'none'; a.vis = vis; }
    if (!vis) return;
    var l = ((a.x + b.dx) / 1300 * 100).toFixed(3) + '%', t = ((a.y + b.dy) / 944 * 100).toFixed(3) + '%';
    if (a.l !== l) { a.el.style.left = l; a.l = l; } if (a.t !== t) { a.el.style.top = t; a.t = t; }
  });
}
var humOn = false, humNext = 0; (new Image()).src = DOG.hum; (new Image()).src = DOG.sing;
function srcForState() { if (dogState === 'sing' || dogState === 'singmic') return humOn ? DOG.hum : DOG.sing; if (dogState === 'idle') return behSprite(); return DOG[dogState] || DOG.idle; }
var roseOn = false, roseT = null, stretchT = null, snoreT = null;
/* chorus -> mic. Exact times per track: add  chorus:[[start,end],[start,end]]  (seconds) to a TRACKS entry.
   Without it the dog uses a rough guess (about the 27-43% and 60-80% marks of the song). */
function inChorus() {
  var T = TRACKS[curTrack], e = elapsed, dur = T.dur;
  if (useAudio && isFinite(au.duration) && au.duration > 0) dur = au.duration;
  if (T.chorus) { for (var k = 0; k < T.chorus.length; k++) if (e >= T.chorus[k][0] && e < T.chorus[k][1]) return true; return false; }
  var f = e / dur; return (f >= .27 && f < .43) || (f >= .60 && f < .80);
}
function playPose() { return inChorus() ? 'singmic' : 'sing'; }
function setDog(st) {
  if (dogState === st) return; dogState = st;
  if (!roseOn) dog.src = srcForState();
  dogWrap.classList.toggle('sleep', st === 'sleep');
  document.body.classList.toggle('night', st === 'sleep' && sp.classList.contains('active'));
  if (st === 'sleep') { sp.style.setProperty('--glow', 'rgba(150,160,255,.55)'); sp.style.setProperty('--glow2', 'rgba(130,140,255,.25)'); startSnore(); }
  else { stopSnore(); applyTheme(curTrack); }
}
function snore() {
  try {
    if (au.muted || au.volume === 0 || !sp.classList.contains('active')) return;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') { ac.resume(); return; }
    var t0 = ac.currentTime;
    [[0, .6, 150, 100], [.85, 1.0, 112, 62]].forEach(function (p) {
      var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), s0 = t0 + p[0];
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 340;
      o.frequency.setValueAtTime(p[2], s0); o.frequency.exponentialRampToValueAtTime(p[3], s0 + p[1]);
      g.gain.setValueAtTime(.0001, s0); g.gain.exponentialRampToValueAtTime(.03, s0 + p[1] * .4); g.gain.exponentialRampToValueAtTime(.0001, s0 + p[1]);
      o.connect(f); f.connect(g); g.connect(ac.destination); o.start(s0); o.stop(s0 + p[1] + .05);
    });
  } catch (e) {}
}
function startSnore() { stopSnore(); snoreT = setInterval(snore, 3360); setTimeout(snore, 900); }
function stopSnore() { clearInterval(snoreT); snoreT = null; }
var ovrKey = '';
function dogOverride(key, ms, after) {
  if (!DOG[key] || reduce) return;
  roseOn = true; ovrKey = key; clearTimeout(roseT); dog.src = DOG[key];
  roseT = setTimeout(function () { roseOn = false; ovrKey = ''; dog.src = srcForState(); if (after) after(); }, ms);
}
function heartBurst(n) { for (var k = 0; k < n; k++) spawnFx('\u2665', FXC[(Math.random() * 3) | 0], '', 14 + Math.random() * 70, 20 + Math.random() * 24); }
function dogRose(ms) {
  if (!DOG.rose || reduce) return;
  wake(); dogHop(); dogOverride('rose', ms); say('for you \u2665', ms); heartBurst(7);
}
function stretchWake() {
  dogState = 'idle'; roseOn = false; dog.src = DOG.idle; dogWrap.classList.remove('sleep'); document.body.classList.remove('night');
  stopSnore(); applyTheme(curTrack);
  dogWrap.classList.remove('hop', 'shake', 'stretch'); void dogWrap.offsetWidth; dogWrap.classList.add('stretch');
  say('!', 1100); clearTimeout(stretchT);
  stretchT = setTimeout(function () {
    dogWrap.classList.remove('stretch');
    if (isPlaying && dogState === 'idle') { setDog(playPose()); say('\u266a ' + TRACKS[curTrack].t, 2600); }
  }, 1150);
}
dog.addEventListener('error', function () { if (dog.getAttribute('src') !== DOG.idle) dog.src = DOG.idle; });

function say(txt, ms) {
  bubble.firstElementChild.textContent = txt; bubble.classList.add('on');
  clearTimeout(bubbleT); bubbleT = setTimeout(function () { bubble.classList.remove('on'); }, ms || 2200);
}
function spawnFx(ch, color, cls, left, top) {
  if (reduce || fx.children.length > 26) return;
  var e = document.createElement('span'); e.className = 'fx' + (cls ? ' ' + cls : ''); e.textContent = ch; e.style.color = color;
  e.style.left = (left != null ? left : 12 + Math.random() * 74) + '%'; e.style.top = (top != null ? top : 30 + Math.random() * 28) + '%';
  e.style.setProperty('--dx', (Math.random() * 44 - 22) + 'px');
  fx.appendChild(e); setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 3100);
}
var coverCol = {};
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
  if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  function f(p, q, t) { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
  var q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [Math.round(f(p, q, h + 1 / 3) * 255), Math.round(f(p, q, h) * 255), Math.round(f(p, q, h - 1 / 3) * 255)];
}
function extractCover(id, cb) {
  var im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = function () {
    var col = null;
    try {
      var c = document.createElement('canvas'); c.width = c.height = 24; var x = c.getContext('2d');
      x.drawImage(im, 0, 0, 24, 24); var d = x.getImageData(0, 0, 24, 24).data, B = [], k;
      for (k = 0; k < 12; k++) B.push({ w: 0, r: 0, g: 0, b: 0 });
      for (k = 0; k < d.length; k += 4) {
        var hsl = rgb2hsl(d[k], d[k + 1], d[k + 2]), mx = Math.max(d[k], d[k + 1], d[k + 2]) / 255;
        if (hsl[1] < .25 || mx < .2) continue;
        var w = hsl[1] * mx, bk = B[Math.min(11, Math.floor(hsl[0] * 12))];
        bk.w += w; bk.r += d[k] * w; bk.g += d[k + 1] * w; bk.b += d[k + 2] * w;
      }
      var best = B.reduce(function (a, b) { return b.w > a.w ? b : a; });
      if (best.w > 1.5) {
        var h2 = rgb2hsl(best.r / best.w, best.g / best.w, best.b / best.w);
        col = hsl2rgb(h2[0], Math.max(h2[1], .6), Math.min(.68, Math.max(.55, h2[2])));
      }
    } catch (e) { col = null; }
    coverCol[id] = col; cb(col);
  };
  im.onerror = function () { coverCol[id] = null; cb(null); };
  im.src = 'https://i.scdn.co/image/' + id;
}
function applyTheme(i) {
  var id = TRACKS[i % TRACKS.length].i, c = coverCol[id] || PAL[i % PAL.length];
  sp.style.setProperty('--glow', 'rgba(' + c + ',.6)'); sp.style.setProperty('--glow2', 'rgba(' + c + ',.28)');
  document.body.style.setProperty('--accent', 'rgb(' + c.join(',') + ')');
  if (!(id in coverCol)) { coverCol[id] = null; extractCover(id, function (col) { if (col && curTrack === i) applyTheme(i); }); }
}
function dogHop() {
  dogWrap.classList.remove('hop', 'shake'); void dogWrap.offsetWidth; dogWrap.classList.add('hop');
  if (DOG.hop) { dog.src = DOG.hop; setTimeout(function () { dog.src = srcForState(); }, 560); }
  setTimeout(function () { dogWrap.classList.remove('hop'); }, 570);
}
function dogShake() {
  dogWrap.classList.remove('hop', 'shake'); void dogWrap.offsetWidth; dogWrap.classList.add('shake');
  setTimeout(function () { dogWrap.classList.remove('shake'); }, 380);
}
function wake() { idleSince = performance.now(); if (dogState === 'sleep') setDog(isPlaying ? playPose() : 'idle'); }

function bark() {
  try {
    if (au.muted || au.volume === 0) return;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    [0, .13].forEach(function (w, k) {
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + w;
      o.type = 'square'; o.frequency.setValueAtTime(k ? 380 : 460, t); o.frequency.exponentialRampToValueAtTime(k ? 170 : 210, t + .09);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .1);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + .12);
    });
  } catch (e) {}
}
function petDog() {
  wake(); pets++; store.set('eoy_pets', pets); dogHop();
  var msgs = ['bark!', 'woof \u2665', 'arf arf!', '*wags tail*', 'awoo~'];
  say(msgs[(Math.random() * msgs.length) | 0], 1400);
  for (var k = 0; k < 6; k++) spawnFx('\u2665', FXC[(Math.random() * 3) | 0], '', 18 + Math.random() * 64, 24 + Math.random() * 20);
  var r = dog.getBoundingClientRect();
  try { burst((r.left + r.width / 2) / PX, (r.top + r.height * .45) / PX); } catch (e) {}
  bark(); checkAch();
}
dog.addEventListener('click', petDog);
dog.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); petDog(); } });
['prev-btn', 'next-btn'].forEach(function (id) { $(id).addEventListener('click', dogShake); });
['pointerdown', 'keydown'].forEach(function (ev) { sp.addEventListener(ev, function () { idleSince = performance.now(); }, true); });

/* ---- love notes ---- */
function noteFor(i) { return TRACKS[i].note || NOTES[i] || DEFAULT_NOTES[i % DEFAULT_NOTES.length]; }
function showNote() { typeNote(noteFor(curTrack)); }
function typeNote(txt) {
  var box = $('note-box'), n = 0; clearInterval(noteT); box.textContent = '\u2665 ';
  noteT = setInterval(function () { n++; box.textContent = '\u2665 ' + txt.slice(0, n); if (n >= txt.length) clearInterval(noteT); }, 28);
}
$('note-btn').addEventListener('click', function () {
  noteOpen = !noteOpen; $('note-box').hidden = !noteOpen; this.setAttribute('aria-expanded', noteOpen ? 'true' : 'false');
  if (noteOpen) { $('note-box').textContent = '\u2665 \u2026'; dogErrand(); } else clearInterval(noteT);
});

/* ---- time of day: greeting + soft tint ---- */
function hourBand() { var h = new Date().getHours(); return h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 18 ? 'day' : h >= 18 && h < 22 ? 'eve' : 'late'; }
function setTod() { var b = hourBand(); ['morning', 'day', 'eve', 'late'].forEach(function (x) { document.body.classList.toggle('tod-' + x, x === b); }); }
setTod(); setInterval(setTod, 60000);
function greet() {
  if (isPlaying) return;
  var g = { morning: 'good morning, jasmine \u2665', day: 'good afternoon, jasmine \u2665', eve: 'good evening, jasmine \u2665', late: 'gising ka pa? \u2665' }[hourBand()];
  setTimeout(function () { if (!isPlaying) say(g, 3400); }, 900);
}

/* ---- sleep timer ---- */
var SLEEP_MIN = [0, 15, 30, 60], sleepIdx = 0, sleepEnd = 0, sleepTick = null;
function mmss(sec) { var m = Math.floor(sec / 60), r = sec % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
function restoreVol() { setVol(parseInt($('vol-slider').value, 10)); }
function sleepOff() { clearInterval(sleepTick); sleepIdx = 0; sleepEnd = 0; $('sleep-btn').textContent = 'ZZZ: OFF'; }
function sleepStep() {
  var rem = Math.ceil((sleepEnd - Date.now()) / 1000);
  if (rem <= 0) { sleepOff(); if (isPlaying) pausePlay(); else setDog('sleep'); restoreVol(); say('good night \u2665', 3400); return; }
  $('sleep-btn').textContent = 'ZZZ ' + mmss(rem);
  if (rem <= 20 && isPlaying) au.volume = Math.max(0, parseInt($('vol-slider').value, 10) / 100 * rem / 20);
}
$('sleep-btn').addEventListener('click', function () {
  sleepIdx = (sleepIdx + 1) % SLEEP_MIN.length; clearInterval(sleepTick); restoreVol();
  if (!sleepIdx) { sleepOff(); say('sleep timer off', 1300); return; }
  sleepEnd = Date.now() + SLEEP_MIN[sleepIdx] * 60000; sleepTick = setInterval(sleepStep, 1000); sleepStep();
  say('sleep in ' + SLEEP_MIN[sleepIdx] + ' min', 1600);
});

/* ---- treat (cooldown) ---- */
var TREAT_CD = 90000, treatAt = store.get('eoy_treat', 0);
function munch() {
  try {
    if (au.muted || au.volume === 0) return;
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
    [0, .17, .34, .51].forEach(function (w) {
      var o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + w + .45;
      o.type = 'square'; o.frequency.setValueAtTime(260, t0); o.frequency.exponentialRampToValueAtTime(140, t0 + .07);
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(.035, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + .08);
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + .1);
    });
  } catch (e) {}
}
function treatStep() {
  var rem = Math.ceil((treatAt + TREAT_CD - Date.now()) / 1000), b = $('treat-btn');
  if (rem > 0) { b.disabled = true; b.textContent = 'TREAT ' + mmss(rem); } else { b.disabled = false; b.innerHTML = '&#10022; TREAT'; }
}
setInterval(treatStep, 1000); treatStep();
$('treat-btn').addEventListener('click', function () {
  if (Date.now() - treatAt < TREAT_CD) return;
  treatAt = Date.now(); store.set('eoy_treat', treatAt); treatStep();
  wake(); say('a treat!', 1500); munch();
  dogOverride('eat', 2400, function () { heartBurst(6); say('yum! thank you \u2665', 2400); pets++; store.set('eoy_pets', pets); checkAch(); });
});

/* ---- secret: tap the title 5x, or type "bien" ---- */
var SECRET_NOTE = "you found it. out of every song here, you're still my favorite one. \u2665"; /* edit me */
function secret() {
  if (!playerActive()) return;
  wake(); noteOpen = true; $('note-box').hidden = false; $('note-btn').setAttribute('aria-expanded', 'true'); typeNote(SECRET_NOTE);
  dogOverride('rosedance', 6500); say('secret! \u2665', 2600); heartBurst(10);
  if (!secretFound) { secretFound = 1; store.set('eoy_secret', 1); checkAch(); }
}
var titleTaps = [], kbuf = '';
$('hero-title').addEventListener('click', function () {
  var n = performance.now(); titleTaps = titleTaps.filter(function (t) { return n - t < 3500; }); titleTaps.push(n);
  if (titleTaps.length >= 5) { titleTaps = []; secret(); }
});
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey || !e.key || e.key.length !== 1) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  kbuf = (kbuf + e.key.toLowerCase()).slice(-4);
  if (kbuf === 'bien') { kbuf = ''; secret(); }
});

/* ---- night sky: stars + shooting star (only visible while the dog sleeps) ---- */
(function () {
  var box = $('stars'); if (!box) return;
  for (var k = 0; k < 46; k++) {
    var st = document.createElement('i'); if (k % 5 === 0) st.className = 'b';
    st.style.left = (Math.random() * 100).toFixed(1) + '%'; st.style.top = (Math.random() * 64).toFixed(1) + '%';
    st.style.animationDelay = (-Math.random() * 3).toFixed(2) + 's'; st.style.animationDuration = (1.6 + Math.random() * 2) .toFixed(2) + 's';
    box.appendChild(st);
  }
  setInterval(function () {
    if (!document.body.classList.contains('night') || reduce) return;
    var sh = document.createElement('div'); sh.className = 'shoot';
    sh.style.left = (10 + Math.random() * 55).toFixed(0) + '%'; sh.style.top = (4 + Math.random() * 26).toFixed(0) + '%';
    $('night').appendChild(sh); setTimeout(function () { if (sh.parentNode) sh.parentNode.removeChild(sh); }, 1100);
  }, 8000);
})();

/* ---- synced lyrics (only for tracks that have lyr:) ---- */
var lyCur = null, lyKey = '';
function lyShow(text) {
  if (text === lyKey) return; lyKey = text;
  if (lyCur) { var o = lyCur; o.classList.add('out'); setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 950); lyCur = null; }
  if (!text) return;
  var e = document.createElement('div'); e.className = 'ly'; e.textContent = text;
  $('lyric-sky').appendChild(e); lyCur = e;
}
function dogLyric() {
  var T = TRACKS[curTrack], L = T.lyr, line = '';
  if (!isPlaying) { lyShow(''); return; }
  if (L) { for (var k = 0; k < L.length; k++) { if (L[k][0] <= elapsed) line = L[k][1]; else break; } }
  else if (elapsed % 24 < 7) line = T.t + ' \u00b7 ' + T.a;   /* no lyrics added yet: float the song name now and then */
  lyShow(line);
}

/* ---- heard counter + achievements ---- */
function heardCount() { return Object.keys(heard).length; }
var ACH = [
  { id: 'first', t: 'FIRST NOTE', d: 'you listened to a song!', ok: function () { return heardCount() >= 1; } },
  { id: 'five', t: 'WARMING UP', d: '5 songs heard', ok: function () { return heardCount() >= 5; } },
  { id: 'ten', t: 'DANCE FLOOR', d: '10 songs heard', ok: function () { return heardCount() >= 10; } },
  { id: 'all', t: 'ALL ECHOES \u2665', d: 'every song heard!', ok: function () { return heardCount() >= TRACKS.length; } },
  { id: 'pet', t: 'GOOD BOY!', d: 'pet the dog 10 times', ok: function () { return pets >= 10; } },
  { id: 'bff', t: 'BEST FRIENDS', d: 'pet the dog 50 times', ok: function () { return pets >= 50; } },
  { id: 'secret', t: 'SECRET FOUND', d: 'you found the hidden surprise \u2665', ok: function () { return !!secretFound; } }
];
var tq = [], tbusy = false;
function nextToast() {
  var q = tq.shift(); if (!q) { tbusy = false; return; } tbusy = true;
  var el = $('toast'); el.querySelector('strong').textContent = q.t; el.querySelector('em').textContent = q.d;
  el.classList.add('on');
  setTimeout(function () { el.classList.remove('on'); setTimeout(nextToast, 450); }, 3200);
}
function updateHeardUI() {
  $('heard-n').textContent = heardCount(); $('heard-t').textContent = TRACKS.length;
  $('ach-n').textContent = Object.keys(unlocked).length; $('ach-t').textContent = ACH.length; syncAcc(true);
}
function checkAch() {
  ACH.forEach(function (a) { if (!unlocked[a.id] && a.ok()) { unlocked[a.id] = 1; store.set('eoy_ach', unlocked); tq.push(a); if (!tbusy) nextToast(); if (a.id === 'all') setTimeout(function () { dogRose(4800); }, 400); } });
  updateHeardUI();
}
function markHeard(i) { if (heard[i]) return; heard[i] = 1; store.set('eoy_heard', heard); checkAch(); }

/* ---- hooks called from the player ---- */
function dogOnTrack(i) { applyTheme(i); bpm = 96 + (i * 11) % 40; dogLyric(); if (noteOpen) showNote(); }
function dogOnPlay() { dogLyric(); idleSince = performance.now(); if (dogState === 'sleep') { stretchWake(); return; } setDog(playPose()); say('\u266a ' + TRACKS[curTrack].t, 2600); }
function dogOnPause() { dogLyric(); clearTimeout(stretchT); dogWrap.classList.remove('stretch'); setDog('sleep'); idleSince = performance.now(); }

/* ---- animation loop: bounce to the beat, float notes, fall asleep ---- */
var beh = { name: 'stand', until: 0, x: 0, tx: 0, dir: 0 }, errand = null, envEl = null, lastTs2 = 0;
function behSprite() { return beh.name === 'walk' ? DOG.walk : beh.name === 'sit' ? DOG.sit : DOG.idle; }
function pickBeh(now) {
  var r = Math.random();
  if (beh.name !== 'stand') { beh.name = 'stand'; beh.until = now + 1600 + Math.random() * 1800; }
  else if (r < .55) {
    beh.tx = Math.max(-75, Math.min(75, beh.x + (Math.random() < .5 ? -1 : 1) * (35 + Math.random() * 60)));
    beh.dir = beh.tx > beh.x ? 1 : -1; beh.name = 'walk'; beh.until = now + 6000;
  }
  else if (r < .8) { beh.name = 'sit'; beh.until = now + 4200 + Math.random() * 2600; }
  else { beh.name = 'sniff'; beh.until = now + 1800; }
  var sprite = behSprite();
  if (dogState === 'idle' && !roseOn && dog.getAttribute('src') !== sprite) dog.src = sprite;
}
function applyIdle(now, dt) {
  if (now > beh.until) pickBeh(now);
  if (beh.name === 'walk') {
    beh.x += beh.dir * 32 * dt / 1000;
    if ((beh.dir > 0 && beh.x >= beh.tx) || (beh.dir < 0 && beh.x <= beh.tx)) { beh.x = beh.tx; beh.until = 0; }
  }
  var rot = 0, dy = 0, sy = 1 + .012 * Math.sin(now / 420);
  if (beh.name === 'walk') rot = beh.dir * 2;
  if (beh.name === 'sniff') { var q = .5 + .5 * Math.sin(now / 95); rot = 4 + 3 * q; dy = 2 * q; }
  dogWrap.style.transformOrigin = '50% 100%';
  dogWrap.style.transform = 'translate(' + beh.x.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg) scale(1,' + sy.toFixed(3) + ')';
}
/* love note: the dog trots over with an envelope, drops it, then the note appears */
function dogErrand() {
  if (reduce || !DOG.walk) { showNote(); return; }
  wake();
  if (!envEl) { envEl = new Image(); envEl.id = 'dog-env'; envEl.alt = ''; envEl.src = 'assets/envelope.png'; $('dog-stage').appendChild(envEl); }
  errand = { t0: performance.now(), shown: false };
  envEl.style.display = 'block';
  dogOverride('walk', 2800, function () { errand = null; envEl.style.display = 'none'; if (!errand) dogWrap.style.transform = ''; });
}
function applyErrand(now) {
  var t = (now - errand.t0) / 1000, W = dogWrap.offsetWidth, H = dogWrap.offsetHeight, x = 0, moving = false, rot = 0;
  if (t < 1.1) { var u = t / 1.1; x = 85 * u * u * (3 - 2 * u); moving = true; rot = 2; }
  else if (t < 1.5) x = 85;
  else if (t < 2.7) { var v = (t - 1.5) / 1.2; x = 85 * (1 - v * v * (3 - 2 * v)); moving = true; rot = -2; }
  var bob = moving ? -Math.abs(Math.sin(t * 9)) * 4 : 0;
  dogWrap.style.transformOrigin = '50% 100%';
  dogWrap.style.transform = 'translate(' + x.toFixed(1) + 'px,' + bob.toFixed(1) + 'px) rotate(' + rot + 'deg)';
  var ox = dogWrap.offsetLeft, oy = dogWrap.offsetTop, px, py;
  if (t < 1.1) { px = .585 * W + x; py = .576 * H + bob; }
  else { var f = Math.min(1, (t - 1.1) / .4); px = .585 * W + 85; py = .576 * H + (.9 * H - .576 * H) * f * f; if (f >= 1) py -= Math.abs(Math.sin((t - 1.5) * 10)) * 5 * Math.max(0, 1 - (t - 1.5) * 2.4); }
  envEl.style.transform = 'translate(' + (ox + px - 18).toFixed(1) + 'px,' + (oy + py - 12).toFixed(1) + 'px)';
  if (t >= 1.5 && !errand.shown) { errand.shown = true; showNote(); heartBurst(4); }
}
var wasActive = false;
(function loop(now) {
  requestAnimationFrame(loop);
  var act = sp.classList.contains('active');
  if (act && !wasActive) greet();
  wasActive = act;
  if (!act) { idleSince = now; document.body.classList.remove('night'); return; }
  document.body.classList.toggle('night', dogState === 'sleep');
  updateAcc(now);
  if (isPlaying) {
    var vib = (dogState === 'sing' || dogState === 'singmic') && !roseOn;
    if (vib) {
      var chorus = dogState === 'singmic', beat = now / 1000 * bpm / 60;
      if (!reduce && !dogWrap.classList.contains('hop') && !dogWrap.classList.contains('shake')) {
        var nn = audioLive ? kick : Math.pow((Math.cos(2 * Math.PI * beat) + 1) / 2, 2);                       /* 1 right on the beat */
        var ang = chorus ? 6 * Math.sin(Math.PI * beat) : 3 * Math.sin(Math.PI * beat / 2); /* sway */
        var dy = nn * (chorus ? 8 : 4) - (chorus ? Math.abs(Math.sin(Math.PI * beat)) * 9 : 0);
        dogWrap.style.transformOrigin = '50% 100%';
        beh.x *= .93; dogWrap.style.transform = 'translate(' + beh.x.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) rotate(' + ang.toFixed(2) + 'deg) scale(1,' + (1 - .018 * nn).toFixed(3) + ')';
      }
      if (now > humNext) { humOn = !humOn; humNext = now + (humOn ? 800 + Math.random() * 900 : 2200 + Math.random() * 3200); dog.src = srcForState(); }
      if (now - lastFx > (chorus ? 520 : 1500) + Math.random() * 500) {
        lastFx = now;
        if (chorus) spawnFx(Math.random() < .5 ? '\u2665' : '\u2726', FXC[(Math.random() * 3) | 0], '', 14 + Math.random() * 72, 16 + Math.random() * 30);
        else spawnFx(Math.random() < .5 ? '\u266a' : '\u266b', FXC[(Math.random() * 3) | 0], '', Math.random() < .5 ? 22 + Math.random() * 9 : 69 + Math.random() * 9, 20 + Math.random() * 10);
      }
      var want = playPose(); if (want !== dogState) setDog(want);
    } else dogWrap.style.transform = '';
  } else {
    dogWrap.style.transform = '';
    if (dogState === 'sleep') { if (!DOG.sleep && now - lastZ > 1500) { lastZ = now; spawnFx('z', '#cfd8ff', 'z', 58 + Math.random() * 16, 18 + Math.random() * 6); } }
    else if (now - idleSince > 30000) setDog('sleep');
  }
  var dt2 = lastTs2 ? Math.min(60, now - lastTs2) : 16; lastTs2 = now;
  if (errand) applyErrand(now);
  else if (dogState === 'idle' && !isPlaying && !roseOn) applyIdle(now, dt2);
  else if (!isPlaying && !roseOn && dogState === 'sleep') dogWrap.style.transform = 'translate(' + beh.x.toFixed(1) + 'px,0)';
})(performance.now());
