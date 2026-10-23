import { clear, h } from './dom.js';
import { addRoute, currentPath, loginPath, navigate, onAfterRender, startRouter } from './router.js';
import { clearSession, getSession, onSessionChange } from './session.js';
import { eventsPage } from './pages/events.js';
import { eventDetailPage } from './pages/event-detail.js';
import { registerPage } from './pages/register.js';
import { loginPage } from './pages/login.js';
import { paymentPage } from './pages/payment.js';
import { ordersPage } from './pages/orders.js';
import { orderPage } from './pages/order.js';

const UUID = '[^/]+';

addRoute(/^\/$/, eventsPage);
addRoute(new RegExp(`^/events/(?<id>${UUID})/?$`), eventDetailPage);
addRoute(/^\/register\/?$/, registerPage);
addRoute(/^\/login\/?$/, loginPage);
addRoute(new RegExp(`^/orders/(?<id>${UUID})/pay/?$`), paymentPage);
addRoute(/^\/orders\/?$/, ordersPage);
addRoute(new RegExp(`^/orders/(?<id>${UUID})/?$`), orderPage);

function navLink(href, text, path) {
  const active = href === '/' ? path === '/' : path === href;
  return h('li', {}, h('a', { href, 'aria-current': active ? 'page' : undefined }, text));
}

function renderNav(path = window.location.pathname) {
  const nav = document.getElementById('main-nav');
  clear(nav);
  const session = getSession();
  const list = h('ul', { class: 'nav-list' }, navLink('/', 'Eventos', path));
  if (session) {
    list.append(
      navLink('/orders', 'Meus pedidos', path),
      h('li', {}, h('span', { class: 'nav-user', 'data-testid': 'current-user' }, session.user?.name || '')),
      h(
        'li',
        {},
        h(
          'button',
          {
            type: 'button',
            class: 'button-link',
            onclick: () => {
              clearSession();
              navigate('/');
            },
          },
          'Sair',
        ),
      ),
    );
  } else {
    list.append(navLink('/login', 'Entrar', path), navLink('/register', 'Cadastrar', path));
  }
  nav.append(list);
}

onAfterRender(renderNav);
onSessionChange(() => renderNav());

window.addEventListener('session-expired', () => {
  if (window.location.pathname === '/login') return;
  navigate(loginPath(currentPath()), { replace: true });
});

startRouter();

