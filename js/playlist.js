/* CUPID'S PLAYLIST — audio playback, progress, controls, tracklist, visualizer */

$('backBtn').addEventListener('click', function () { if (isPlaying) pausePlay(); pixelWipe('s-intro'); });

/* =====================================================
   CUPID'S PLAYLIST (original logic, wired with listeners)
===================================================== */

var curTrack = 0, isPlaying = false, progTimer = null, elapsed = 0, shuffle = false, repeat = false;

/* ---- real mp3 playback ----
   Each track looks for  music/01.mp3, music/02.mp3 ...  (same order as TRACKS),
   or a custom path via  src:"music/anything.mp3"  on the track.
   If the file isn't found, that track falls back to the old silent timer. */
var au = new Audio(), useAudio = false;
au.preload = 'auto'; au.volume = 0.8;
function srcFor(i) { return TRACKS[i].src || ('music/' + (i + 1 < 10 ? '0' : '') + (i + 1) + '.mp3'); }
au.addEventListener('error', function () { if (useAudio) { useAudio = false; if (isPlaying) runTimer(); } });
au.addEventListener('ended', function () { if (useAudio) { clearInterval(progTimer); onEnd(); } });

function fmtTime(s) { var m = Math.floor(s / 60), sec = s % 60; return m + ':' + (sec < 10 ? '0' : '') + sec; }

