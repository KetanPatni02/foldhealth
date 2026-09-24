import { describe, it, expect } from 'vitest';
import {
  monthsBetween, addMonths, periodOf, rangeLabel, indexRows,
  buildSeriesData, buildStats, buildSavings, buildDuration, buildSatisfaction, surveyForms, toCsv,
} from './employerImpactData';

const row = (m, s, mo, v, b = '') => ({ m, s, b, mo, v });

describe('months', () => {
  it('lists an inclusive range across a year boundary', () => {
    expect(monthsBetween('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
  it('shifts months both ways', () => {
    expect(addMonths('2026-01', -2)).toBe('2025-11');
    expect(addMonths('2025-12', 1)).toBe('2026-01');
  });
  it('labels periods by time frame', () => {
    expect(periodOf('2026-05', 'Month')).toBe('May 26');
    expect(periodOf('2026-05', 'Quarter')).toBe('Q2 26');
    expect(periodOf('2026-05', 'Year')).toBe('2026');
    expect(rangeLabel('2026-03', '2026-09')).toBe('Mar 2026 - Sep 2026');
  });
});

describe('buildSeriesData', () => {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
  const events = { metric: 'calls', x: 'month', agg: 'sum', series: [{ key: 'in' }, { key: 'out' }] };
  const snapshot = { metric: 'members', x: 'month', agg: 'latest', series: [{ key: 'n' }] };
  const idx = indexRows([
    row('calls', 'in', '2026-01', 10), row('calls', 'in', '2026-02', 20), row('calls', 'in', '2026-04', 5),
    row('calls', 'out', '2026-01', 1),
    row('members', 'n', '2026-01', 100), row('members', 'n', '2026-02', 110), row('members', 'n', '2026-03', 120),
  ]);

  it('gives one row per month, zero where a month has no rows', () => {
    const { data, hasData } = buildSeriesData(idx, events, { months, timeFrame: 'Month' });
    expect(hasData).toBe(true);
    expect(data.map(r => r.in)).toEqual([10, 20, 0, 5]);
    expect(data[0]).toMatchObject({ x: 'Jan 26', in: 10, out: 1 });
  });
  it('sums events within a quarter', () => {
    const { data } = buildSeriesData(idx, events, { months, timeFrame: 'Quarter' });
    expect(data).toEqual([{ x: 'Q1 26', in: 30, out: 1 }, { x: 'Q2 26', in: 5, out: 0 }]);
  });
  it('takes the last month of a quarter for a snapshot, not the sum', () => {
    const { data } = buildSeriesData(idx, snapshot, { months: months.slice(0, 3), timeFrame: 'Quarter' });
    expect(data).toEqual([{ x: 'Q1 26', n: 120 }]);
  });
  it('reports no data when the range has no rows', () => {
    expect(buildSeriesData(idx, events, { months: ['2025-06'] }).hasData).toBe(false);
  });
  it('computes the average line from the bars it sits on', () => {
    const w = { metric: 'eng', x: 'month', agg: 'sum', series: [{ key: 'a' }, { key: 'b' }], line: { key: 'avg', meanOf: ['a', 'b'] } };
    const i = indexRows([row('eng', 'a', '2026-01', 10), row('eng', 'b', '2026-01', 5)]);
    expect(buildSeriesData(i, w, { months: ['2026-01'] }).data[0].avg).toBe(7.5);
  });
  it('folds the range into categories and ranks a top list', () => {
    const w = { metric: 'meds', x: 'bucket', agg: 'sum', top: 2, series: [{ key: 'orders' }] };
    const i = indexRows([
      row('meds', 'orders', '2026-01', 5, 'A'), row('meds', 'orders', '2026-02', 5, 'A'),
      row('meds', 'orders', '2026-01', 30, 'B'), row('meds', 'orders', '2026-01', 1, 'C'),
    ]);
    expect(buildSeriesData(i, w, { months: ['2026-01', '2026-02'] }).data).toEqual([
      { x: 'B', orders: 30 }, { x: 'A', orders: 10 },
    ]);
  });
  it('keeps fixed categories in order, including empty ones', () => {
    const w = { metric: 'wd', x: 'weekday', agg: 'sum', series: [{ key: 'n' }] };
    const i = indexRows([row('wd', 'n', '2026-01', 4, 'Tue')]);
    const { data } = buildSeriesData(i, w, { months: ['2026-01'] });
    expect(data.map(r => r.x)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    expect(data[2].n).toBe(4);
  });
});

describe('cards', () => {
  it('stat windows use the last month and compute a percentage', () => {
    const i = indexRows([
      row('ne', 'count', '2026-01', 50, '3'), row('ne', 'total', '2026-01', 500, '3'),
      row('ne', 'count', '2026-02', 60, '3'), row('ne', 'total', '2026-02', 500, '3'),
    ]);
    const [s] = buildStats(i, { metric: 'ne', windows: ['3'], label: w => w }, { months: ['2026-01', '2026-02'] });
    expect(s).toMatchObject({ count: 60, total: 500, pct: 12, hasData: true });
  });
  it('savings are computed and can be negative', () => {
    const i = indexRows([row('cs', 'traditional', '2026-01', 97000, 'img'), row('cs', 'ours', '2026-01', 100000, 'img')]);
    const [c] = buildSavings(i, [{ key: 'img' }], 'cs', { months: ['2026-01'] });
    expect(c.savings).toBe(-3000);
  });
  it('duration averages minutes over visits and keeps the extremes', () => {
    const i = indexRows([
      row('d', 'total_minutes', '2026-01', 300), row('d', 'visits', '2026-01', 10), row('d', 'max', '2026-01', 55), row('d', 'min', '2026-01', 12),
      row('d', 'total_minutes', '2026-02', 100), row('d', 'visits', '2026-02', 10), row('d', 'max', '2026-02', 70), row('d', 'min', '2026-02', 9),
    ]);
    const { data } = buildDuration(i, 'd', { months: ['2026-01', '2026-02'] });
    expect(data.map(r => r.in_person)).toEqual([20, 70, 9]);
  });
  it('satisfaction gives the response rate and average score', () => {
    const i = indexRows([
      row('sat', 'sent', '2026-01', 200, 'Quiz'), row('sat', 'responded', '2026-01', 150, 'Quiz'), row('sat', 'score_sum', '2026-01', 1200, 'Quiz'),
      row('sat', 'sent', '2026-01', 10, 'Other'),
    ]);
    expect(surveyForms(i, 'sat')).toEqual(['Quiz', 'Other']);
    const s = buildSatisfaction(i, 'sat', 'Quiz', { months: ['2026-01'] });
    expect(s).toMatchObject({ sent: 200, responded: 150, notResponded: 50, averageScore: 8 });
    expect(s.data[0]).toMatchObject({ responded: 75, not_responded: 25 });
  });
});

describe('toCsv', () => {
  it('quotes cells that contain commas or quotes', () => {
    const csv = toCsv([{ x: 'Public Transportation (bus, metro)', n: 3 }, { x: 'Say "hi"', n: 1 }],
      [{ key: 'x', label: 'Category' }, { key: 'n', label: 'Count' }]);
    expect(csv).toBe('Category,Count\n"Public Transportation (bus, metro)",3\n"Say ""hi""",1');
  });
});
