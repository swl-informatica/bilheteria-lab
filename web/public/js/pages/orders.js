import { api } from '../api.js';
import { h } from '../dom.js';
import { formatDateTime, formatMoney } from '../format.js';
import { label, ORDER_STATUS, statusClass } from '../labels.js';
import { loading, requireLogin, showPageError } from './common.js';

export async function ordersPage(ctx) {
  ctx.setTitle('Meus pedidos');
  if (!requireLogin()) return;
  const indicator = loading(ctx.root);

  let orders;
  let events;
  try {
    [orders, events] = await Promise.all([api.listOrders(), api.listEvents()]);
  } catch (error) {
    indicator.remove();
    showPageError(ctx.root, error);
    return;
  }
  if (!ctx.isCurrent()) return;
  indicator.remove();

  if (!orders || orders.length === 0) {
    ctx.root.append(h('p', { 'data-testid': 'orders-empty' }, 'Você ainda não tem pedidos.'));
    return;
  }

  const eventsById = new Map((events || []).map((event) => [event.id, event]));
  const table = h(
    'table',
    { 'data-testid': 'order-list' },
    h('caption', { class: 'visually-hidden' }, 'Pedidos do comprador, mais recentes primeiro'),
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', { scope: 'col' }, 'Evento'),
        h('th', { scope: 'col' }, 'Data do evento'),
        h('th', { scope: 'col' }, 'Pedido feito em'),
        h('th', { scope: 'col' }, 'Situação'),
        h('th', { scope: 'col' }, 'Total'),
      ),
    ),
    h(
      'tbody',
      {},
      orders.map((order) => {
        const event = eventsById.get(order.eventId);
        return h(
          'tr',
          { 'data-testid': 'order-row', 'data-order-id': order.id },
          h(
            'td',
            {},
            h('a', { href: `/orders/${order.id}`, 'data-testid': 'order-event-name' }, event ? event.name : 'Pedido'),
          ),
          h('td', { 'data-testid': 'order-event-date' }, event ? formatDateTime(event.startsAt) : ''),
          h('td', { 'data-testid': 'order-created-at' }, formatDateTime(order.createdAt)),
          h(
            'td',
            { 'data-testid': 'order-status' },
            h('span', { class: statusClass(order.status) }, label(ORDER_STATUS, order.status)),
          ),
          h('td', { 'data-testid': 'order-total' }, formatMoney(order.total)),
        );
      }),
    ),
  );
  ctx.root.append(table);
}
