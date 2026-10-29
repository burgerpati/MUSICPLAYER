/* SHARED — helpers, pixel sprites, pixel sky, screen switcher + pixel wipe (used by intro + playlist) */

var $ = function (id) { return document.getElementById(id); };

/* =====================================================
   Pixel sprites
===================================================== */
var BM = {
  heart5: [".X.X.", "XXXXX", "XXXXX", ".XXX.", "..X.."],
  heart7: [".XX.XX.", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  note:   ["..XXX", "..X.X", "..X..", "..X..", ".XX..", "XXX..", ".X..."],
  arrow:  ["X...", "XX..", "XXX.", "XXXX", "XXX.", "XX..", "X..."]
};
function sprite(bm, color, scale) {
  scale = scale || 1;
  var h = bm.length, w = bm[0].length, c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  var x = c.getContext('2d'); x.fillStyle = color;
  bm.forEach(function (r, j) { for (var i = 0; i < r.length; i++) if (r[i] === 'X') x.fillRect(i * scale, j * scale, scale, scale); });
  return c;
}


/* =====================================================
   Pixel sky (shared by both screens)
===================================================== */
var cv = $('sky'), ctx = cv.getContext('2d');
var PX = 4, gw, gh, stars = [], parts = [], shoot = null;
var COLORS = ['#ff8fb8', '#ff4c8a', '#fcd0a8', '#c9a0ff'];
var spr = { heart: [], note: [] };
COLORS.forEach(function (c) { spr.heart.push(sprite(BM.heart5, c, 1)); spr.note.push(sprite(BM.note, c, 1)); });

function initSky() {
  gw = Math.ceil(innerWidth / PX); gh = Math.ceil(innerHeight / PX);
  cv.width = gw; cv.height = gh; stars = [];
  var count = Math.floor(gw * gh / 220);
  for (var q = 0; q < count; q++) stars.push({ x: (Math.random() * gw) | 0, y: (Math.random() * gh * .85) | 0, ph: Math.random() * 6.28, sp: .5 + Math.random() * 1.6, big: Math.random() < .18, c: Math.random() < .3 ? '#fcd0a8' : '#ffb3d1' });
}
function spawn() {
  var isHeart = Math.random() < .6, ci = (Math.random() * COLORS.length) | 0;
  parts.push({ kind: 'float', img: (isHeart ? spr.heart : spr.note)[ci], x: Math.random() * gw, y: gh + 8, vy: -(.12 + Math.random() * .22), sw: Math.random() * 6.28, amp: 2 + Math.random() * 4, a: .35 + Math.random() * .45 });
}
function burst(cx, cy) {
  for (var q = 0; q < 46; q++) {
    var ang = Math.random() * 6.283, spd = .8 + Math.random() * 2.2, ci = (Math.random() * COLORS.length) | 0, isHeart = Math.random() < .6;
    parts.push({ kind: 'burst', img: (isHeart ? spr.heart : spr.note)[ci], x: cx, y: cy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 1, life: 1 });
  }
}
var last = 0, spawnT = 0, shootT = 3000, prevTs = 0;
function loop(ts) {
  var dt = Math.min(40, ts - last) / 16.7; last = ts;
  ctx.clearRect(0, 0, gw, gh);
  var t = ts / 1000;
  stars.forEach(function (s) {
    var v = (Math.sin(t * s.sp + s.ph) + 1) / 2;
    ctx.globalAlpha = .25 + .75 * v; ctx.fillStyle = s.c;
    ctx.fillRect(s.x, s.y, 1, 1);
    if (s.big && v > .72) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
  });
  spawnT -= (prevTs ? ts - prevTs : 0); prevTs = ts;
  if (spawnT <= 0) { spawn(); spawnT = 500 + Math.random() * 700; }
  shootT -= dt * 16.7;
  if (shootT <= 0 && !shoot) { shoot = { x: Math.random() * gw * .7, y: Math.random() * gh * .3, life: 1 }; shootT = 5000 + Math.random() * 6000; }
  if (shoot) {
    for (var z = 0; z < 9; z++) { ctx.globalAlpha = shoot.life * (1 - z / 9); ctx.fillStyle = '#ffe3ef'; ctx.fillRect(Math.round(shoot.x - z * 1.2), Math.round(shoot.y - z * .6), 1, 1); }
    shoot.x += 2.2 * dt; shoot.y += 1.1 * dt; shoot.life -= .012 * dt;
    if (shoot.life <= 0) shoot = null;
  }
  for (var q = parts.length - 1; q >= 0; q--) {
    var o = parts[q];
    if (o.kind === 'float') {
      o.y += o.vy * dt; o.sw += .03 * dt;
      ctx.globalAlpha = o.a * Math.min(1, Math.max(0, o.y / 30));
      ctx.drawImage(o.img, Math.round(o.x + Math.sin(o.sw) * o.amp), Math.round(o.y));
      if (o.y < -8) parts.splice(q, 1);
    } else {
      o.vy += .05 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.life -= .012 * dt;
      ctx.globalAlpha = Math.max(0, o.life);
      ctx.drawImage(o.img, Math.round(o.x), Math.round(o.y));
      if (o.life <= 0) parts.splice(q, 1);
    }
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(loop);
}
addEventListener('resize', initSky);
initSky();
for (var w = 0; w < 14; w++) { spawn(); parts[parts.length - 1].y = Math.random() * gh; }
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(loop);

/* =====================================================
   Screens + pixel wipe transition
===================================================== */
var wipe = $('wipe'), wctx = wipe.getContext('2d'), wiping = false;
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('active', s.id === id); });
  window.scrollTo(0, 0);
  document.body.classList.toggle('on-player', id === 's-player');
  $('hudLv').textContent = id === 's-player' ? '02' : '01';
  $('hudScore').textContent = id === 's-player' ? pad3(curTrack + 1) : '000';
}
function pad3(n) { return ('00' + n).slice(-3); }
function pixelWipe(toId) {
  if (wiping) return; wiping = true;
  var B = 24, cw = innerWidth, ch = innerHeight;
  wipe.width = cw; wipe.height = ch;
  var cols = Math.ceil(cw / B), rows = Math.ceil(ch / B), cells = [];
  for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) cells.push({ c: c, r: r, k: c + r + Math.random() * 8, col: ['#ff8fb8', '#ff4c8a', '#c2467f', '#7a1f4d'][(Math.random() * 4) | 0] });
  cells.sort(function (a, b) { return a.k - b.k; });
  var per = Math.ceil(cells.length / 26), idx = 0, phase = 0;
  (function step() {
    var end = Math.min(cells.length, idx + per);
    for (; idx < end; idx++) {
      var cell = cells[idx];
      if (phase === 0) { wctx.fillStyle = cell.col; wctx.fillRect(cell.c * B, cell.r * B, B, B); }
      else wctx.clearRect(cell.c * B, cell.r * B, B, B);
    }
    if (idx < cells.length) { requestAnimationFrame(step); return; }
    if (phase === 0) { showScreen(toId); phase = 1; idx = 0; setTimeout(function () { requestAnimationFrame(step); }, 120); }
    else { wctx.clearRect(0, 0, cw, ch); wiping = false; }
  })();
}
