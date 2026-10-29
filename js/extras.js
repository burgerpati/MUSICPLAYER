/* EXTRAS — custom cursor, sparkle trail, mini pup */

/* =====================================================
   CUSTOM CURSOR + SPARKLE TRAIL + MINI PUP
===================================================== */
(function () {
  function bmp(rows, pal, scale) {
    var c = document.createElement('canvas'); c.width = rows[0].length * scale; c.height = rows.length * scale;
    var x = c.getContext('2d');
    rows.forEach(function (r, j) { for (var i = 0; i < r.length; i++) { var col = pal[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i * scale, j * scale, scale, scale); } } });
    return c;
  }
  /* ---- cursors ---- */
  var ARROW = ["O..........","OO.........","OXO........","OXXO.......","OXXXO......","OXXXXO.....","OXXXXXO....","OXXXXXXO...","OXXXXXXXO..","OXXXXXOOOO.","OXXOXXO....","OXO.OXXO...","OO..OXXO...","O....OXXO..",".....OXXO..","......OO..."];
  var HEART = [".OO...OO.","OXXO.OXXO","OXXXOXXXO","OXXXXXXXO",".OXXXXXO.","..OXXXO..","...OXO...","....O...."];
  var pal = { O: '#3a0824', X: '#ff8fb8' }, palH = { O: '#3a0824', X: '#ff4c8a' };
  try {
    var a = bmp(ARROW, pal, 2).toDataURL(), h = bmp(HEART, palH, 3).toDataURL();
    var st = document.createElement('style');
    st.textContent = '*{cursor:url(' + a + ') 0 0,auto !important}' +
      'body a,body button,body input,body .ti,body #dog,body #prog-bar,body #pup,body #hero-title,body .start{cursor:url(' + h + ') 13 4,pointer !important}';
    document.head.appendChild(st);
  } catch (e) {}

  /* ---- sparkle trail ---- */
  var tc = $('trail'), tx = tc.getContext('2d'), TP = [], TS = 3, running = false, lastSp = 0;
  var tcols = ['#ff8fb8', '#ff4c8a', '#fcd0a8', '#c9a0ff'];
  var tspr = tcols.map(function (c) { return bmp(BM.heart5.map(function (r) { return r.replace(/X/g, 'X'); }), { X: c }, TS); });
  function tsize() { tc.width = innerWidth; tc.height = innerHeight; }
  tsize(); addEventListener('resize', tsize);
  var mouse = { x: -99, y: -99, t: 0 }, pawX = -99, pawY = -99, pawSide = 1, pawCache = {};
  var PAW = ["..XX.XX..","..XX.XX..","XX.....XX","XX.XXX.XX","..XXXXX..",".XXXXXXX.",".XXXXXXX.","..XX.XX.."];
  function pawImg() {
    var c = PAL[curTrack % PAL.length], key = c.join();
    return pawCache[key] || (pawCache[key] = bmp(PAW, { X: 'rgb(' + key + ')' }, 2));
  }
  function tloop() {
    tx.clearRect(0, 0, tc.width, tc.height);
    for (var i = TP.length - 1; i >= 0; i--) {
      var p = TP[i]; p.life -= p.paw ? .012 : .035;
      if (!p.paw) { p.y += p.vy; p.x += p.vx; }
      if (p.life <= 0) { TP.splice(i, 1); continue; }
      tx.globalAlpha = Math.min(1, p.life * 1.4);
      if (p.paw) { tx.save(); tx.translate(Math.round(p.x), Math.round(p.y)); tx.rotate(p.ang); tx.drawImage(p.img, -p.img.width / 2, -p.img.height / 2); tx.restore(); }
      else tx.drawImage(p.img, Math.round(p.x / TS) * TS, Math.round(p.y / TS) * TS);
    }
    tx.globalAlpha = 1;
    if (TP.length) requestAnimationFrame(tloop); else running = false;
  }
  if (!reduce) addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now();
    /* paw-print trail removed */
    if (TP.length > 40) TP.shift();
    if (!running) { running = true; requestAnimationFrame(tloop); }
  });
  addEventListener('pointerdown', function (e) {
    if (reduce || e.pointerType === 'touch') return;
    for (var k = 0; k < 8; k++) { var ang = k / 8 * 6.283; TP.push({ img: tspr[k % 4], x: e.clientX, y: e.clientY, vx: Math.cos(ang) * 1.6, vy: Math.sin(ang) * 1.6, life: 1 }); }
    if (!running) { running = true; requestAnimationFrame(tloop); }
  });

  /* ---- mini pup (pixel dog walking along the bottom) ---- */
  var FW = 102, FH = 84, NF = 16, sheetOK = false, sheet = new Image();
  var pup = $('pup'), px = pup.getContext('2d'), W = 84;
  pup.width = FW; pup.height = FH; pup.style.width = W + 'px'; pup.style.height = (FH * W / FW) + 'px';
  var st2 = { x: innerWidth * .2, tx: innerWidth * .6, dir: 1, mode: 'walk', until: 0, f: 0, ft: 0, hop: 0 };
  function drawPup(i) { if (!sheetOK) return; px.clearRect(0, 0, FW, FH); px.drawImage(sheet, i * FW, 0, FW, FH, 0, 0, FW, FH); }
  sheet.onload = function () { sheetOK = true; drawPup(0); };
  sheet.src = 'assets/pup-sheet.png';
  function pupFx(ch) {
    if (reduce) return; var e = document.createElement('span'); e.className = 'pup-fx'; e.textContent = ch;
    var r = pup.getBoundingClientRect(); e.style.left = (r.left + 10 + Math.random() * 24) + 'px'; e.style.top = (r.top - 4) + 'px';
    e.style.setProperty('--dx', (Math.random() * 30 - 15) + 'px'); document.body.appendChild(e);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 1500);
  }
  pup.addEventListener('click', function () {
    st2.hop = performance.now(); pupFx('♥'); pupFx('♥');
    var r = pup.getBoundingClientRect(); try { burst((r.left + r.width / 2) / PX, (r.top + 10) / PX); } catch (e) {}
    try { bark(); } catch (e) {}
  });
  var lastP = 0;
  (function pl(now) {
    requestAnimationFrame(pl);
    var dt = lastP ? Math.min(60, now - lastP) : 16; lastP = now; if (reduce) return;
    var sleepy = (typeof dogState !== 'undefined') && dogState === 'sleep' && playerActive();
    pup.classList.toggle('snooze', sleepy);
    var chase = now - mouse.t < 2500 && mouse.y > innerHeight * .6;
    var dance = isPlaying && playerActive() && !chase && !sleepy, dr = dog.getBoundingClientRect();
    if (chase) { st2.tx = Math.max(0, Math.min(innerWidth - W, mouse.x - W / 2)); if (st2.mode !== 'walk') { st2.mode = 'walk'; } }
    else if (dance) { st2.tx = Math.max(0, Math.min(innerWidth - W, dr.left + dr.width / 2 + 30 - W / 2)); st2.mode = 'walk'; }
    else if (now > st2.until) {
      if (st2.mode === 'walk' && Math.random() < .4) { st2.mode = 'sit'; st2.until = now + 2500 + Math.random() * 3000; }
      else { st2.mode = 'walk'; st2.tx = Math.random() * (innerWidth - W); st2.until = now + 5000 + Math.random() * 6000; }
    }
    var moving = false;
    if (st2.mode === 'walk' && !sleepy) {
      var d = st2.tx - st2.x;
      if (Math.abs(d) > 4) { st2.dir = d > 0 ? 1 : -1; st2.x += st2.dir * (chase ? 90 : 38) * dt / 1000; moving = true; }
      else if (!chase) st2.until = 0;
    }
    var fi = 0, dancing = dance && !moving;
    if (moving) { st2.ft += dt; var fd = chase ? 45 : 75; if (st2.ft > fd) { st2.ft = 0; st2.f = (st2.f + 1) % NF; } fi = st2.f; }
    else if (dancing) { st2.ft += dt; if (st2.ft > 90) { st2.ft = 0; st2.f = (st2.f + 1) % NF; } fi = st2.f; }
    drawPup(fi);
    var hy = 0, hp = (now - st2.hop) / 420; if (hp >= 0 && hp < 1) hy = -Math.sin(hp * Math.PI) * 18;
    if (dancing) { var bt = now / 1000 * bpm / 60; hy -= Math.abs(Math.sin(Math.PI * bt)) * 9; st2.dir = (Math.floor(bt / 2) % 2) ? -1 : 1; if (Math.random() < .012) pupFx(Math.random() < .5 ? '\u266a' : '\u2665'); }
    pup.style.transform = 'translate(' + st2.x.toFixed(1) + 'px,' + hy.toFixed(1) + 'px) scaleX(' + st2.dir + ')';
    if (!moving && Math.random() < .0015 && !sleepy) pupFx(st2.mode === 'sit' ? '♪' : '♥');
  })(performance.now());
})();
