export const SESSION_TIMEOUT_MS = 9 * 60 * 1000;
export const SESSION_WARNING_MS = 60 * 1000;
export const SESSION_LAST_ACTIVITY_KEY = "aae_last_activity";

export function recordSessionActivity(now = Date.now()) {
  localStorage.setItem(SESSION_LAST_ACTIVITY_KEY, String(now));
}

export function readLastSessionActivity(now = Date.now()) {
  const stored = Number(localStorage.getItem(SESSION_LAST_ACTIVITY_KEY));
  return Number.isFinite(stored) && stored > 0 ? stored : now;
}

export function sessionTimeRemaining(now = Date.now()) {
  return Math.max(0, SESSION_TIMEOUT_MS - (now - readLastSessionActivity(now)));
}

export function isSessionInactive(now = Date.now()) {
  return sessionTimeRemaining(now) === 0;
}
