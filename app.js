/* ============================================================================
   HARD FIVE : RANGED CHAIN
   Five runs of one stud-link chain ranged on a haze grey deck. This module boots the deck, wires the sync seam, and owns
   the move (jaw, slack, taut, chalk, re-flake), the midnight haul, the sounds and the gestures. deck.js draws; state.js holds.
   ========================================================================== */
import { TASKS } from './days.js';
import { FIREBASE, CREW } from './config.js';
import { Q, ANIM, PROTO, SYNC_MODE, VW, VH, clamp, f, hash, $, clock, dateKey, hhmm, DEV, loadDevice, saveDevice, S, person, people, todayRecs, isMadeView, applyLink, PENDING, pendingSet, pendingSweep, pendingOverlay, clone } from './state.js';
import { D, UI, layout, render, scheduleRender, slotOrder, variety, ironStyle, chalkText, strike, chainPositions, editEl, bakeTextures } from './deck.js';

if (!ANIM) document.documentElement.classList.add('noanim');
var standalone = !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
if (standalone) document.documentElement.setAttribute('data-standalone', '1');

/* ---------- the seam: one switch, in one place ---------- */
var sync = null;
async function chooseSync() {
  if (SYNC_MODE === 'fake') { var fk = await import('./sync/fake.js'); return fk.createFake(); }
  if (FIREBASE) { var fs = await import('./sync/firestore.js'); return fs.createFirestore(FIREBASE); }
  var lc = await import('./sync/local.js'); return lc.createLocal();
}

/* ---------- audio: synthesised, no files, created and resumed on the first tap ---------- */
function pitchOf(pid) { var i = S.roster.findIndex(function (p) { return p.id === pid; }); return [1, 1.08, .92, .96, 1.04][i] || 1; }
var audio = {
  ctx: null, noise: null,
  ensure: function () {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) {} }
    if (!this.noise) { var b = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = b; }
  },
  ok: function () { return this.ctx && !DEV.muted; },
  partial: function (freq, amp, dur, t, type) { var c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02); },
  burst: function (amp, dur, t, filt) { var c = this.ctx, n = c.createBufferSource(), g = c.createGain(); n.buffer = this.noise; g.gain.setValueAtTime(amp, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); var node = n; if (filt) { var bp = c.createBiquadFilter(); bp.type = filt.type; bp.frequency.value = filt.f; bp.Q.value = filt.q || 1; node.connect(bp); node = bp; } node.connect(g).connect(c.destination); n.start(t); n.stop(t + dur + .02); },
  clank: function (pid) { if (!this.ok()) return; var t = this.ctx.currentTime, r = pitchOf(pid), g = pid === DEV.me ? 1 : .5; this.partial(2200 * r, .45 * g, .14, t); this.partial(3400 * r, .28 * g, .11, t); this.burst(.5 * g, .02, t, { type: 'highpass', f: 1800 }); },
  tick: function () { if (!this.ok()) return; this.partial(1400, .25, .06, this.ctx.currentTime); },
  snap: function () { if (!this.ok()) return; var t = this.ctx.currentTime; this.burst(.6, .015, t, { type: 'bandpass', f: 2500, q: .7 }); this.partial(700, .3, .08, t); },
  hawse: function (dur) { if (!this.ok()) return; var c = this.ctx, t = c.currentTime, n = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain(); n.buffer = this.noise; n.loop = true; bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = .9; g.gain.setValueAtTime(.0001, t); for (var k = 0; k < dur * 9; k++) { var tk = t + k / 9; g.gain.setValueAtTime(.32, tk); g.gain.exponentialRampToValueAtTime(.06, tk + .09); } g.gain.exponentialRampToValueAtTime(.0001, t + dur); n.connect(bp).connect(g).connect(c.destination); n.start(t); n.stop(t + dur + .05); },
  drag: function (dur) { if (!this.ok()) return; var c = this.ctx, t = c.currentTime, n = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain(); n.buffer = this.noise; n.loop = true; lp.type = 'lowpass'; lp.frequency.value = 520; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.22, t + .08); g.gain.setValueAtTime(.22, t + dur - .12); g.gain.exponentialRampToValueAtTime(.0001, t + dur); n.connect(lp).connect(g).connect(c.destination); n.start(t); n.stop(t + dur + .05); },
  bell: function (t, amp) { if (!this.ok()) return; var f0 = 520, self = this; t = t == null ? this.ctx.currentTime : t; amp = amp || .4;
    [[.5, 1, 3.2], [1, .8, 2.4], [1.2, .5, 1.6], [1.5, .35, 1.3], [2, .55, 1.1], [2.5, .2, .7], [3, .15, .5], [4, .08, .35]].forEach(function (p) { self.partial(f0 * p[0], amp * p[1], p[2], t); });
    this.burst(.35 * amp, .012, t, { type: 'highpass', f: 2000 }); },
  eightBells: function () { if (!this.ok()) return; var t = this.ctx.currentTime + .05; for (var p = 0; p < 4; p++) { this.bell(t + p * .9, .38); this.bell(t + p * .9 + .28, .32); } }
};
function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

