/* HARD FIVE : deck
   One inline SVG, rebuilt from the applied snapshot by render(). layout() feeds phone and laptop; nothing else positions anything.
   The link symbols live in index.html (proto/link-symbols.svg.txt, byte for byte). */
import { TASKS } from './days.js';
import { Q, ANIM, VW, VH, clamp, f, pad2, rng, hash, esc, $, clock, DEV, S, people, todayRecs, isMadeView } from './state.js';

export const LAT = 40.7, LON = -74.0;
export const C = { deck: '#8E989B', strip: '#7F898C', stripEdge: '#6F797C', flood: '#848E91', chalk: '#F1EEE4', stencil: '#ECEAE3',
  shadow: '#5F6669', rust: '#7A5A48', red: '#B4372B', white: '#E8E4D8', blue: '#2A4B8A', yellow: '#D9B23A',
  dsDeck: '#7B6866', dsStrip: '#6E5C5A', dsStripEdge: '#5E4E4C', dsChalk: '#E9B9B2', dsStencil: '#DDB0AA', dsLap: '#9A8F8F' };
export const IRON_ME = ['#1C1C1C', '#3B3B3B', '#7A7A7A'], IRON_OTHER = ['#2A2A2A', '#4A4A4A', '#8A8A8A'];
const SHOT_PAINT = [C.red, C.white, C.blue, C.yellow, C.red];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function shotOf(day) { return clamp(Math.ceil(day / 15), 1, 5); }
function markerOf(day) { var s = shotOf(day); return { colour: SHOT_PAINT[s - 1], turns: s }; }
function runPaint(day) { var s = shotOf(day); return s === 4 ? C.yellow : s === 5 ? C.red : null; }

/* live layout and light, read by the animations in app.js */
export const D = { LAY: null, LI: null };
/* deck-level UI flags shared with app.js: the panel, WHO ARE YOU, the ALL HANDS reveal, the animation gate, the seam's name */
export const UI = { panel: false, who: false, allHandsPending: false, animCount: 0, busy: false, pendingRender: false, edit: null, sync: { name: 'LOCAL', label: 'LOCAL SAMPLE' } };
export function scheduleRender() { if (UI.animCount > 0 || UI.busy) UI.pendingRender = true; else render(); }

/* ---------- sun: simplified solar position for 40.7 N, -74.0 W ---------- */
function sunAt(d) {
  var start = new Date(d.getFullYear(), 0, 0); var N = Math.floor((d - start) / 864e5);
  var B = 2 * Math.PI / 365 * (N - 81);
  var eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  var tz = -d.getTimezoneOffset() / 60; var lstm = 15 * tz;
  var tc = 4 * (LON - lstm) + eot;
  var lt = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  var H = (15 * (lt + tc / 60 - 12)) * Math.PI / 180;
  var dec = 23.44 * Math.PI / 180 * Math.sin(B);
  var lat = LAT * Math.PI / 180;
  var sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  var alt = Math.asin(clamp(sinAlt, -1, 1));
  var cosAz = (Math.sin(dec) - sinAlt * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat) || 1e-9);
  var az = Math.acos(clamp(cosAz, -1, 1)); if (H > 0) az = 2 * Math.PI - az;
  return { alt: alt, az: az };
}

/* ---------- layout: one function feeds phone and laptop ---------- */
export function layout(vw, vh) {
  var lap = vw >= 900, L = { vw: vw, vh: vh, lap: lap }, s, ox;
  if (!lap) {
    s = Math.min(1, vw / 375); ox = Math.max(0, (vw - 375 * s) / 2);
    L.s = s; L.ox = ox; L.stripH = 48 * s;
    L.date = { x: ox + 16 * s, y: 30 * s, size: 13 * s };
    L.cd = { x: ox + 359 * s, y: 27 * s, size: 22 * s };
    L.tomid = { x: ox + 359 * s, y: 41 * s, size: 7 * s };
    L.heads = { y: 63 * s, size: 9 * s };
    L.linkX = [73, 119, 165, 211, 257, 303].map(function (x) { return ox + x * s; });
    L.connX = [50, 96, 142, 188, 234, 280, 326].map(function (x) { return ox + x * s; });
    L.rowTop = function (k) { return (72 + 84 * k) * s; };
    L.rowY = function (k) { return (72 + 84 * k + 30) * s; };
    L.chalk = function (k) { return { y: (72 + 84 * k + 66) * s, nameX: ox + 52 * s, nameSize: 12 * s, countSize: 14 * s, timeX: ox + 326 * s, timeSize: 13 * s }; };
    L.R = 30 * s; L.S = 24 * s; L.apexR = ox + 356 * s; L.apexL = ox + 20 * s;
    L.padEyeX = ox + 30 * s;
    L.hawse = { x: ox + 356 * s, dy: 60 * s };
    L.local = { x: ox + 359 * s, y: 548 * s, size: 9 * s };
    L.allHands = { x: ox + 168 * s, y: 536 * s, size: 30 * s };
    L.hit = { w: 46 * s, h: 60 * s };
    L.rustBleed = { x: ox + 30 * s, y: 72 * s + 30 * s + 12 * s, w: 30 * s, h: 18 * s };
    L.panel = { top: 110 * s, pitch: 46 * s, x0: ox + 16 * s, x1: ox + 359 * s, nameX: ox + 60 * s, size: 14 * s, margin: 44 * s };
    L.height = Math.max(vh, 560 * s);
  } else {
    s = 1.6; ox = (vw - 800) / 2; L.s = s; L.ox = ox; L.stripH = 64;
    L.date = { x: ox, y: 42, size: 20 };
    L.cd = { x: ox + 800, y: 40, size: 34 };
    L.tomid = { x: ox + 800, y: 56, size: 10 };
    L.heads = { y: 100, size: 14 };
    L.connX = [184, 256, 328, 400, 472, 544, 616].map(function (x) { return ox + x; });
    L.linkX = [220, 292, 364, 436, 508, 580].map(function (x) { return ox + x; });
    L.rowTop = function (k) { return 110 + 118 * k; };
    L.rowY = function (k) { return 110 + 118 * k + 48; };
    L.chalk = function (k) { return { y: L.rowY(k) + 7, nameX: ox + 8, nameSize: 20, countSize: 22, timeX: ox + 792, timeSize: 20 }; };
    L.R = 45; L.S = 28; L.apexR = ox + 661; L.apexL = ox + 139;
    L.padEyeX = ox + 184 - 32;
    L.hawse = { x: ox + 661, dy: 90 };
    L.local = { x: ox + 792, y: L.rowY(4) + 165, size: 12 };
    L.allHands = { x: ox + 400, y: L.rowY(4) + 140, size: 44 };
    L.hit = { w: 72, h: 96 };
    L.rustBleed = { x: ox + 152, y: L.rowY(0) + 19, w: 48, h: 29 };
    L.panel = { top: 150, pitch: 60, x0: ox + 100, x1: ox + 700, nameX: ox + 160, size: 22, margin: 60 };
    L.gutters = { left: [ox, ox + 120], right: [ox + 690, ox + 800] };
    L.height = Math.max(vh, L.rowY(4) + 190);
  }
  L.sideOf = function (k) { return k % 2 === 0 ? 'right' : 'left'; };
  L.dirOf = function (k) { return k % 2 === 0 ? 1 : -1; };
  return L;
}

