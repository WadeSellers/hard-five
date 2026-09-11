import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TASKS, addDays, dayNumber, dayInfo, isMade, linksOf } from '../days.js';

const full = { DIET: '0630', LIFT: '0655', OUT: '0745', GAL: '1420', READ: '1630', PHOTO: '1740' };
const partial = { DIET: '1215', LIFT: null, OUT: null, GAL: '1500', READ: null, PHOTO: null };
const rec = (links) => ({ links, doneAt: null, doneSeq: null, struck: [] });
const P = (day, date, id = 'p1') => ({ id, name: 'WADE', anchor: { date, day }, uids: [] });

test('addDays crosses months, years and leap days', () => {
  assert.equal(addDays('2026-09-11', 1), '2026-09-12');
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');   // DST weekend in New York: still one calendar day
});

test('isMade needs all six links; linksOf follows TASKS order', () => {
  assert.equal(isMade(rec(full)), true);
  assert.equal(isMade(rec(partial)), false);
  assert.equal(isMade(rec({ ...full, PHOTO: null })), false);
  assert.equal(isMade(undefined), false);
  assert.deepEqual(linksOf(rec(partial)), ['1215', null, null, '1500', null, null]);
  assert.deepEqual(linksOf(undefined), [null, null, null, null, null, null]);
  assert.equal(TASKS.length, 6);
});

test('anchor day: on the anchor date the count is the anchor day', () => {
  assert.equal(dayNumber(P(23, '2026-09-11'), '2026-09-11', {}), 23);
  assert.deepEqual(dayInfo(P(23, '2026-09-11'), '2026-09-11', {}), { day: 23, parted: false, prevDay: null });
});

test('anchor today: a fresh crew is day 1 with no parted marker', () => {
  const days = {};
  assert.deepEqual(dayInfo(P(1, '2026-09-11'), '2026-09-11', days), { day: 1, parted: false, prevDay: null });
});

test('streak: each made day adds one', () => {
  const p = P(23, '2026-09-08');
  const days = { '2026-09-08': { p1: rec(full) }, '2026-09-09': { p1: rec(full) }, '2026-09-10': { p1: rec(full) } };
  assert.equal(dayNumber(p, '2026-09-09', days), 24);
  assert.equal(dayNumber(p, '2026-09-10', days), 25);
  assert.equal(dayNumber(p, '2026-09-11', days), 26);
  assert.deepEqual(dayInfo(p, '2026-09-11', days), { day: 26, parted: false, prevDay: null });
});

test('fall to 1: a day not made parts the chain; the struck count is the previous one', () => {
  const p = P(34, '2026-09-09');
  const days = { '2026-09-09': { p1: rec(full) }, '2026-09-10': { p1: rec(partial) } };
  assert.equal(dayNumber(p, '2026-09-10', days), 35);
  assert.deepEqual(dayInfo(p, '2026-09-11', days), { day: 1, parted: true, prevDay: 35 });
});

test('fall on day 1: parted again, the struck count is 1', () => {
  const p = P(1, '2026-09-10');
  const days = { '2026-09-10': { p1: rec(partial) } };
  assert.deepEqual(dayInfo(p, '2026-09-11', days), { day: 1, parted: true, prevDay: 1 });
});

test('missing docs: a day with no record is not made', () => {
  const p = P(52, '2026-09-08');
  const days = { '2026-09-08': { p1: rec(full) } };   // 09 and 10 never written
  assert.equal(dayNumber(p, '2026-09-09', days), 53);
  assert.equal(dayNumber(p, '2026-09-10', days), 1);
  assert.deepEqual(dayInfo(p, '2026-09-11', days), { day: 1, parted: true, prevDay: 1 });
  // a record for another person on that day does not count for this one
  const days2 = { '2026-09-10': { p2: rec(full) } };
  assert.deepEqual(dayInfo(P(9, '2026-09-10'), '2026-09-11', days2), { day: 1, parted: true, prevDay: 9 });
});

test('today not yet made: the count does not change until midnight', () => {
  const p = P(23, '2026-09-10');
  const days = { '2026-09-10': { p1: rec(full) }, '2026-09-11': { p1: rec(partial) } };
  assert.deepEqual(dayInfo(p, '2026-09-11', days), { day: 24, parted: false, prevDay: null });
  // and the same day with today made still shows today's count
  const days2 = { ...days, '2026-09-11': { p1: rec(full) } };
  assert.equal(dayNumber(p, '2026-09-11', days2), 24);
  assert.equal(dayNumber(p, '2026-09-12', days2), 25);
});

test('recovery: after a fall the count climbs again from 1', () => {
  const p = P(40, '2026-09-01');
  const days = { '2026-09-01': { p1: rec(partial) }, '2026-09-02': { p1: rec(full) }, '2026-09-03': { p1: rec(full) } };
  assert.equal(dayNumber(p, '2026-09-02', days), 1);
  assert.equal(dayNumber(p, '2026-09-03', days), 2);
  assert.equal(dayNumber(p, '2026-09-04', days), 3);
  assert.deepEqual(dayInfo(p, '2026-09-04', days), { day: 3, parted: false, prevDay: null });
});

test('anchor in the future or missing: the anchor day, never parted', () => {
  assert.deepEqual(dayInfo(P(7, '2026-09-12'), '2026-09-11', {}), { day: 7, parted: false, prevDay: null });
  assert.equal(dayNumber({ id: 'p1', name: '' }, '2026-09-11', {}), 1);
  assert.equal(dayNumber(P(0, '2026-09-11'), '2026-09-11', {}), 1);
});