/* ---------- run motion: damped spring per run, yaw on neighbours ---------- */
var MOTION = {}, YAWS = [], loopOn = false, lastT = 0, KICK_SCALE = (function () { var x = 0, v = 1, dt = 1 / 240, peak = 0; for (var i = 0; i < 240; i++) { var a = -180 * x - 14 * v; v += a * dt; x += v * dt; peak = Math.max(peak, x); } return 1 / peak; })();
function motion(pid) { if (!MOTION[pid]) MOTION[pid] = { x: 0, v: 0, target: 0, active: false }; return MOTION[pid]; }
function runGroup(pid) { return $('run-' + pid); }
function setRunX(pid, x) { var g = runGroup(pid); if (!g) return; var dy = D.LAY.rowY(+g.dataset.slot) - D.LAY.rowY(0); g.style.transform = 'translate(' + f(x) + 'px,' + f(dy) + 'px)'; }
function kick(pid, dir, px) { if (!ANIM) return; var m = motion(pid); m.v += -dir * px * KICK_SCALE; m.active = true; var g = runGroup(pid); if (g) g.style.willChange = 'transform'; startLoop(); }
function settle(pid, target) { var m = motion(pid); if (!ANIM) { m.x = target; m.target = target; setRunX(pid, target); return; } m.target = target; m.active = true; var g = runGroup(pid); if (g) g.style.willChange = 'transform'; startLoop(); }
function yaw(el, amp, dur) { if (!ANIM || !el) return; YAWS.push({ el: el, t0: performance.now(), dur: dur, amp: amp }); startLoop(); }
function startLoop() { if (!loopOn) { loopOn = true; lastT = performance.now(); requestAnimationFrame(loop); } }
function loop(t) {
  var dt = Math.min(.05, (t - lastT) / 1000), any = false; lastT = t;
  Object.keys(MOTION).forEach(function (pid) {
    var m = MOTION[pid]; if (!m.active) return;
    var steps = 4, h = dt / steps; for (var i = 0; i < steps; i++) { var a = -180 * (m.x - m.target) - 14 * m.v; m.v += a * h; m.x += m.v * h; }
    setRunX(pid, m.x);
    if (Math.abs(m.x - m.target) < .04 && Math.abs(m.v) < 1) { m.x = m.target; m.v = 0; m.active = false; setRunX(pid, m.x); var g = runGroup(pid); if (g) g.style.willChange = 'auto'; } else any = true;
  });
  YAWS = YAWS.filter(function (y) { var p = (t - y.t0) / y.dur; if (p >= 1 || !y.el.isConnected) { if (y.el.isConnected) y.el.setAttribute('transform', y.el.dataset.base); return false; } y.el.setAttribute('transform', y.el.dataset.base + ' rotate(' + f(y.amp * Math.sin(Math.PI * p)) + ')'); return true; });
  if (YAWS.length) any = true;
  if (any) requestAnimationFrame(loop); else loopOn = false;
}

