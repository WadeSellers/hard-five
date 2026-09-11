/* HARD FIVE : state
   Query flags, small utilities, the clock, this device's identity, and the applied snapshot the deck renders from.
   Everything on screen is derived from the last snapshot the sync adapter delivered (plus latency compensation for
   this device's own taps, see PENDING). Nothing here talks to the DOM except VW()/VH(). */
import { TASKS, linksOf, dayInfo } from './days.js';

export const Q = new URLSearchParams(location.search);
export const ANIM = Q.get('anim') !== '0';          // ?anim=0 : no motion, deterministic screenshots
export const PROTO = Q.get('proto') === '1';        // ?proto=1 : the bulkhead-strip clock scrub and the state dump
export const SYNC_MODE = Q.get('sync') || '';       // ?sync=fake : the in-memory two-tab adapter

// Layout viewport, never the visual one. ?vw/?vh pin the size layout() sees (headless Chrome will not shrink below 500 wide).
export function VW() { return +Q.get('vw') || document.documentElement.clientWidth || window.innerWidth; }
export function VH() { var b = document.getElementById('bulk'), inset = b ? b.offsetHeight : 0; return +Q.get('vh') || ((document.documentElement.clientHeight || window.innerHeight) - inset); }

/* ---------- utils ---------- */
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function f(v) { return String(Math.round(v * 100) / 100); }
export function pad2(n) { return (n < 10 ? '0' : '') + n; }
export function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
export function hhmm(d) { return pad2(d.getHours()) + pad2(d.getMinutes()); }
export function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
export function $(id) { return document.getElementById(id); }
export function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

/* ---------- storage: every touch wrapped, Safari private mode and standalone quirks included ---------- */
function area(session) { try { return session ? window.sessionStorage : window.localStorage; } catch (e) { return null; } }
export function storeGet(key, session) { try { var a = area(session); return a ? a.getItem(key) : null; } catch (e) { return null; } }
export function storeSet(key, val, session) { try { var a = area(session); if (a) a.setItem(key, val); } catch (e) {} }
export function storeDel(key, session) { try { var a = area(session); if (a) a.removeItem(key); } catch (e) {} }

/* ---------- clock: real time, ?t= freeze for tests, the prototype scrub ---------- */
export const clock = (function () {
  var base = null, frozen = false, offset = 0, t0 = Date.now(), subs = [], lastKey = null;
  var tq = Q.get('t');
  if (tq) { var m = tq.match(/^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/); if (m) { var d = new Date(); d.setHours(+m[1], +m[2], 0, 0); base = d.getTime() + Math.round(parseFloat(m[3] || '0') * 1000); frozen = Q.get('run') !== '1'; t0 = Date.now(); } }
  var c = {
    now: function () { if (base !== null) return new Date(base + (frozen ? 0 : Date.now() - t0) + offset); return new Date(Date.now() + offset); },
    key: function () { return dateKey(c.now()); },
    scrub: function (ms) { offset += ms; },
    live: function () { offset = 0; base = null; frozen = false; },
    isLive: function () { return offset === 0 && base === null; },
    // adapters subscribe to hear the deck's ticks (minute timer, 30 s tick, scrub, visibility); they get the current date key
    onChange: function (fn) { subs.push(fn); },
    notify: function () { var k = c.key(), changed = k !== lastKey; lastKey = k; subs.forEach(function (fn) { try { fn(k, changed); } catch (e) { console.warn(e); } }); }
  };
  lastKey = c.key();
  return c;
})();

/* ---------- this device: who I am on this device, and mute. Per tab under ?sync=fake so two tabs are two phones. ---------- */
var DEV_KEY = 'hardfive.device', DEV_SESSION = SYNC_MODE === 'fake';
export const DEV = { me: null, muted: false };
export function loadDevice() {
  if (Q.get('fresh') === '1') storeDel(DEV_KEY, DEV_SESSION);     // ?fresh=1 : forget this device's identity (tests)
  try { var raw = storeGet(DEV_KEY, DEV_SESSION); if (raw) { var o = JSON.parse(raw); DEV.me = o.me || null; DEV.muted = !!o.muted; } } catch (e) {}
}
export function saveDevice() { storeSet(DEV_KEY, JSON.stringify({ me: DEV.me, muted: DEV.muted }), DEV_SESSION); }

