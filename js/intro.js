/* INTRO SCREEN — HUD hearts, title letters, typewriter subtitle, START button */

/* HUD hearts, note icon, arrows */
for (var k = 0; k < 3; k++) {
  var hs = document.createElement('span');
  hs.style.backgroundImage = 'url(' + sprite(BM.heart7, '#ff4c8a', 6).toDataURL() + ')';
  $('lives').appendChild(hs);
}
$('noteIcon').style.backgroundImage = 'url(' + sprite(BM.note, '#fcd0a8', 6).toDataURL() + ')';
var arrowURL = 'url(' + sprite(BM.arrow, '#ffffff', 6).toDataURL() + ')';
$('arrowL').style.backgroundImage = arrowURL;
$('arrowR').style.backgroundImage = arrowURL;

var trackEl = $('track');
for (var b = 0; b < 24; b++) { var bi = document.createElement('i'); bi.style.setProperty('--i', b); trackEl.appendChild(bi); }

/* title letters + typewriter */
var title = $('title'), text = title.textContent;
title.setAttribute('aria-label', text); title.textContent = '';
for (var n = 0; n < text.length; n++) {
  var sp = document.createElement('span');
  if (text[n] === ' ') sp.className = 'sp'; else { sp.className = 'ch'; sp.textContent = text[n]; }
  sp.style.setProperty('--i', n); sp.setAttribute('aria-hidden', 'true');
  title.appendChild(sp);
}
var subText = 'Every song here is a piece ^_^', subEl = $('sub'), sp2 = 0;
(function type() { subEl.textContent = subText.slice(0, ++sp2); if (sp2 < subText.length) setTimeout(type, 70); })();


/* =====================================================
   START button
===================================================== */
var startBtn = $('start'), loadbar = $('loadbar'), hint = $('hint'), busy = false, ac;
function beep(freq, when, dur) {
  var o = ac.createOscillator(), g = ac.createGain();
  o.type = 'square'; o.frequency.value = freq;
  g.gain.setValueAtTime(.0001, ac.currentTime + when);
  g.gain.exponentialRampToValueAtTime(.08, ac.currentTime + when + .01);
  g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + when + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(ac.currentTime + when); o.stop(ac.currentTime + when + dur + .02);
}
startBtn.addEventListener('click', function () {
  if (busy) return; busy = true;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) { beep(f, i * .08, .14); });
  } catch (e) {}
  var r = startBtn.getBoundingClientRect();
  burst((r.left + r.width / 2) / PX, (r.top + r.height / 2) / PX);
  hint.textContent = 'LOADING...'; loadbar.classList.add('on');
  var bar = loadbar.firstElementChild, pct = 0;
  var iv = setInterval(function () {
    pct += 5 + Math.random() * 7; bar.style.width = Math.min(100, pct) + '%';
    if (pct >= 100) {
      clearInterval(iv);
      setTimeout(function () {
        pixelWipe('s-player');
        setTimeout(function () { loadbar.classList.remove('on'); bar.style.width = '0'; hint.textContent = 'PRESS START TO PLAY'; busy = false; }, 900);
      }, 350);
    }
  }, 90);
});