/* ---------- the move ---------- */
function timeNow() { return hhmm(clock.now()); }
function recView(pid) { return todayRecs()[pid]; }
function allMade() { var recs = todayRecs(); return S.roster.length > 0 && S.roster.every(function (p) { return isMadeView(recs[p.id]); }); }
function closeLink(pid, i, at, animate) {
  var rec = recView(pid); if (!rec || rec.links[i] != null) return;
  applyLink(pid, TASKS[i], at); var nowMade = isMadeView(recView(pid));
  if (pid === DEV.me) { pendingSet(pid, TASKS[i], at); sync.setLink(pid, TASKS[i], at).catch(function (e) { console.warn('setLink', e); }); }
  var live = animate && ANIM && runGroup(pid) && $('lk-' + pid + '-' + i);
  if (nowMade && live && allMade()) UI.allHandsPending = true;   // hold the stencil back for the bell and the paint reveal
  if (!live) { scheduleRender(); if (nowMade) afterMade(pid, false); return; }
  animateMove(pid, i, nowMade);
}
function animateMove(pid, i, nowMade) {
  var use = $('lk-' + pid + '-' + i), shd = $('sh-' + pid + '-' + i), g = runGroup(pid), s = D.LAY.s;
  var dir = +g.dataset.dir, p = people().find(function (q) { return q.id === pid; }), v = variety(pid);
  UI.animCount++;
  use.style.setProperty('--jaw', '0deg'); if (shd) shd.style.setProperty('--jaw', '0deg');
  audio.clank(pid); if (pid === DEV.me) vibrate(10);
  setTimeout(function () {
    if (!use.isConnected) return;
    var flat = use.cloneNode(false); flat.removeAttribute('id'); flat.setAttribute('href', '#lk-flat'); flat.setAttribute('class', 'xf');
    flat.setAttribute('style', ironStyle(p) + ';--rust:' + f(v.rust[i]) + ';--polish:' + f(v.pol[i]) + ';opacity:0');
    use.parentNode.insertBefore(flat, use.nextSibling);
    requestAnimationFrame(function () { requestAnimationFrame(function () { flat.style.opacity = '1'; }); });
    kick(pid, dir, 2 * s);
    yaw($('ek-' + pid + '-' + i), 1.5, 220); yaw($('ek-' + pid + '-' + (i + 1)), -1.5, 220);
  }, 180);
  if (nowMade) {
    setTimeout(function () {
      settle(pid, -dir * 3 * s); audio.hawse(.8);
      chalkTimeReveal(pid);
    }, 400);
    setTimeout(function () { UI.animCount--; reflake(pid, function () { afterMade(pid, true); }); }, 1200);
  } else {
    setTimeout(function () { UI.animCount--; scheduleRender(); }, 720);
  }
}
function chalkTimeReveal(pid) {
  var g = runGroup(pid); if (!g) return; var rec = recView(pid), ch = D.LAY.chalk(0), ns = 'http://www.w3.org/2000/svg';
  var chalk = g.querySelector('.chalk'), id = 'cpT-' + pid, w = ch.timeSize * 2.6;
  var cp = document.createElementNS(ns, 'clipPath'); cp.setAttribute('id', id);
  var r = document.createElementNS(ns, 'rect'); r.setAttribute('x', f(ch.timeX - w)); r.setAttribute('y', f(ch.y - ch.timeSize)); r.setAttribute('width', '0'); r.setAttribute('height', f(ch.timeSize * 1.4)); cp.appendChild(r); $('dyn').appendChild(cp);
  var wrap = document.createElementNS(ns, 'g'); wrap.setAttribute('clip-path', 'url(#' + id + ')');
  wrap.innerHTML = chalkText('cp time', ch.timeX, ch.y, ch.timeSize, 'end', D.LI.chalk, pid === DEV.me ? 1 : .8, rec.doneAt || timeNow());
  chalk.appendChild(wrap);
  var t0 = performance.now(); (function step(t) { var p = Math.min(1, (t - t0) / 400); r.setAttribute('width', f(w * p)); if (p < 1) requestAnimationFrame(step); })(t0);
}
function afterMade(pid, animated) {
  if (!allMade()) { UI.allHandsPending = false; return; }
  if (!animated || !ANIM) { UI.allHandsPending = false; scheduleRender(); return; }
  setTimeout(function () {
    S.roster.forEach(function (p) { var g = runGroup(p.id); if (!g) return; var dir = +g.dataset.dir; settle(p.id, -dir * 6 * D.LAY.s); setTimeout(function () { settle(p.id, -dir * 3 * D.LAY.s); }, 300); });
    audio.bell(null, .5);
    setTimeout(function () {
      var r = $('cpAHr'); if (!r) { UI.allHandsPending = false; scheduleRender(); return; }
      var w = D.LAY.allHands.size * 6.2, t0 = performance.now();
      (function step(t) { var p = Math.min(1, (t - t0) / 600); r.setAttribute('width', f(w * p)); if (p < 1) requestAnimationFrame(step); else { UI.allHandsPending = false; if (!r.isConnected) scheduleRender(); } })(t0);
    }, 200);
  }, 150);
}
function reflake(pid, done) {
  var recs = todayRecs(), order = slotOrder(recs), runs = Array.prototype.slice.call(document.querySelectorAll('#runs .run')), maxD = 0, y0 = D.LAY.rowY(0);
  var mover = runGroup(pid), from = mover ? +mover.dataset.slot : 0, to = order.findIndex(function (q) { return q.id === pid; });
  if (!ANIM || from === to) { render(); if (done) done(); return; }
  UI.animCount++;
  $('turns').style.opacity = '0'; $('turnsh').style.opacity = '0';
  var idx = 0;
  runs.sort(function (a, b) { return +a.dataset.slot - +b.dataset.slot; }).forEach(function (g) {
    var p = g.dataset.pid, f0 = +g.dataset.slot, t1 = order.findIndex(function (q) { return q.id === p; }); if (f0 === t1) return;
    var dur = p === pid ? 380 + 150 * (Math.abs(f0 - t1) - 1) : 380, delay = p === pid ? 0 : 60 * idx++;
    var m = MOTION[p] || { x: 0 }; var tx = m.x || 0;
    g.style.willChange = 'transform'; g.style.transition = 'transform ' + dur + 'ms cubic-bezier(.3,.7,.2,1) ' + delay + 'ms';
    g.dataset.slot = String(t1);
    requestAnimationFrame(function () { g.style.transform = 'translate(' + f(tx) + 'px,' + f(D.LAY.rowY(t1) - y0) + 'px)'; });
    maxD = Math.max(maxD, dur + delay);
  });
  audio.drag(.4);
  setTimeout(function () { UI.animCount--; render(); if (done) done(); }, maxD + 60);
}
function openLink(pid, i) {
  var rec = recView(pid); if (!rec || rec.links[i] == null) return;
  var wasMade = isMadeView(rec);
  applyLink(pid, TASKS[i], null); UI.allHandsPending = false;
  if (pid === DEV.me) { pendingSet(pid, TASKS[i], null); sync.setLink(pid, TASKS[i], null).catch(function (e) { console.warn('setLink', e); }); }
  var use = $('lk-' + pid + '-' + i);
  if (!ANIM || !use) { scheduleRender(); return; }
  UI.animCount++;
  var v = variety(pid), lap = use.cloneNode(false); lap.setAttribute('href', '#lk-lap'); lap.removeAttribute('id');
  lap.setAttribute('style', '--rust:' + f(v.rust[i]) + ';--polish:' + f(v.pol[i]) + ';--jaw:0deg');
  use.parentNode.replaceChild(lap, use);
  var shd = $('sh-' + pid + '-' + i); if (shd) { shd.setAttribute('href', '#sil-lap'); shd.style.setProperty('--jaw', '0deg'); }
  requestAnimationFrame(function () { requestAnimationFrame(function () { lap.style.setProperty('--jaw', '-38deg'); if (shd) shd.style.setProperty('--jaw', '-38deg'); }); });
  audio.tick();
  if (wasMade) {
    var g = runGroup(pid), cur = g && g.querySelector('.times [data-role="time"]:not(.struck)');
    if (cur) { var w = cur.getComputedTextLength(), x = parseFloat(cur.getAttribute('x')) - w, y = parseFloat(cur.getAttribute('y')), size = parseFloat(cur.getAttribute('font-size')), l = strike(x, y, w, size, cur.getAttribute('fill')); cur.parentNode.appendChild(l); if (ANIM) { l.setAttribute('x2', f(x - 2)); l.setAttribute('y2', l.getAttribute('y1')); var t0 = performance.now(); (function step(t) { var p = Math.min(1, (t - t0) / 160); l.setAttribute('x2', f(x - 2 + (w + 4) * p)); l.setAttribute('y2', f(y - size * .3 + 1 - (size * .08 + 2) * p)); if (p < 1) requestAnimationFrame(step); })(t0); } }
    setTimeout(function () { settle(pid, 0); }, 200);
    setTimeout(function () { UI.animCount--; reflake(pid); }, 700);
  } else {
    setTimeout(function () { UI.animCount--; scheduleRender(); }, 300);
  }
}