function buildTL() {
  var tl = $('tl'); tl.innerHTML = '';
  TRACKS.forEach(function (t, i) {
    var d = document.createElement('div');
    d.className = 'ti' + (i === 0 ? ' active' : '');
    d.innerHTML = '<span class="tn">' + (i + 1) + '</span><span class="tt">' + t.t + '</span><span class="tar">' + t.a + '</span>';
    d.onclick = function () { loadTrack(i); startPlay(); };
    tl.appendChild(d);
  });
}
function loadTrack(i) {
  curTrack = i; elapsed = 0; isPlaying = false; clearInterval(progTimer);
  au.pause(); useAudio = true; au.src = srcFor(i);
  var t = TRACKS[i];
  $('song-title').textContent = t.t; $('song-artist').textContent = t.a;
  $('play-btn').textContent = '▶'; $('now-playing-tag').classList.remove('live');
  $('prog-fill').style.width = '0%'; $('prog-handle').style.left = '0%';
  $('tc').textContent = '0:00'; $('td').textContent = fmtTime(t.dur);
  var img = $('aimg'), fb = $('album-fb');
  img.style.display = 'none'; fb.style.display = 'block';
  img.onload = function () { img.style.display = 'block'; fb.style.display = 'none'; };
  img.onerror = function () { img.style.display = 'none'; fb.style.display = 'block'; };
  img.src = 'https://i.scdn.co/image/' + t.i;
  $('album-section').style.setProperty('--label', 'url("' + img.src + '")');
  $('album-section').classList.remove('playing');
  document.querySelectorAll('.ti').forEach(function (el, idx) { el.classList.toggle('active', idx === i); });
  var ac2 = document.querySelector('.ti.active'); if (ac2) ac2.scrollIntoView({ block: 'nearest' });
  if ($('s-player').classList.contains('active')) $('hudScore').textContent = pad3(i + 1);
  dogOnTrack(i);
}
function tick() {
  var dur = TRACKS[curTrack].dur;
  if (useAudio) {
    elapsed = Math.floor(au.currentTime);
    if (isFinite(au.duration) && au.duration > 0) { dur = au.duration; $('td').textContent = fmtTime(Math.floor(dur)); }
  } else { elapsed++; }
  var pct = Math.min((elapsed / dur) * 100, 100);
  $('prog-fill').style.width = pct + '%'; $('prog-handle').style.left = pct + '%';
  $('tc').textContent = fmtTime(elapsed);
  if (elapsed >= 10) markHeard(curTrack);
  dogLyric();
  if (!useAudio && elapsed >= dur) { clearInterval(progTimer); onEnd(); }
}
function runTimer() { clearInterval(progTimer); progTimer = setInterval(tick, useAudio ? 250 : 1000); }
function startPlay() {
  if (isPlaying) return; isPlaying = true;
  $('play-btn').textContent = '⏸'; $('now-playing-tag').classList.add('live'); $('album-section').classList.add('playing');
  if (useAudio) {
    ensureAnalyser();
    var pr = au.play();
    if (pr && pr.catch) pr.catch(function (e) { if (e && e.name === 'AbortError') return; useAudio = false; if (isPlaying) runTimer(); });
  }
  runTimer();
  dogOnPlay();
}
function pausePlay() { isPlaying = false; $('album-section').classList.remove('playing'); $('play-btn').textContent = '▶'; $('now-playing-tag').classList.remove('live'); clearInterval(progTimer); au.pause(); dogOnPause(); }
function togglePlay() { if (isPlaying) pausePlay(); else startPlay(); }
function onEnd() { if (repeat) { isPlaying = false; elapsed = 0; if (useAudio) au.currentTime = 0; startPlay(); return; } nextTrack(); }
function nextTrack() { var n = shuffle ? Math.floor(Math.random() * TRACKS.length) : (curTrack + 1) % TRACKS.length; loadTrack(n); startPlay(); }
function prevTrack() { if (elapsed > 3) { elapsed = 0; if (useAudio) au.currentTime = 0; return; } loadTrack((curTrack - 1 + TRACKS.length) % TRACKS.length); startPlay(); }
function toggleShuffle() { shuffle = !shuffle; $('shuffle-btn').classList.toggle('active', shuffle); }
function toggleRepeat() { repeat = !repeat; $('repeat-btn').classList.toggle('active', repeat); }
function setVol(v) { $('vol-val').textContent = v; au.volume = v / 100; }
function seekTrack(e) {
  var bar = $('prog-bar'), pct = Math.max(0, Math.min(1, e.offsetX / bar.offsetWidth));
  var dur = (useAudio && isFinite(au.duration) && au.duration > 0) ? au.duration : TRACKS[curTrack].dur;
  elapsed = Math.floor(pct * dur); if (useAudio && isFinite(au.duration)) au.currentTime = pct * au.duration;
  $('prog-fill').style.width = (pct * 100) + '%'; $('prog-handle').style.left = (pct * 100) + '%';
  $('tc').textContent = fmtTime(elapsed);
}
/* ---- real audio analysis (needs http/https; on file:// it falls back to the fake animation) ---- */
var an = null, anBuf = null, anSrc = null, audioLive = false, liveUntil = 0, kick = 0, bassAvg = 0, lastKick = 0, lastPoll = 0;
function ensureAnalyser() {
  if (an || !/^https?:$/.test(location.protocol)) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    anSrc = ac.createMediaElementSource(au);
    an = ac.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = .72;
    anBuf = new Uint8Array(an.frequencyBinCount);
    anSrc.connect(an); an.connect(ac.destination);
  } catch (e) { an = null; }
}
function pollAudio(now) {
  var dt = lastPoll ? Math.min(60, now - lastPoll) : 16; lastPoll = now;
  if (!an || !isPlaying) { audioLive = false; kick = Math.max(0, kick - dt / 200); return; }
  an.getByteFrequencyData(anBuf);
  var sum = 0, i; for (i = 0; i < anBuf.length; i++) sum += anBuf[i];
  if (sum > 0) liveUntil = now + 500;
  audioLive = now < liveUntil;
  if (!audioLive) { kick = Math.max(0, kick - dt / 200); return; }
  var bass = (anBuf[1] + anBuf[2] + anBuf[3] + anBuf[4]) / 4;
  if (bass > bassAvg * 1.22 + 14 && now - lastKick > 170) { kick = 1; lastKick = now; }
  bassAvg = bassAvg * .93 + bass * .07;
  kick = Math.max(0, kick - dt / 260);
}
function buildPViz() {
  var viz = $('audio-viz'); viz.innerHTML = ''; var bars = [];
  for (var i = 0; i < 28; i++) { var bb = document.createElement('div'); bb.className = 'avbar'; bb.style.height = '2px'; viz.appendChild(bb); bars.push(bb); }
  (function anim() {
    var t = Date.now() * .003, max = viz.clientHeight || 40;
    pollAudio(performance.now());
    bars.forEach(function (bb, i) {
      var h = isPlaying ? (Math.abs(Math.sin(t * 1.8 + i * .5)) * .7 + Math.abs(Math.cos(t * 2.3 + i * .9)) * .3) * max : 2;
      if (audioLive) {
        var lo = Math.floor(Math.pow(i / 28, 1.6) * 100) + 1, hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / 28, 1.6) * 100) + 2), a = 0, q;
        for (q = lo; q < hi; q++) a += anBuf[q];
        h = Math.pow(a / (hi - lo) / 255, 1.15) * max * 1.15;
      }
      bb.style.height = Math.max(2, Math.round(h)) + 'px';
      bb.style.opacity = isPlaying ? (.5 + Math.abs(Math.sin(t + i * .4)) * .5).toFixed(2) : '0.3';
    });
    requestAnimationFrame(anim);
  })();
}

$('shuffle-btn').addEventListener('click', toggleShuffle);
$('repeat-btn').addEventListener('click', toggleRepeat);
$('prev-btn').addEventListener('click', prevTrack);
$('next-btn').addEventListener('click', nextTrack);
$('play-btn').addEventListener('click', togglePlay);
$('prog-bar').addEventListener('click', seekTrack);
$('vol-slider').addEventListener('input', function () { setVol(this.value); });