/* ---------- light: sun, floodlight, darken ship ---------- */
/* Shadows use the sun shear: every link is a plate standing along its own long axis, height z0 + y, and the sun displaces each
   unit of height by K along (ux,uy), the deck direction away from the sun. K = cot(alt)/sqrt2 clamped, 0.56 at 1300 in September. */
function lighting(d) {
  var h = d.getHours() + d.getMinutes() / 60, sp = sunAt(d);
  if (h >= 20) return { mode: 'darken', deck: C.dsDeck, strip: C.dsStrip, stripEdge: C.dsStripEdge, chalk: C.dsChalk, stencil: C.dsStencil, ux: 0, uy: 1, K: .3 };
  if (sp.alt <= 0) return { mode: 'flood', deck: C.flood, strip: C.strip, stripEdge: C.stripEdge, chalk: C.chalk, stencil: C.stencil, ux: 0, uy: 1, K: .3 };
  var ux = -Math.sin(sp.az), uy = Math.max(-Math.cos(sp.az), .25), n = Math.hypot(ux, uy) || 1;
  return { mode: 'day', deck: C.deck, strip: C.strip, stripEdge: C.stripEdge, chalk: C.chalk, stencil: C.stencil, ux: ux / n, uy: uy / n, K: clamp(.7071 / Math.tan(sp.alt), .5, .9) };
}
function shear(z0, rot, roll) {
  var LI = D.LI, r = (rot || 0) * Math.PI / 180, ux = LI.ux * Math.cos(r) + LI.uy * Math.sin(r), uy = -LI.ux * Math.sin(r) + LI.uy * Math.cos(r), K = LI.K;
  if (roll) return 'matrix(1,0,' + f(ux * K * .66) + ',' + f(.75 + uy * K * .66) + ',' + f(ux * K * z0) + ',' + f(uy * K * z0) + ')';
  return 'matrix(1,0,' + f(ux * K) + ',' + f(uy * K) + ',' + f(ux * K * z0) + ',' + f(uy * K * z0) + ')';
}

/* ---------- per-person link variety (seeded, so the same iron follows the person) ---------- */
var VAR = {};
export function variety(pid) {
  if (VAR[pid]) return VAR[pid];
  var r = rng(hash(pid)), v = { wander: [], rot: [], rust: [], pol: [], ewander: [], erot: [], erust: [], epol: [] }, i;
  for (i = 0; i < 6; i++) { v.wander.push(r() * 3 - 1.2); v.rot.push(r() * 8 - 4); v.rust.push(.3 + r() * .5); v.pol.push(.3 + r() * .4); }
  for (i = 0; i < 7; i++) { v.ewander.push(r() * 2.4 - 1); v.erot.push(r() * 5 - 2.5); v.erust.push(.3 + r() * .5); v.epol.push(.3 + r() * .4); }
  return (VAR[pid] = v);
}

/* ---------- order on deck: made runs at the top in finish order, then me, then roster order ---------- */
export function slotOrder(recs, ppl) {
  ppl = ppl || people();
  var made = ppl.filter(function (p) { return isMadeView(recs[p.id]); }).sort(function (a, b) { return (recs[a.id].doneAt || '').localeCompare(recs[b.id].doneAt || '') || ((recs[a.id].doneSeq || 0) - (recs[b.id].doneSeq || 0)); });
  var rest = ppl.filter(function (p) { return !isMadeView(recs[p.id]); });
  rest.sort(function (a, b) { return a.id === DEV.me ? -1 : b.id === DEV.me ? 1 : 0; });
  return made.concat(rest);
}

/* ---------- render ---------- */
export function tr(x, y, rot) { return 'translate(' + f(x) + ',' + f(y) + ') scale(' + f(D.LAY.s) + ')' + (rot ? ' rotate(' + f(rot) + ')' : ''); }