/* ---------- midnight ----------
   Nothing is evaluated or stored: the date moves, and the counts, the parted markers and the fresh chain follow from the
   anchors and the day records. Eight bells and the haul only when midnight is caught live; a page that was closed at midnight
   just shows the new day on the next open. */
function checkRollover(animated) {
  var n = clock.now(), key = dateKey(n);
  if (S.dayOf === null) { S.dayOf = key; return Promise.resolve(false); }
  if (key === S.dayOf || UI.busy) return Promise.resolve(false);
  var fresh = key > S.dayOf && n.getHours() === 0 && n.getMinutes() < 5;
  if (animated && fresh && ANIM && document.visibilityState === 'visible' && S.ready) return midnightSequence(key);
  S.dayOf = key; clock.notify(); render(); return Promise.resolve(true);
}
function midnightSequence(key) {
  UI.busy = true; audio.eightBells();
  var recs = todayRecs(), parting = S.roster.filter(function (p) { return !isMadeView(recs[p.id]); });
  var tBells = audio.ok() ? 3600 : 600;
  return new Promise(function (resolve) {
    setTimeout(function () {
      parting.forEach(function (p) { var m = $('mk-' + p.id), sh = $('msh-' + p.id); if (m) m.setAttribute('href', '#lk-parted'); if (sh) sh.setAttribute('href', '#sil-parted'); });
      audio.snap();
    }, tBells);
    setTimeout(function () {
      haul(1, 1200, function () {
        S.dayOf = key; clock.notify();
        render(); var o = $('runs'); if (o) o.style.opacity = '0';
        haul(-1, 1200, function () { UI.busy = false; render(); resolve(true); });
      });
    }, tBells + 400);
  });
}
/* haul: dir 1 runs the chain out into the hawsepipe; -1 flakes a fresh chain in from the pad-eye */
function haul(dir, dur, done) {
  var path = $('serp'); if (!path) { done(); return; }
  var total = path.getTotalLength(), pos = chainPositions(), ids = Object.keys(pos), els = {};
  ids.forEach(function (id) { var e = $(id); if (e) els[id] = e; });
  document.querySelectorAll('#runs .sh, #runs .mottle, #runs .chalk, #runs .circles, #turnsh, #grime').forEach(function (e) { e.style.opacity = '0'; });
  var runs = $('runs'); runs.style.opacity = '1'; $('turns').style.opacity = '1';
  document.querySelectorAll('#runs .run').forEach(function (g) { g.style.transition = 'none'; g.style.transform = 'translate(0px,0px)'; });
  if (dir > 0) audio.hawse(1.2); else audio.drag(1.2);
  var t0 = performance.now(), s = D.LAY.s;
  function place(id, sp) {
    var e = els[id]; if (!e) return;
    if (sp < 0 || sp > total) { e.setAttribute('opacity', '0'); return; }
    e.setAttribute('opacity', '1');
    var p = path.getPointAtLength(sp), q = path.getPointAtLength(Math.min(total, sp + 1)), ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
    var rot = (hash(id) % 5) - 2;
    e.setAttribute('transform', 'translate(' + f(p.x) + ',' + f(p.y) + ') scale(' + f(s) + ') rotate(' + f(ang + rot) + ')');
  }
  (function step(t) {
    var p = Math.min(1, (t - t0) / dur), e = p * p * (3 - 2 * p), shift = dir > 0 ? total * e : total * (1 - e);
    ids.forEach(function (id) { place(id, pos[id] + (dir > 0 ? shift : -shift)); });
    if (p < 1) requestAnimationFrame(step); else done();
  })(t0);
}

