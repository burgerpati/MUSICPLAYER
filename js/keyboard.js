/* KEYBOARD SHORTCUTS — space, arrows, M, S, R */

/* ---- keyboard shortcuts ---- */
function playerActive() { return sp.classList.contains('active'); }
function setVolume(v) { v = Math.max(0, Math.min(100, v)); $('vol-slider').value = v; setVol(v); say('vol ' + v, 900); }
document.addEventListener('keydown', function (e) {
  if (!playerActive() || e.ctrlKey || e.metaKey || e.altKey) return;
  var k = e.key, onSlider = e.target && e.target.id === 'vol-slider';
  if (k === ' ' || k === 'Spacebar') { e.preventDefault(); wake(); togglePlay(); }
  else if (k === 'ArrowRight') { e.preventDefault(); wake(); dogShake(); nextTrack(); }
  else if (k === 'ArrowLeft') { e.preventDefault(); wake(); dogShake(); prevTrack(); }
  else if ((k === 'ArrowUp' || k === 'ArrowDown') && !onSlider) { e.preventDefault(); setVolume(parseInt($('vol-slider').value, 10) + (k === 'ArrowUp' ? 5 : -5)); }
  else if (k === 'm' || k === 'M') { au.muted = !au.muted; say(au.muted ? 'muted' : 'sound on', 900); }
  else if (k === 's' || k === 'S') { toggleShuffle(); say(shuffle ? 'shuffle on' : 'shuffle off', 900); }
  else if (k === 'r' || k === 'R') { toggleRepeat(); say(repeat ? 'repeat on' : 'repeat off', 900); }
});
document.addEventListener('keyup', function (e) {
  if (playerActive() && e.key === ' ' && e.target && e.target.tagName === 'BUTTON') e.preventDefault();
});