function shadowFor(sil, x, y, rot, kind, id) {
  var s = D.LAY.s, out = '', idA = id ? ' id="' + id + '"' : '';
  if (kind === 'edge') {
    out += '<use href="#sil-edge" class="contact" transform="' + tr(x + .6 * s, y + 1.1 * s, rot) + '"/>';
    out += '<use' + idA + ' href="#sil-flat" class="shadow" transform="' + tr(x, y, rot) + ' ' + shear(11, rot) + '"/>';
  } else if (kind === 'roll') {
    out += '<use' + idA + ' href="#sil-roll" class="shadow" transform="' + tr(x, y, rot) + ' ' + shear(8.3, rot, true) + '"/>';
  } else {
    out += '<use' + idA + ' href="#' + sil + '" class="shadow" transform="' + tr(x, y, rot) + ' ' + shear(9, rot) + '"/>';
  }
  return out;
}
export function ironStyle(p) {
  var iron = p.id === DEV.me ? IRON_ME : IRON_OTHER, paint = runPaint(p.day);
  return '--i1:' + iron[0] + ';--i2:' + iron[1] + ';--i3:' + iron[2] + (paint ? ';--paint:' + paint + ';--pa:1' : '');
}
export function chalkText(cls, x, y, size, anchor, fill, opacity, text, extra) {
  var rot = (hash(text + x) % 100) / 100 * 2.2 - 1.1;
  return '<text class="' + cls + '" x="' + f(x) + '" y="' + f(y) + '" font-size="' + f(size) + '" text-anchor="' + anchor + '" fill="' + fill + '" opacity="' + opacity + '" transform="rotate(' + f(rot) + ' ' + f(x) + ' ' + f(y) + ')"' + (extra || '') + '>' + esc(text) + '</text>';
}
/* a blank name is a chalk dash: one short stroke where the name would be, the width of three letters */
export function dashW(size) { return size * 1.5; }
function chalkDash(x, y, size, fill, opacity, extra) {
  var w = dashW(size), yy = y - size * .32, r = rng(hash('dash' + x + y));
  var d = 'M' + f(x) + ',' + f(yy + (r() - .5) * .8) + ' q' + f(w * .5) + ',' + f(-(.6 + r() * .6)) + ' ' + f(w) + ',' + f((r() - .5) * .9);
  return '<path class="dash" d="' + d + '" data-x="' + f(x) + '" data-w="' + f(w) + '" fill="none" stroke="' + fill + '" stroke-width="' + f(size * .11) + '" stroke-linecap="round" opacity="' + opacity + '"' + (extra || '') + '/>';
}
function chalkCircle(x, y, seedStr) {
  var s = D.LAY.s, r = rng(hash(seedStr)), rx = 22 * s, ry = 15.5 * s, n = 11, pts = [], k, a, jr;
  var w1 = 2 + Math.floor(r() * 3), w2 = 7 + Math.floor(r() * 3);
  for (k = 0; k <= n + 2; k++) {
    a = (k / n) * 2 * Math.PI + (r() - .5) * .12 - .6;
    jr = 1 + (r() - .5) * .07; if (k % n === w1) jr += .13; if (k % n === w2) jr -= .11;
    pts.push([x + rx * jr * Math.cos(a) + (r() - .5) * 1.5 * s, y + ry * jr * Math.sin(a) + (r() - .5) * 1.5 * s]);
  }
  var d = 'M' + f(pts[0][0]) + ',' + f(pts[0][1]);
  for (k = 0; k < pts.length - 1; k++) {
    var p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
    var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C' + f(c1[0]) + ',' + f(c1[1]) + ' ' + f(c2[0]) + ',' + f(c2[1]) + ' ' + f(p2[0]) + ',' + f(p2[1]);
  }
  return '<path class="circle" d="' + d + '" fill="none" stroke="' + D.LI.chalk + '" stroke-width="' + f(1.5 * s) + '" stroke-linecap="round" opacity=".85"/>';
}

function nameChalk(cls, x, y, size, fill, opacity, p, extra) {
  if (p.blank) return chalkDash(x, y, size, fill, opacity, ' data-role="name" data-blank="1"');
  return chalkText(cls, x, y, size, 'start', fill, opacity, p.name, extra);
}

