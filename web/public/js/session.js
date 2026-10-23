const STORAGE_KEY = 'bilheteria.session';
const listeners = new Set();

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return getSession()?.token || null;
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notify();
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

export function onSessionChange(listener) {
  listeners.add(listener);
}

function notify() {
  for (const listener of listeners) listener(getSession());
}

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) notify();
});
