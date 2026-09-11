/* HARD FIVE : days
   Pure day arithmetic. No DOM, no Firebase, so node can test it (test/days.test.mjs).

   A day count is never stored per day. It is walked from the person's anchor:
     day = anchor.day on anchor.date;
     for each following date d <= date: if the previous date was made (all six links chalked), day += 1, else day = 1.
   "Made" for a date requires that date's record; a missing record is not made.

   Data shapes (the Firestore model, also what the local and fake adapters emit):
     person = { id, name, anchor: { date: 'YYYY-MM-DD', day: N }, uids: [] }
     days   = { 'YYYY-MM-DD': { [pid]: { links: { DIET: 'HHMM'|null, LIFT, OUT, GAL, READ, PHOTO }, doneAt, doneSeq, struck: [] } } }
*/
export const TASKS = ['DIET', 'LIFT', 'OUT', 'GAL', 'READ', 'PHOTO'];

const MAX_WALK = 20000;   // anchors are at most a few years back; a broken anchor must not spin

function pad2(n) { return (n < 10 ? '0' : '') + n; }

/* 'YYYY-MM-DD' + n days, as calendar arithmetic (UTC underneath so no local DST day is 23 or 25 hours long) */
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate());
}

/* the six links of a record as an array in TASKS order; a missing record is six open links */
export function linksOf(rec) {
  const l = (rec && rec.links) || {};
  return TASKS.map(t => (l[t] == null ? null : l[t]));
}

export function isMade(rec) {
  if (!rec || !rec.links) return false;
  return TASKS.every(t => rec.links[t] != null);
}

export function madeOn(pid, date, days) {
  const doc = days && days[date];
  return !!doc && isMade(doc[pid]);
}

/* the chalked day count for a person on a date */
export function dayNumber(person, date, days) {
  const a = person && person.anchor;
  if (!a || !a.date) return 1;
  const start = Math.max(1, Math.floor(+a.day) || 1);
  if (date <= a.date) return start;
  let day = start, d = a.date, guard = 0;
  while (d < date && guard++ < MAX_WALK) {
    day = madeOn(person.id, d, days) ? day + 1 : 1;
    d = addDays(d, 1);
  }
  return day;
}

/* what the chalk line shows today: the count, whether the chain parted at last midnight, and the count that was struck */
export function dayInfo(person, date, days) {
  const day = dayNumber(person, date, days);
  const a = person && person.anchor;
  const yesterday = addDays(date, -1);
  const parted = !!(a && a.date && a.date < date) && !madeOn(person.id, yesterday, days);
  return { day, parted, prevDay: parted ? dayNumber(person, yesterday, days) : null };
}