function renderRun(p, k, rec) {
  var LAY = D.LAY, LI = D.LI, s = LAY.s, y0 = LAY.rowY(0), v = variety(p.id), me = p.id === DEV.me, ist = ironStyle(p), dir = LAY.dirOf(k);
  var sh = [], lk = [], mk = [], hits = [], circles = [], i, x, y, rot, open, sym, sil, made = isMadeView(rec);
  for (i = 0; i < 6; i++) {
    x = LAY.linkX[i]; y = y0 + v.wander[i] * s; rot = v.rot[i]; open = rec.links[i] == null;
    sym = open ? 'lk-lap' : 'lk-flat'; sil = open ? 'sil-lap' : 'sil-flat';
    sh.push(shadowFor(sil, x, y, rot, open ? 'lap' : 'flat', 'sh-' + p.id + '-' + i));
    lk.push('<use id="lk-' + p.id + '-' + i + '" href="#' + sym + '" data-base="' + tr(x, y, rot) + '" transform="' + tr(x, y, rot) + '" style="' + (open ? '' : ist + ';') + '--rust:' + f(v.rust[i]) + ';--polish:' + f(v.pol[i]) + (open ? ';--jaw:-38deg' : '') + '"/>');
    mk.push('<use href="#' + sil + '" transform="' + tr(x, y, rot) + '"/>');
    if (me) hits.push('<rect class="hit" data-pid="' + p.id + '" data-i="' + i + '" x="' + f(x - LAY.hit.w / 2) + '" y="' + f(y0 - LAY.hit.h / 2) + '" width="' + f(LAY.hit.w) + '" height="' + f(LAY.hit.h) + '" role="button" tabindex="0" aria-label="' + TASKS[i] + ', ' + (open ? 'open' : 'closed') + '"/>');
    if (open && LI.circles) circles.push(chalkCircle(x, y, p.id + i + S.dayOf));
  }
  for (i = 0; i < 7; i++) {
    x = LAY.connX[i]; y = y0 + v.ewander[i] * s; rot = v.erot[i];
    sh.push(shadowFor('sil-edge', x, y, rot, 'edge'));
    lk.push('<use id="ek-' + p.id + '-' + i + '" href="#lk-edge" data-base="' + tr(x, y, rot) + '" transform="' + tr(x, y, rot) + '" style="' + ist + ';--rust:' + f(v.erust[i]) + ';--polish:' + f(v.epol[i]) + '"/>');
    mk.push('<use href="#sil-edge" transform="' + tr(x, y, rot) + '"/>');
  }
  // chalk line: name, day count (struck and rechalked if parted), completion times (struck ones kept)
  var ch = LAY.chalk(0), c = [], nameOp = me ? 1 : .8;
  c.push(nameChalk('st name', ch.nameX, ch.y, ch.nameSize, LI.chalk, nameOp, p, ' data-role="name"'));
  if (p.parted && p.prevDay > 1) {
    c.push(chalkText('cp count struck', 0, ch.y, ch.countSize, 'start', LI.chalk, nameOp, String(p.prevDay), ' font-weight="700" data-role="count"'));
    c.push(chalkText('cp count', 0, ch.y, ch.countSize, 'start', LI.chalk, nameOp, String(p.day), ' font-weight="700" data-role="count2"'));
  } else {
    c.push(chalkText('cp count', 0, ch.y, ch.countSize, 'start', LI.chalk, nameOp, String(p.day), ' font-weight="700" data-role="count"'));
  }
  var times = rec.struck.slice(); if (made && rec.doneAt) times.push(rec.doneAt);
  if (times.length) {
    c.push('<g class="times" data-n="' + times.length + '">');
    times.forEach(function (t, j) { var isCur = made && j === times.length - 1; c.push(chalkText('cp time' + (isCur ? '' : ' struck'), ch.timeX, ch.y, ch.timeSize, 'end', LI.chalk, nameOp, t, ' data-role="time"')); });
    c.push('</g>');
  }
  var dy = LAY.rowY(k) - y0, tx = made ? -dir * 3 * s : 0;
  var html = '<g class="run" id="run-' + p.id + '" data-slot="' + k + '" data-pid="' + p.id + '" data-dir="' + dir + '" style="transform:translate(' + f(tx) + 'px,' + f(dy) + 'px)">'
    + '<g class="sh">' + sh.join('') + '</g><g class="lk">' + lk.join('') + '</g>'
    + '<rect class="mottle" x="0" y="' + f(y0 - 40 * s) + '" width="' + f(LAY.vw) + '" height="' + f(80 * s) + '" fill="url(#mottle)" mask="url(#msk-' + p.id + ')"/>'
    + '<g class="chalk">' + c.join('') + '</g><g class="circles">' + circles.join('') + '</g><g class="hits">' + hits.join('') + '</g></g>';
  var defs = '<mask id="msk-' + p.id + '" maskUnits="userSpaceOnUse" x="0" y="' + f(y0 - 40 * s) + '" width="' + f(LAY.vw) + '" height="' + f(80 * s) + '"><g fill="#fff">' + mk.join('') + '</g></mask>';
  return { html: html, defs: defs };
}

function renderTurn(k, p, rec) {
  var LAY = D.LAY, s = LAY.s, y = LAY.rowY(k), R = LAY.R, Sg = LAY.S, side = LAY.sideOf(k), m = markerOf(p.day);
  var ist = ironStyle(p), edgeSt = ist + ';--rust:.55;--polish:.45';
  var mSym = p.parted ? 'lk-parted' : 'lk-flat', mSil = p.parted ? 'sil-parted' : 'sil-flat';
  var mSt = ist.replace(/;--paint:[^;]*;--pa:1/, '') + ';--paint:' + m.colour + ';--pa:1;--turns:' + m.turns + ';--rust:.6;--polish:.4';
  var r1, mk, r2 = null, cx, sh = '', lk = '', hawse = '', hawseIn = '', defs = '';
  if (side === 'right') {
    cx = LAY.connX[6];
    r1 = { x: cx + .77 * R, y: y + .55 * R, rot: 57 };
    mk = { x: LAY.apexR + .5 * s, y: k === 4 ? y + R * (p.parted ? 38 : 44) / 30 : y + R + Sg / 2, rot: 88 };
    if (k < 4) r2 = { x: cx + .77 * R, y: y + 2 * R + Sg - .55 * R, rot: -57 };
  } else {
    cx = LAY.connX[0];
    r1 = { x: cx - .77 * R, y: y + .55 * R, rot: -57 };
    mk = { x: LAY.apexL - .5 * s, y: y + R + Sg / 2, rot: 92 };
    r2 = { x: cx - .77 * R, y: y + 2 * R + Sg - .55 * R, rot: 57 };
  }
  if (k === 4) {
    var hx = LAY.hawse.x, hy = y + LAY.hawse.dy;
    hawse = '<use href="#fx-hawse" transform="' + tr(hx, hy) + '"/>';
    defs += '<clipPath id="cpPipe"><ellipse cx="' + f(hx + 1.2 * s) + '" cy="' + f(hy + s) + '" rx="' + f(14.5 * s) + '" ry="' + f(8.2 * s) + '"/></clipPath>';
    hawseIn = '<g clip-path="url(#cpPipe)"><use href="#fx-hawse-inside" transform="' + tr(hx, hy) + '"/></g>';
  }
  sh += shadowFor('sil-edge', r1.x, r1.y, r1.rot, 'edge');
  sh += shadowFor(mSil, mk.x, mk.y, mk.rot, 'marker', 'msh-' + p.id);
  if (r2) sh += shadowFor('sil-edge', r2.x, r2.y, r2.rot, 'edge');
  lk += hawse;
  lk += '<use id="tr1-' + p.id + '" href="#lk-edge" data-base="' + tr(r1.x, r1.y, r1.rot) + '" transform="' + tr(r1.x, r1.y, r1.rot) + '" style="' + edgeSt + '"/>';
  if (r2) lk += '<use id="tr2-' + p.id + '" href="#lk-edge" data-base="' + tr(r2.x, r2.y, r2.rot) + '" transform="' + tr(r2.x, r2.y, r2.rot) + '" style="' + edgeSt + '"/>';
  lk += '<use id="mk-' + p.id + '" href="#' + mSym + '" data-base="' + tr(mk.x, mk.y, mk.rot) + '" transform="' + tr(mk.x, mk.y, mk.rot) + '" style="' + mSt + '"/>';
  lk += hawseIn;
  return { sh: sh, lk: lk, defs: defs };
}

