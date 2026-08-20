const overrides = new Map(); // uid -> "requested" | "following" | "none"
const listeners = new Set();

/** Call the instant the user clicks, before the network request resolves. */
export function setOptimistic(uid, state) {
  if (state === null) overrides.delete(uid);
  else overrides.set(uid, state);
  listeners.forEach(fn => fn());
}

export function getOptimistic(uid) {
  return overrides.get(uid) || null;
}

/** Real Firestore data just arrived — it's authoritative, so any guess for it is stale now. */
export function clearAllOptimistic() {
  if (overrides.size === 0) return;
  overrides.clear();
  listeners.forEach(fn => fn());
}

/** Re-render whenever an optimistic override is set or cleared. */
export function onOptimisticChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