/* ---------- the applied snapshot ----------
   S.roster / S.days mirror the adapter's last snapshot. S.dayOf is the local date the deck shows. */
export const S = { dayOf: null, roster: [], days: {}, ready: false };
export function person(id) { for (var i = 0; i < S.roster.length; i++) if (S.roster[i].id === id) return S.roster[i]; return null; }
export function rawRec(pid, date) { var d = S.days[date]; return d ? d[pid] : undefined; }
function emptyLinks() { var l = {}; TASKS.forEach(function (t) { l[t] = null; }); return l; }
export function ensureRec(pid, date) {
  if (!S.days[date]) S.days[date] = {};
  var r = S.days[date][pid];
  if (!r) r = S.days[date][pid] = { links: emptyLinks(), doneAt: null, doneSeq: null, struck: [] };
  if (!r.links) r.links = emptyLinks(); if (!r.struck) r.struck = [];
  return r;
}
/* a render view of a person's day: links as an array in TASKS order. Derived; never mutate it. */
export function viewRec(pid, date) {
  var r = rawRec(pid, date);
  return { links: linksOf(r), doneAt: r && r.doneAt ? r.doneAt : null, doneSeq: r && r.doneSeq ? r.doneSeq : null, struck: r && r.struck ? r.struck.slice() : [] };
}
export function todayRecs() { var out = {}; S.roster.forEach(function (p) { out[p.id] = viewRec(p.id, S.dayOf); }); return out; }
export function isMadeView(rec) { return rec.links.every(function (t) { return t != null; }); }
/* people with the chalk-line facts derived for S.dayOf: day, parted, prevDay */
export function people() {
  return S.roster.map(function (p) { var di = dayInfo(p, S.dayOf, S.days); return { id: p.id, name: p.name || '', anchor: p.anchor, uids: p.uids || [], day: di.day, parted: di.parted, prevDay: di.prevDay, blank: !(p.name && p.name.trim()) }; });
}
export function maxTime(links) { return links.reduce(function (m, t) { return t != null && (m == null || t > m) ? t : m; }, null); }
/* apply one link change to the applied snapshot, the same arithmetic the adapters use for doneAt / doneSeq / struck */
export function applyLink(pid, task, t, date) {
  var r = ensureRec(pid, date || S.dayOf);
  r.links[task] = t;
  var links = linksOf(r), made = links.every(function (x) { return x != null; });
  if (t != null) { if (made) { r.doneAt = maxTime(links); if (!r.doneSeq) r.doneSeq = Date.now(); } }
  else { if (r.doneAt) r.struck.push(r.doneAt); r.doneAt = null; r.doneSeq = null; }
  return r;
}
/* latency compensation for this device's own taps: a write we sent that the snapshot has not echoed yet */
export const PENDING = {};
export function pendingSet(pid, task, t) { PENDING[pid + '.' + task] = { v: t, at: Date.now() }; }
export function pendingSweep(snapDays, date) {
  Object.keys(PENDING).forEach(function (k) {
    var e = PENDING[k], parts = k.split('.'), pid = parts[0], task = parts[1];
    var d = snapDays[date], v = d && d[pid] && d[pid].links ? d[pid].links[task] : null;
    if (v == null) v = null;
    if (v === e.v || Date.now() - e.at > 10000) delete PENDING[k];
  });
}
export function pendingOverlay(date) {
  Object.keys(PENDING).forEach(function (k) { var e = PENDING[k], parts = k.split('.'); applyLink(parts[0], parts[1], e.v, date); });
}