function grime() {
  var LAY = D.LAY, LI = D.LI, s = LAY.s, out = '<g id="grime">', k, y, x0 = LAY.connX[0] - 12 * s, x1 = LAY.connX[6] + 16 * s, w = x1 - x0, u = w / 304;
  function q(dx, dy) { return f(dx * u) + ',' + f(dy * s); }
  for (k = 0; k < 5; k++) {
    y = LAY.rowY(k);
    out += '<g opacity="' + (LI.mode === 'day' ? 1 : .7) + '">'
      + '<path d="M' + f(x0) + ',' + f(y - 9 * s) + ' q' + q(60, -4) + ' ' + q(120, -1) + ' t' + q(120, 2) + ' t' + q(60, -3) + ' l' + q(4, 16) + ' q' + q(-60, 5) + ' ' + q(-120, 2) + ' t' + q(-120, -3) + ' t' + q(-64, 1) + 'z" fill="#6a5d54" opacity=".16"/>'
      + '<path d="M' + f(x0 + 22 * u) + ',' + f(y - 4 * s) + ' q' + q(50, -3) + ' ' + q(96, 1) + ' t' + q(92, 1) + ' t' + q(70, -2) + ' l' + q(1, 7) + ' q' + q(-70, 3) + ' ' + q(-140, 0) + ' t' + q(-120, -1) + 'z" fill="#5b5049" opacity=".14"/></g>';
  }
  if (LAY.lap) {
    for (k = 0; k < 5; k++) { y = LAY.rowY(k); out += '<path d="M' + f(LAY.connX[0] - 20) + ',' + f(y - 12) + ' q220,-6 440,-1 l2,22 q-220,7 -444,2z" fill="#6a5d54" opacity=".1"/>'; }
  }
  var rb = LAY.rustBleed;
  out += '<ellipse cx="' + f(rb.x) + '" cy="' + f(rb.y + rb.h / 2) + '" rx="' + f(rb.w / 2) + '" ry="' + f(rb.h / 2) + '" fill="' + C.rust + '" opacity=".35"/>';
  out += '<ellipse cx="' + f(rb.x + 4 * s) + '" cy="' + f(rb.y + rb.h * .62) + '" rx="' + f(rb.w * .62) + '" ry="' + f(rb.h * .5) + '" fill="' + C.rust + '" opacity=".14"/>';
  out += '</g>';
  return out;
}

function countdownText(d) {
  var mins = Math.max(0, Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d) / 60000)) % 1440;
  return Math.floor(mins / 60) + ':' + pad2(mins % 60);
}