/* ---------- sync: snapshots in, diff, animate ----------
   The adapter hands over the whole crew every time. The deck keeps an applied copy (S) and animates only what changed in
   another person's run today; this device's own taps were animated when they happened and are held through PENDING until
   the snapshot echoes them. */
var firstSnap = true;
function reconcile(snap) {
  if (!snap || !Array.isArray(snap.roster)) return;
  if (S.dayOf === null) S.dayOf = clock.key();
  var before = S.ready ? todayRecs() : null, key = S.dayOf, live = [], animatedCount = 0;
  S.roster = clone(snap.roster); S.days = clone(snap.days || {});
  if (before) {
    S.roster.forEach(function (p) {
      if (p.id === DEV.me || !before[p.id]) return;
      var b = before[p.id], a = todayRecs()[p.id];
      for (var i = 0; i < 6; i++) {
        if (a.links[i] && b.links[i] == null) {
          // catch-up is silent and instant; only events that fire while the deck is open animate (a few at a time)
          var anim = !firstSnap && document.visibilityState === 'visible' && animatedCount < 4 && !UI.busy;
          if (anim) { animatedCount++; live.push([p.id, i, a.links[i]]); S.days[key][p.id].links[TASKS[i]] = null; }
        }
      }
    });
  }
  pendingSweep(S.days, key); pendingOverlay(key);
  // identity
  if (sync.live) {
    if (DEV.me && !person(DEV.me)) DEV.me = null;
    if (!DEV.me) { UI.panel = true; UI.who = true; }
  } else if (!DEV.me || !person(DEV.me)) { DEV.me = S.roster.length ? S.roster[0].id : null; }
  S.ready = true; firstSnap = false;
  scheduleRender();
  live.forEach(function (e) { closeLink(e[0], e[1], e[2], true); });
}
function tick() { if (UI.busy) return; checkRollover(true).then(function () { clock.notify(); }).catch(function (e) { console.warn(e); }); }

