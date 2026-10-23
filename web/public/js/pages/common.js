import { h } from '../dom.js';
import { loginPath, navigate } from '../router.js';
import { isLoggedIn } from '../session.js';

export function loading(root) {
  const element = h('p', { class: 'muted', role: 'status', 'data-testid': 'loading' }, 'Carregando...');
  root.append(element);
  return element;
}

// Shows an error returned while loading a page. Session expiry is handled by the router.
export function showPageError(root, error) {
  if (error.sessionExpired) return;
  root.append(h('div', { class: 'form-alert', role: 'alert', 'data-testid': 'page-error' }, error.message));
}

// Sends visitors to the login page and back. Returns false when not logged in.
export function requireLogin() {
  if (isLoggedIn()) return true;
  navigate(loginPath(), { replace: true });
  return false;
}