export function render() {
  var LAY = D.LAY = layout(VW(), VH());
  var now = clock.now(), LI = D.LI = lighting(now); LI.circles = now.getHours() === 23 && now.getMinutes() >= 30;
  var s = LAY.s, ppl = people(), recs = todayRecs(), order = slotOrder(recs, ppl), defs = [], out = [];
  UI.pendingRender = false;
  var svg = $('deck'); svg.setAttribute('data-light', LI.mode); svg.setAttribute('width', '100%'); svg.setAttribute('height', f(LAY.height)); svg.setAttribute('viewBox', '0 0 ' + f(LAY.vw) + ' ' + f(LAY.height));
  document.body.style.backgroundColor = LI.deck;
  document.body.style.backgroundImage = LI.mode === 'darken' ? (TILE.red ? 'url("' + TILE.red + '")' : 'none') : (TILE.grey ? 'url("' + TILE.grey + '")' : 'none');
  var bulk = $('bulk'); if (bulk) bulk.style.backgroundColor = LI.strip;
  $('lapStyle').textContent = LI.mode === 'darken' ? '.lap{--i1:#6F6666;--i2:' + C.dsLap + ';--i3:#B3A8A6}' : '.lap{--i1:#7D8386;--i2:#A9AFB2;--i3:#C7CBCD}';

  out.push(grime());
  // bulkhead strip
  out.push('<rect x="0" y="0" width="' + f(LAY.vw) + '" height="' + f(LAY.stripH) + '" fill="' + LI.strip + '"/>'
    + '<line x1="0" y1="' + f(LAY.stripH - .5) + '" x2="' + f(LAY.vw) + '" y2="' + f(LAY.stripH - .5) + '" stroke="' + LI.stripEdge + '" stroke-width="1"/>');
  var dateStr = pad2(now.getDate()) + ' ' + MONTHS[now.getMonth()];
  if (DEV.muted) out.push('<text class="st" x="' + f(LAY.date.x) + '" y="' + f(LAY.date.y) + '" font-size="' + f(LAY.date.size) + '" fill="none" stroke="' + LI.stencil + '" stroke-width="' + f(.7 * s) + '" opacity=".9">' + dateStr + '</text>');
  else out.push('<text class="st" x="' + f(LAY.date.x) + '" y="' + f(LAY.date.y) + '" font-size="' + f(LAY.date.size) + '" fill="' + LI.stencil + '">' + dateStr + '</text>');
  out.push(chalkText('cp', LAY.cd.x, LAY.cd.y, LAY.cd.size, 'end', LI.chalk, 1, countdownText(now), ' font-weight="700"'));
  out.push('<text class="st" x="' + f(LAY.tomid.x) + '" y="' + f(LAY.tomid.y) + '" font-size="' + f(LAY.tomid.size) + '" text-anchor="end" fill="' + LI.stencil + '" opacity=".7" letter-spacing=".12em">TO MIDNIGHT</text>');
  // column heads
  TASKS.forEach(function (t, i) { out.push('<text class="st" x="' + f(LAY.linkX[i]) + '" y="' + f(LAY.heads.y) + '" font-size="' + f(LAY.heads.size) + '" text-anchor="middle" fill="' + LI.stencil + '" opacity=".7">' + t + '</text>'); });
  var y0 = LAY.rowY(0);
  if (S.ready && order.length) {
    // pad-eye (fixed at slot 0)
    out.push('<g transform="' + tr(LAY.padEyeX, y0) + '"><use href="#sil-shackle" class="shadow" style="stroke:#5F6669" transform="' + shear(3, 0) + '"/></g>');
    out.push('<use href="#fx-shackle" transform="' + tr(LAY.padEyeX, y0) + '"/>');
    // turns: shadows under the runs, links over them
    var tsh = [], tlk = [];
    order.forEach(function (p, k) { var t = renderTurn(k, p, recs[p.id]); tsh.push(t.sh); tlk.push(t.lk); if (t.defs) defs.push(t.defs); });
    out.push('<g class="turnsh" id="turnsh">' + tsh.join('') + '</g>');
    // runs
    var runs = [];
    order.forEach(function (p, k) { var r = renderRun(p, k, recs[p.id]); runs.push(r.html); defs.push(r.defs); });
    out.push('<g id="runs">' + runs.join('') + '</g>');
    out.push('<g class="turns" id="turns">' + tlk.join('') + '<use href="#fx-shackle-over" transform="' + tr(LAY.padEyeX, y0) + '"/></g>');
    // hidden serpentine path for the midnight haul
    out.push('<path id="serp" d="' + serpentine() + '" fill="none" stroke="none"/>');
    // ALL HANDS: on the deck whenever the chain is made. Hidden only while an animated reveal is pending.
    var allMade = order.every(function (p) { return isMadeView(recs[p.id]); });
    if (allMade) {
      var ah = LAY.allHands, w = ah.size * 6.2;
      defs.push('<clipPath id="cpAH"><rect id="cpAHr" x="' + f(ah.x - w / 2) + '" y="' + f(ah.y - ah.size) + '" width="' + f(UI.allHandsPending && ANIM ? 0 : w) + '" height="' + f(ah.size * 1.3) + '"/></clipPath>');
      out.push('<g clip-path="url(#cpAH)"><text class="st" x="' + f(ah.x) + '" y="' + f(ah.y) + '" font-size="' + f(ah.size) + '" text-anchor="middle" fill="' + LI.stencil + '" letter-spacing=".08em">ALL HANDS</text></g>');
    }
  }
  // footer: the seam's name
  out.push('<text class="st" id="localTxt" x="' + f(LAY.local.x) + '" y="' + f(LAY.local.y) + '" font-size="' + f(LAY.local.size) + '" text-anchor="end" fill="' + LI.stencil + '" opacity=".6">' + esc(UI.sync.name) + '</text>');
  out.push('<rect class="tgt local" x="' + f(LAY.local.x - 60 * s) + '" y="' + f(LAY.local.y - 20 * s) + '" width="' + f(70 * s) + '" height="' + f(30 * s) + '"/>');
  // strip targets (date long-press; the prototype scrub)
  out.push('<rect class="tgt strip" x="0" y="0" width="' + f(LAY.vw) + '" height="' + f(LAY.stripH) + '"/>');
  out.push('<rect class="tgt date strip" x="' + f(LAY.date.x - 10 * s) + '" y="0" width="' + f(90 * s) + '" height="' + f(LAY.stripH) + '"/>');
  if (UI.panel) out.push(renderPanel(ppl));
  $('dyn').innerHTML = defs.join('');
  $('scene').innerHTML = out.join('');
  postPass();
  if (UI.edit) UI.edit.el = editEl(UI.edit.pid, UI.edit.field);   // a render mid-edit (keyboard opening fires resize) must not orphan the live text
}

