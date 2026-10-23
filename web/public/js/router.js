import { clear, h } from './dom.js';

const SITE_NAME = 'Bilheteria Lab';
const routes = [];
let cleanups = [];
let renderCount = 0;
let afterRender = () => {};

export function addRoute(pattern, page) {
  routes.push({ pattern, page });
}

export function onAfterRender(callback) {
  afterRender = callback;
}

export function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export function navigate(path, { replace = false } = {}) {
  if (replace) window.history.replaceState({}, '', path);
  else window.history.pushState({}, '', path);
  render({ focus: true });
}

// Accepts only same-site paths, so a login return never leaves the application.
export function safeReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export function loginPath(returnTo = currentPath()) {
  return `/login?next=${encodeURIComponent(returnTo)}`;
}

function runCleanups() {
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch {
      // ignore cleanup failures
    }
  }
  cleanups = [];
}

export async function render({ focus = false } = {}) {
  runCleanups();
  renderCount += 1;
  const current = renderCount;
  const main = document.getElementById('main-content');
  clear(main);

  const title = h('h1', { tabindex: '-1', id: 'page-title' });
  const root = h('div', { class: 'page' });
  main.append(title, root);

  const path = window.location.pathname;
  const query = new URLSearchParams(window.location.search);
  const ctx = {
    root,
    query,
    params: {},
    isCurrent: () => current === renderCount,
    setTitle(text) {
      title.textContent = text;
      document.title = `${text} | ${SITE_NAME}`;
    },
    onCleanup(callback) {
      cleanups.push(callback);
    },
  };

  let match = null;
  for (const route of routes) {
    const result = route.pattern.exec(path);
    if (result) {
      match = route;
      ctx.params = result.groups || {};
      break;
    }
  }

  afterRender(path);
  if (focus) title.focus();

  if (!match) {
    ctx.setTitle('Página não encontrada');
    root.append(h('p', {}, h('a', { href: '/' }, 'Ver eventos')));
    return;
  }
  await match.page(ctx);
}

export function startRouter() {
  window.addEventListener('popstate', () => render({ focus: true }));
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a');
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault();
    navigate(href);
  });
  render();
}