/* ---------- deck-log panel: edits and claims ---------- */
function startEdit(pid, field) {
  if (UI.edit) commitEdit();                       // tapping another field commits the live one first
  var p = people().find(function (q) { return q.id === pid; }); if (!p) return;
  var el = editEl(pid, field); if (!el) return;
  var kbd = $('kbd'); UI.edit = { pid: pid, field: field, el: el, t0: performance.now() };
  kbd.value = field === 'name' ? p.name : String(p.day); kbd.setAttribute('inputmode', field === 'name' ? 'text' : 'numeric'); kbd.setAttribute('aria-hidden', 'false');
  kbd.focus(); try { kbd.select(); } catch (e) {}   // synchronous, inside the pointerup gesture, so the phone keyboard opens
}
function editInput() {
  if (!UI.edit) return; var v = $('kbd').value, E = UI.edit;
  if (E.field === 'name') v = v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 8); else v = v.replace(/\D/g, '').slice(0, 3);
  if (!E.el || !E.el.isConnected) E.el = editEl(E.pid, E.field);
  if (E.el && E.el.tagName === 'text') E.el.textContent = v || (E.field === 'name' ? '' : '1');
}
function commitEdit() {
  if (!UI.edit) return; var E = UI.edit, p = person(E.pid), v = $('kbd').value, changed = false;
  if (p) {
    if (E.field === 'name') { v = v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, 8); if (v !== (p.name || '')) { p.name = v; changed = true; } }
    else { var n = parseInt(v, 10); if (n >= 1) { n = clamp(n, 1, 999); var cur = people().find(function (q) { return q.id === E.pid; }); if (!cur || cur.day !== n) { p.anchor = { date: S.dayOf, day: n }; changed = true; } } }
  }
  UI.edit = null; $('kbd').setAttribute('aria-hidden', 'true');
  if (changed) sync.setRoster(clone(S.roster)).catch(function (e) { console.warn('setRoster', e); });
  render();
}
function claim(pid) {
  DEV.me = pid; saveDevice(); UI.who = false; UI.panel = false;
  sync.claim(pid).catch(function (e) { console.warn('claim', e); });
  render();
}