function postPass() {
  var s = D.LAY.s;
  // day counts sit six px after the name; struck counts get one chalk stroke and the new count beside them
  document.querySelectorAll('#scene .run .chalk, #scene .panel .line').forEach(function (g) {
    var name = g.querySelector('[data-role="name"]'); if (!name) return;
    var blank = name.hasAttribute('data-blank'), nw = blank ? parseFloat(name.dataset.w) : name.getComputedTextLength();
    var x = (blank ? parseFloat(name.dataset.x) : parseFloat(name.getAttribute('x'))) + nw + 6 * s;
    var nm = g.querySelector('.tgt.edit[data-field="name"]'), dy = g.querySelector('.tgt.edit[data-field="day"]');
    if (nm) nm.setAttribute('width', f(nw + 10 * s));
    ['count', 'count2'].forEach(function (role) {
      var c = g.querySelector('[data-role="' + role + '"]'); if (!c) return;
      c.setAttribute('x', f(x)); c.setAttribute('transform', 'rotate(' + f((hash(role + x) % 100) / 100 * 2 - 1) + ' ' + f(x) + ' ' + c.getAttribute('y') + ')');
      var w = c.getComputedTextLength();
      if (c.classList.contains('struck')) g.appendChild(strike(x, parseFloat(c.getAttribute('y')), w, parseFloat(c.getAttribute('font-size')), c.getAttribute('fill')));
      if (dy && role === 'count') { dy.setAttribute('x', f(x - 6 * s)); dy.setAttribute('width', f(w + 40 * s)); }
      x += w + 6 * s;
    });
    var times = g.querySelector('.times');
    if (times) {
      var ts = Array.prototype.slice.call(times.querySelectorAll('[data-role="time"]')), rx = parseFloat(ts[0].getAttribute('x'));
      for (var i = ts.length - 1; i >= 0; i--) {
        var t = ts[i], w2 = t.getComputedTextLength(), y = parseFloat(t.getAttribute('y'));
        t.setAttribute('x', f(rx)); t.setAttribute('transform', 'rotate(' + f((hash('t' + i + rx) % 100) / 100 * 2 - 1) + ' ' + f(rx) + ' ' + f(y) + ')');
        if (t.classList.contains('struck')) times.appendChild(strike(rx - w2, y, w2, parseFloat(t.getAttribute('font-size')), t.getAttribute('fill')));
        rx -= w2 + 6 * s;
      }
    }
  });
}
export function strike(x, y, w, size, fill) {
  var l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  l.setAttribute('x1', f(x - 2)); l.setAttribute('y1', f(y - size * .3 + 1)); l.setAttribute('x2', f(x + w + 2)); l.setAttribute('y2', f(y - size * .38 - 1));
  l.setAttribute('stroke', fill); l.setAttribute('stroke-width', f(1.5 * D.LAY.s)); l.setAttribute('stroke-linecap', 'round'); l.setAttribute('opacity', '.9'); l.setAttribute('class', 'strike');
  return l;
}

/* the serpentine: pad-eye to hawsepipe, in layout px */
export function serpentine() {
  var LAY = D.LAY, d = '', k, y, R = LAY.R, Sg = LAY.S, x0 = LAY.connX[0], x6 = LAY.connX[6];
  d += 'M' + f(x0) + ',' + f(LAY.rowY(0));
  for (k = 0; k < 5; k++) {
    y = LAY.rowY(k);
    if (k % 2 === 0) {
      d += ' L' + f(x6) + ',' + f(y);
      if (k === 4) { d += ' A' + f(R) + ',' + f(R) + ' 0 0 1 ' + f(LAY.apexR) + ',' + f(y + R) + ' L' + f(LAY.apexR) + ',' + f(y + LAY.hawse.dy); }
      else d += ' A' + f(R) + ',' + f(R) + ' 0 0 1 ' + f(LAY.apexR) + ',' + f(y + R) + ' L' + f(LAY.apexR) + ',' + f(y + R + Sg) + ' A' + f(R) + ',' + f(R) + ' 0 0 1 ' + f(x6) + ',' + f(y + 2 * R + Sg);
    } else {
      d += ' L' + f(x0) + ',' + f(y) + ' A' + f(R) + ',' + f(R) + ' 0 0 0 ' + f(LAY.apexL) + ',' + f(y + R) + ' L' + f(LAY.apexL) + ',' + f(y + R + Sg) + ' A' + f(R) + ',' + f(R) + ' 0 0 0 ' + f(x0) + ',' + f(y + 2 * R + Sg);
    }
  }
  return d;
}
/* arc-length position of every link along the serpentine, keyed by element id */
export function chainPositions() {
  var LAY = D.LAY, pos = {}, field = LAY.connX[6] - LAY.connX[0], turn = Math.PI * LAY.R + LAY.S, order = slotOrder(todayRecs());
  order.forEach(function (p, k) {
    var start = k * (field + turn), dir = LAY.dirOf(k), i;
    for (i = 0; i < 6; i++) pos['lk-' + p.id + '-' + i] = start + (dir > 0 ? LAY.linkX[i] - LAY.connX[0] : LAY.connX[6] - LAY.linkX[i]);
    for (i = 0; i < 7; i++) pos['ek-' + p.id + '-' + i] = start + (dir > 0 ? LAY.connX[i] - LAY.connX[0] : LAY.connX[6] - LAY.connX[i]);
    pos['tr1-' + p.id] = start + field + Math.PI * LAY.R / 4 + 3;
    pos['mk-' + p.id] = start + field + Math.PI * LAY.R / 2 + LAY.S / 2 + (k === 4 ? 6 : 0);
    if (k < 4) pos['tr2-' + p.id] = start + field + Math.PI * LAY.R * 3 / 4 + LAY.S - 3;
  });
  return pos;
}

/* ---------- deck-log panel (the only chrome, hidden behind LOCAL / LIVE) ----------
   Five ruled chalk lines: name and day count, ME beside the selected person, last line ADAPTER. On a device with live sync
   and no identity yet it opens by itself with one extra chalk line on top: WHO ARE YOU. Tapping a line claims that run. */
