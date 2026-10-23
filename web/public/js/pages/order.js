import { api } from '../api.js';
import { clear, details, h } from '../dom.js';
import { formatDateTime, formatMoney } from '../format.js';
import { createFormAlert } from '../forms.js';
import {
  label,
  ORDER_STATUS,
  REFUND_REASON,
  statusClass,
  TICKET_STATUS,
  TICKET_TYPE,
} from '../labels.js';
import { loading, requireLogin, showPageError } from './common.js';
import { valuesSummary } from './event-detail.js';

const CANCELABLE = new Set(['AWAITING_PAYMENT', 'PAID']);

export async function orderPage(ctx) {
  ctx.setTitle('Pedido');
  if (!requireLogin()) return;
  const orderId = ctx.params.id;
  const indicator = loading(ctx.root);

  let order;
  try {
    order = await api.getOrder(orderId);
  } catch (error) {
    indicator.remove();
    showPageError(ctx.root, error);
    return;
  }
  let event = null;
  try {
    event = await api.getEvent(order.eventId);
  } catch {
    event = null;
  }
  if (!ctx.isCurrent()) return;
  indicator.remove();

  const sectorsById = new Map((event?.sectors || []).map((sector) => [sector.id, sector]));
  const content = h('div', {});
  ctx.root.append(content);

  function render(current) {
    clear(content);

    content.append(
      details([
        ['Evento', event ? h('a', { href: `/events/${event.id}` }, event.name) : '', 'order-event-name'],
        ['Data do evento', event ? formatDateTime(event.startsAt) : '', 'order-event-date'],
        ['Pedido feito em', formatDateTime(current.createdAt), 'order-created-at'],
        [
          'Situação',
          h('span', { class: statusClass(current.status) }, label(ORDER_STATUS, current.status)),
          'order-status',
        ],
        current.status === 'AWAITING_PAYMENT'
          ? ['Pagar até', formatDateTime(current.paymentDeadline), 'payment-deadline']
          : null,
        current.couponCode ? ['Cupom', current.couponCode, 'order-coupon'] : null,
        current.paidAt ? ['Pago em', formatDateTime(current.paidAt), 'order-paid-at'] : null,
        current.cardLast4 ? ['Cartão final', current.cardLast4, 'order-card-last4'] : null,
        current.installments ? ['Parcelas', `${current.installments}x`, 'order-installments'] : null,
        current.refundAmount !== null && current.refundAmount !== undefined
          ? ['Valor reembolsado', formatMoney(current.refundAmount), 'order-refund-amount']
          : null,
      ]),
      h(
        'section',
        { class: 'summary', 'aria-labelledby': 'order-values-title' },
        h('h2', { id: 'order-values-title' }, 'Itens e valores'),
        valuesSummary(current, sectorsById),
      ),
    );

    const tickets = current.tickets || [];
    if (tickets.length > 0) {
      content.append(
        h('h2', {}, 'Ingressos'),
        h(
          'ul',
          { class: 'card-list', 'data-testid': 'ticket-list' },
          tickets.map((ticket) => {
            const sector = sectorsById.get(ticket.sectorId);
            return h(
              'li',
              { class: 'card', 'data-testid': 'ticket' },
              details([
                ['Código', h('span', { class: 'ticket-code' }, ticket.code), 'ticket-code'],
                ['Setor', sector ? sector.name : '', 'ticket-sector'],
                ['Tipo', label(TICKET_TYPE, ticket.type), 'ticket-type'],
                [
                  'Situação',
                  h('span', { class: statusClass(ticket.status) }, label(TICKET_STATUS, ticket.status)),
                  'ticket-status',
                ],
              ]),
            );
          }),
        ),
      );
    }

    const actions = h('div', { class: 'actions' });
    if (current.status === 'AWAITING_PAYMENT') {
      actions.append(h('a', { class: 'button', href: `/orders/${current.id}/pay` }, 'Pagar pedido'));
    }
    let cancelButton = null;
    if (CANCELABLE.has(current.status)) {
      cancelButton = h('button', { type: 'button', class: 'danger' }, 'Cancelar pedido');
      actions.append(cancelButton);
    }
    if (actions.childNodes.length > 0) content.append(actions);

    const panelArea = h('div', {});
    content.append(panelArea);

    if (cancelButton) {
      cancelButton.addEventListener('click', () => openCancelPanel(current, panelArea, cancelButton));
    }
  }

  async function openCancelPanel(current, panelArea, cancelButton) {
    clear(panelArea);
    cancelButton.disabled = true;
    const heading = h('h2', { id: 'cancel-title', tabindex: '-1' }, 'Cancelamento do pedido');
    const alert = createFormAlert('cancel-error');
    const panel = h(
      'section',
      { class: 'panel', 'aria-labelledby': 'cancel-title', 'data-testid': 'cancel-panel' },
      heading,
      alert,
    );
    panelArea.append(panel);

    const close = () => {
      clear(panelArea);
      cancelButton.disabled = false;
      cancelButton.focus();
    };
    const backButton = h('button', { type: 'button', class: 'secondary', onclick: close }, 'Voltar');

    let allowed = true;
    if (current.status === 'PAID') {
      const indicator = loading(panel);
      try {
        const quote = await api.refundQuote(current.id);
        indicator.remove();
        allowed = Boolean(quote.allowed);
        if (allowed) {
          panel.append(
            h(
              'p',
              {},
              'Valor do reembolso: ',
              h('strong', { 'data-testid': 'refund-amount' }, formatMoney(quote.refundAmount)),
            ),
          );
        } else {
          panel.append(
            h('p', { 'data-testid': 'refund-reason' }, REFUND_REASON[quote.reason] || quote.reason || ''),
          );
        }
      } catch (error) {
        indicator.remove();
        if (error.sessionExpired || !ctx.isCurrent()) return;
        alert.textContent = error.message;
        allowed = false;
      }
    }

    const actions = h('div', { class: 'actions' });
    if (allowed) {
      const confirmButton = h('button', { type: 'button', class: 'danger' }, 'Confirmar cancelamento');
      confirmButton.addEventListener('click', async () => {
        alert.textContent = '';
        confirmButton.disabled = true;
        try {
          const updated = await api.cancelOrder(current.id);
          if (!ctx.isCurrent()) return;
          render(updated);
          const status = ctx.root.querySelector('[data-testid="order-status"]');
          if (status) {
            status.setAttribute('tabindex', '-1');
            status.focus();
          }
        } catch (error) {
          if (error.sessionExpired || !ctx.isCurrent()) return;
          alert.textContent = error.message;
          confirmButton.disabled = false;
        }
      });
      actions.append(confirmButton);
    }
    actions.append(backButton);
    panel.append(actions);
    heading.focus();
  }

  render(order);
}