/* ---------- gestures ---------- */
var G = null;
function targetKind(el) {
  while (el && el !== document) { var cl = el.classList; if (cl) { if (cl.contains('hit')) return 'hit'; if (cl.contains('date')) return 'date'; if (cl.contains('strip')) return 'strip'; if (cl.contains('local')) return 'local'; if (cl.contains('panelBack')) return 'panelBack'; if (cl.contains('claim')) return 'claim'; if (cl.contains('edit')) return 'edit'; if (cl.contains('margin')) return 'margin'; } el = el.parentNode; }
  return 'deck';
}
function onDown(e) {
  if (G && performance.now() - G.t0 > 1500) { if (G.lp) clearTimeout(G.lp); G = null; }   // a lost pointerup must not freeze the deck
  if (G) return; var kind = targetKind(e.target);
  G = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), kind: kind, el: e.target, moved: false, scrubbed: 0, lastX: e.clientX, lp: null };
  if (kind === 'edit') e.preventDefault();   // suppresses the compatibility mousedown a touch would fire after pointerup, which blurred the input
  if (kind === 'hit' || kind === 'date') {
    G.lp = setTimeout(function () { if (!G || G.moved) return; G.done = true; longPress(G); G = null; }, 700);
  }
  if (kind === 'strip' || kind === 'date') { try { e.target.setPointerCapture(e.pointerId); } catch (x) {} }
}
function onMove(e) {
  if (!G || e.pointerId !== G.id) return;
  var dx = e.clientX - G.x0, dy = e.clientY - G.y0;
  if (!G.moved && Math.hypot(dx, dy) > 8) { G.moved = true; if (G.lp) clearTimeout(G.lp); }
  if ((G.kind === 'strip' || G.kind === 'date') && G.moved && PROTO && !UI.busy) {
    var step = e.clientX - G.lastX; G.lastX = e.clientX;
    clock.scrub(step * 4 * 60000); G.scrubbed += step; onClockChange();
  }
}
function onUp(e) {
  if (!G || e.pointerId !== G.id) return;
  var g = G; G = null; if (g.lp) clearTimeout(g.lp); if (g.done) return;
  var dt = performance.now() - g.t0, tap = !g.moved && dt < 400;
  if (!tap) return;
  switch (g.kind) {
    case 'hit': { var pid = g.el.dataset.pid, i = +g.el.dataset.i; audio.ensure(); if (pid === DEV.me && recView(pid) && recView(pid).links[i] == null && !UI.busy) closeLink(pid, i, timeNow(), true); break; }
    case 'date': case 'strip': if (PROTO) { clock.live(); onClockChange(); } break;
    case 'local': if (S.ready) { UI.panel = true; render(); } break;
    case 'panelBack': if (UI.who) break; if (UI.edit) commitEdit(); $('kbd').blur(); UI.panel = false; saveDevice(); render(); break;
    case 'claim': audio.ensure(); claim(g.el.dataset.pid); break;
    case 'edit': startEdit(g.el.dataset.pid, g.el.dataset.field); break;
    case 'margin': claim(g.el.dataset.pid); UI.panel = true; render(); break;
  }
}
function onCancel(e) { if (G && e.pointerId === G.id) { if (G.lp) clearTimeout(G.lp); G = null; } }
function longPress(g) {
  if (g.kind === 'hit') { var pid = g.el.dataset.pid, i = +g.el.dataset.i; audio.ensure(); if (pid === DEV.me && recView(pid) && recView(pid).links[i] != null && !UI.busy) { openLink(pid, i); vibrate(10); } }
  else if (g.kind === 'date') { DEV.muted = !DEV.muted; saveDevice(); vibrate(10); render(); }
}

