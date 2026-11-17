// Rate limit for "resync" fetches: the ones that fire on realtime
// (re)subscribe, tab refocus and reconnect rather than because data changed.
//
// On 2026-10-21 those paths took down the production database: long-lived
// preview tabs re-ran the same notification / unread-count queries on every
// socket flap and refocus, and as the database slowed the realtime sockets
// flapped more, which fired more refetches. A gate per query breaks that loop.
//
// Per key (the signed-in user id): at most one run per `minIntervalMs`, and
// calls that arrive while one is in flight share it. `force` skips the
// interval (a real change event) but still shares an in-flight run. A new key
// always runs, so switching users never shows the previous user's data.

export const RESYNC_MIN_INTERVAL_MS = 60_000;

export function createResyncGate(minIntervalMs = RESYNC_MIN_INTERVAL_MS, now = () => Date.now()) {
  let inFlight = null;
  let inFlightKey = null;
  let lastKey = null;
  let lastStart = -Infinity;

  return function run(key, fn, { force = false } = {}) {
    if (inFlight && inFlightKey === key) return inFlight;
    if (!force && key === lastKey && now() - lastStart < minIntervalMs) return Promise.resolve();
    lastKey = key;
    lastStart = now();
    inFlightKey = key;
    // Start fn now (a sync throw still becomes a rejection) so calls in the
    // same tick see it as in flight.
    const p = new Promise((resolve) => { resolve(fn()); })
      .finally(() => {
        if (inFlight === p) { inFlight = null; inFlightKey = null; }
      });
    inFlight = p;
    return p;
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The no-session dev bypass uses synthetic ids ("local-dev-demo",
// "local-dev"). With no session, RLS returns nothing anyway, and Postgres
// rejects the id as an invalid uuid, so per-user queries keyed on it are
// pure load. Callers skip the network when this is false.
export function isRealUserId(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}
