import { describe, expect, it, vi } from 'vitest';
import { createResyncGate, isRealUserId } from './resyncGate';

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('createResyncGate', () => {
  it('runs once per interval for the same user', async () => {
    const c = clock();
    const gate = createResyncGate(60_000, c.now);
    const fn = vi.fn();
    await gate('u1', fn);
    await gate('u1', fn);
    c.advance(59_999);
    await gate('u1', fn);
    expect(fn).toHaveBeenCalledTimes(1);
    c.advance(1);
    await gate('u1', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('shares an in-flight run, even when forced', async () => {
    const gate = createResyncGate(60_000, clock().now);
    let release;
    const fn = vi.fn(() => new Promise(r => { release = r; }));
    const a = gate('u1', fn);
    const b = gate('u1', fn, { force: true });
    expect(b).toBe(a);
    release();
    await a;
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('lets a forced call through inside the interval', async () => {
    const gate = createResyncGate(60_000, clock().now);
    const fn = vi.fn();
    await gate('u1', fn);
    await gate('u1', fn, { force: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('always runs for a different user', async () => {
    const gate = createResyncGate(60_000, clock().now);
    const fn = vi.fn();
    await gate('u1', fn);
    await gate('u2', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('frees the gate after a failed run', async () => {
    const c = clock();
    const gate = createResyncGate(60_000, c.now);
    await expect(gate('u1', () => { throw new Error('boom'); })).rejects.toThrow('boom');
    c.advance(60_000);
    const fn = vi.fn();
    await gate('u1', fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('isRealUserId', () => {
  it('accepts uuids and rejects the dev bypass ids', () => {
    expect(isRealUserId('9d40b8bb-7b6e-4274-814f-dc0f8f766078')).toBe(true);
    expect(isRealUserId('local-dev-demo')).toBe(false);
    expect(isRealUserId('local-dev')).toBe(false);
    expect(isRealUserId(undefined)).toBe(false);
  });
});