/* ---------- clocks and ticks ---------- */
var minuteTimer = null;
function scheduleMinute() {
  if (minuteTimer) clearTimeout(minuteTimer);
  var d = clock.now(), ms = 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 20;
  minuteTimer = setTimeout(function () { tick(); scheduleRender(); scheduleMinute(); }, ms);
}
var clockRaf = false;
function onClockChange() { if (clockRaf) return; clockRaf = true; requestAnimationFrame(function () { clockRaf = false; tick(); scheduleRender(); scheduleMinute(); }); }

/* ---------- boot ---------- */
async function boot() {
  loadDevice();
  var svg = $('deck');
  svg.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
  svg.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  var kbd = $('kbd'); kbd.addEventListener('input', editInput); kbd.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commitEdit(); kbd.blur(); } });
  kbd.addEventListener('blur', function () {
    if (!UI.edit) return;
    // a blur inside 150 ms of focus is the browser's own doing (a compatibility mouse event), not Wade leaving the field: take the focus back
    if (performance.now() - UI.edit.t0 < 150) { setTimeout(function () { if (UI.edit && document.activeElement !== kbd) kbd.focus(); }, 0); return; }
    commitEdit();
  });
  svg.addEventListener('keydown', function (e) {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.classList || !e.target.classList.contains('hit')) return;
    e.preventDefault(); var pid = e.target.dataset.pid, i = +e.target.dataset.i; audio.ensure();
    if (pid === DEV.me && recView(pid) && recView(pid).links[i] == null && !UI.busy) closeLink(pid, i, timeNow(), true);
  });
  var rsz = null; window.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(function () { scheduleRender(); }, 80); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || UI.busy) return;
    checkRollover(false).then(function () { clock.notify(); }).catch(function (e) { console.warn(e); });
  });
  S.dayOf = clock.key();
  D.LAY = layout(VW(), VH());
  bakeTextures();
  sync = await chooseSync();
  UI.sync = sync;
  window.HardFive = { sync: sync, S: S, DEV: DEV, UI: UI, PENDING: PENDING, clock: clock };
  render();
  try { await sync.start(CREW, reconcile); } catch (e) { console.warn('sync start', e); }
  scheduleMinute(); setInterval(tick, 30000);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleRender(); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !Q.get('nosw')) {
    navigator.serviceWorker.register('./sw.js').catch(function (e) { console.warn('sw', e); });
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