function renderPanel(ppl) {
  var LAY = D.LAY, LI = D.LI, P = LAY.panel, s = LAY.s, out = [], who = UI.who, top = P.top + (who ? P.pitch : 0);
  out.push('<g class="panel"><rect class="tgt panelBack" x="0" y="' + f(LAY.stripH) + '" width="' + f(LAY.vw) + '" height="' + f(LAY.height - LAY.stripH) + '" style="fill:' + LI.deck + ';fill-opacity:.93"/>');
  if (who) out.push(chalkText('st', P.nameX, P.top, P.size, 'start', LI.chalk, 1, 'WHO ARE YOU'));
  ppl.forEach(function (p, i) {
    var y = top + i * P.pitch;
    out.push('<g class="line" data-pid="' + p.id + '"><line x1="' + f(P.x0) + '" y1="' + f(y + 5 * s) + '" x2="' + f(P.x1) + '" y2="' + f(y + 5 * s) + '" stroke="' + LI.chalk + '" stroke-width="' + f(s) + '" opacity=".35"/>');
    if (!who && p.id === DEV.me) out.push(chalkText('st', P.x0 + 4 * s, y, P.size * .8, 'start', LI.chalk, .9, 'ME'));
    out.push(nameChalk('st name', P.nameX, y, P.size, LI.chalk, 1, p, ' data-role="name"'));
    out.push(chalkText('cp count', 0, y, P.size * 1.1, 'start', LI.chalk, 1, String(p.day), ' font-weight="700" data-role="count"'));
    if (who) {
      out.push('<rect class="tgt claim" data-pid="' + p.id + '" x="' + f(P.x0 - 8 * s) + '" y="' + f(y - P.pitch / 2) + '" width="' + f(P.x1 - P.x0 + 16 * s) + '" height="' + f(P.pitch) + '"/></g>');
    } else {
      out.push('<rect class="tgt margin" data-pid="' + p.id + '" x="' + f(P.x0 - 8 * s) + '" y="' + f(y - P.pitch / 2) + '" width="' + f(P.margin) + '" height="' + f(P.pitch) + '"/>');
      out.push('<rect class="tgt edit" data-pid="' + p.id + '" data-field="name" x="' + f(P.nameX - 4 * s) + '" y="' + f(y - P.pitch / 2) + '" width="' + f(110 * s) + '" height="' + f(P.pitch) + '"/>');
      out.push('<rect class="tgt edit" data-pid="' + p.id + '" data-field="day" x="' + f(P.nameX + 106 * s) + '" y="' + f(y - P.pitch / 2) + '" width="' + f(80 * s) + '" height="' + f(P.pitch) + '"/></g>');
    }
  });
  var y2 = top + ppl.length * P.pitch + 6 * s;
  out.push(chalkText('st', P.nameX, y2, P.size * .8, 'start', LI.chalk, .8, 'ADAPTER'));
  out.push(chalkText('st', P.nameX + 90 * s, y2, P.size * .8, 'start', LI.chalk, .8, UI.sync.label || UI.sync.name));
  out.push('</g>');
  return out.join('');
}
export function editEl(pid, field) { return document.querySelector('#scene .panel .line[data-pid="' + pid + '"] [data-role="' + (field === 'name' ? 'name' : 'count') + '"]'); }

/* ---------- textures: feTurbulence baked once to data URIs, no live filters ---------- */
export const TILE = { grey: null, red: null };
function bake(src, w, h, cb) {
  var img = new Image();
  img.onload = function () { try { var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0); cb(c.toDataURL('image/png')); } catch (e) { console.warn('bake failed', e); } };
  img.onerror = function () { console.warn('bake load failed'); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
}
function gritSvg(rgb, rgb2) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">'
    + '<filter id="g" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" stitchTiles="stitch" result="n"/>'
    + '<feColorMatrix in="n" type="matrix" values="0 0 0 0 ' + rgb[0] + '  0 0 0 0 ' + rgb[1] + '  0 0 0 0 ' + rgb[2] + '  .4 .4 .4 0 -.3"/></filter>'
    + '<filter id="b" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".028" numOctaves="3" seed="11" stitchTiles="stitch" result="n"/>'
    + '<feColorMatrix in="n" type="matrix" values="0 0 0 0 ' + rgb2[0] + '  0 0 0 0 ' + rgb2[1] + '  0 0 0 0 ' + rgb2[2] + '  .3 .3 .3 0 -.1"/></filter>'
    + '<rect width="160" height="160" filter="url(#b)"/><rect width="160" height="160" filter="url(#g)"/></svg>';
}
var MOTTLE = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><filter id="m" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">'
  + '<feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="4" seed="7" stitchTiles="stitch" result="n"/>'
  + '<feColorMatrix in="n" type="matrix" values=".33 .33 .33 0 0  .33 .33 .33 0 0  .33 .33 .33 0 0  0 0 0 0 1"/>'
  + '<feComponentTransfer><feFuncR type="linear" slope="1.1" intercept="-.05"/><feFuncG type="linear" slope="1.1" intercept="-.06"/><feFuncB type="linear" slope="1.1" intercept="-.08"/></feComponentTransfer></filter>'
  + '<rect width="96" height="96" fill="#808080"/><rect width="96" height="96" filter="url(#m)"/></svg>';
export function bakeTextures() {
  bake(gritSvg(['.45', '.49', '.5'], ['.5', '.55', '.56']), 160, 160, function (u) { TILE.grey = u; if (D.LI && D.LI.mode !== 'darken') { document.body.style.backgroundImage = 'url("' + u + '")'; document.body.style.backgroundSize = '160px 160px'; } });
  bake(gritSvg(['.42', '.36', '.35'], ['.46', '.4', '.39']), 160, 160, function (u) { TILE.red = u; if (D.LI && D.LI.mode === 'darken') { document.body.style.backgroundImage = 'url("' + u + '")'; document.body.style.backgroundSize = '160px 160px'; } });
  document.body.style.backgroundSize = '160px 160px';
  bake(MOTTLE, 96, 96, function (u) { var p = document.querySelector('pattern#mottle'); if (p) p.innerHTML = '<image href="' + u + '" width="96" height="96"/>'; });
}
