import { api } from '../api.js';
import { clear, details, h } from '../dom.js';
import { formatCountdown, formatDateTime, formatMoney, splitInstallments } from '../format.js';
import { clearErrors, createField, createFormAlert, showApiError } from '../forms.js';
import { label, ORDER_STATUS, statusClass } from '../labels.js';
import { navigate } from '../router.js';
import { loading, requireLogin, showPageError } from './common.js';
import { valuesSummary } from './event-detail.js';

const INSTALLMENT_OPTIONS = [1, 2, 3];
const INSTALLMENTS_MIN_TOTAL = 15000;

function installmentText(total, count) {
  const parts = splitInstallments(total, count);
  if (parts.every((part) => part === parts[0])) return `${count}x de ${formatMoney(parts[0])}`;
  return `${count}x: ${parts.map(formatMoney).join(' + ')}`;
}

function installmentsField(total) {
  const errorId = 'installments-error';
  const fieldset = h('fieldset', { 'data-testid': 'installments' }, h('legend', {}, 'Parcelas'));
  const radios = [];
  for (const count of INSTALLMENT_OPTIONS) {
    const id = `installments-${count}`;
    const radio = h('input', {
      type: 'radio',
      id,
      name: 'installments',
      value: String(count),
      checked: count === 1,
      disabled: count > 1 && total < INSTALLMENTS_MIN_TOTAL,
    });
    radios.push(radio);
    fieldset.append(
      h(
        'div',
        { class: 'radio-option', 'data-testid': 'installment-option', 'data-installments': String(count) },
        radio,
        h('label', { for: id }, installmentText(total, count)),
      ),
    );
  }
  const error = h('p', { class: 'field-error', id: errorId });
  fieldset.append(error);
  return {
    wrapper: fieldset,
    input: fieldset,
    error,
    radios,
    selected: () => Number(radios.find((radio) => radio.checked)?.value || 1),
  };
}

export async function paymentPage(ctx) {
  ctx.setTitle('Pagamento');
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
  const summary = h('section', { class: 'summary', 'aria-labelledby': 'payment-summary-title' });
  const alert = createFormAlert('payment-error');
  const declined = h('p', { class: 'field-error' });
  const paymentArea = h('div', {});
  ctx.root.append(summary, alert, declined, paymentArea);

  let countdownTimer = null;
  ctx.onCleanup(() => window.clearInterval(countdownTimer));

  function renderSummary(current) {
    clear(summary);
    summary.append(
      h('h2', { id: 'payment-summary-title' }, 'Resumo do pedido'),
      details([
        ['Evento', event ? event.name : '', 'order-event-name'],
        ['Data do evento', event ? formatDateTime(event.startsAt) : '', 'order-event-date'],
        [
          'Situação',
          h('span', { class: statusClass(current.status) }, label(ORDER_STATUS, current.status)),
          'order-status',
        ],
      ]),
      valuesSummary(current, sectorsById),
    );
  }

  function renderClosed(current) {
    window.clearInterval(countdownTimer);
    clear(paymentArea);
    paymentArea.append(h('p', {}, h('a', { href: `/orders/${current.id}` }, 'Ver pedido')));
  }

  function renderForm(current) {
    clear(paymentArea);
    const deadline = new Date(current.paymentDeadline).getTime();
    const countdown = h('span', { class: 'countdown', role: 'timer', 'data-testid': 'payment-countdown' });
    const updateCountdown = () => {
      countdown.textContent = formatCountdown(deadline - Date.now());
    };
    updateCountdown();
    window.clearInterval(countdownTimer);
    countdownTimer = window.setInterval(updateCountdown, 1000);

    const fields = {
      'card.number': createField({
        label: 'Número do cartão',
        name: 'cardNumber',
        inputmode: 'numeric',
        autocomplete: 'cc-number',
      }),
      'card.holderName': createField({ label: 'Nome do titular', name: 'holderName', autocomplete: 'cc-name' }),
      'card.expiry': createField({
        label: 'Validade',
        name: 'expiry',
        autocomplete: 'cc-exp',
        hint: 'No formato MM/AA',
        placeholder: 'MM/AA',
      }),
      'card.cvv': createField({ label: 'CVV', name: 'cvv', inputmode: 'numeric', autocomplete: 'cc-csc' }),
    };
    const installments = installmentsField(current.total);
    const submit = h('button', { type: 'submit' }, 'Pagar');

    const form = h(
      'form',
      { novalidate: true, 'aria-label': 'Pagamento com cartão de crédito', 'data-testid': 'payment-form' },
      h('p', {}, 'Pagar até ', h('span', { 'data-testid': 'payment-deadline' }, formatDateTime(current.paymentDeadline))),
      h('p', {}, 'Tempo restante para pagamento: ', countdown),
      Object.values(fields).map((field) => field.wrapper),
      installments.wrapper,
      h('div', { class: 'actions' }, submit),
    );
    paymentArea.append(form);

    const allFields = { ...fields, installments };

    form.addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      clearErrors({ alert, fields: allFields });
      declined.textContent = '';
      const body = {
        installments: installments.selected(),
        card: {
          number: fields['card.number'].input.value,
          holderName: fields['card.holderName'].input.value,
          expiry: fields['card.expiry'].input.value,
          cvv: fields['card.cvv'].input.value,
        },
      };
      submit.disabled = true;
      try {
        await api.payOrder(current.id, body);
        navigate(`/orders/${current.id}`);
      } catch (error) {
        if (error.sessionExpired || !ctx.isCurrent()) return;
        if (error.code === 'PAYMENT_DECLINED') {
          declined.textContent = error.message;
        } else {
          const first = showApiError(error, { alert, fields: allFields });
          if (first === installments) installments.radios.find((radio) => !radio.disabled)?.focus();
          else if (first) first.input.focus();
        }
        await refreshOrder();
      } finally {
        submit.disabled = false;
      }
    });
  }

  async function refreshOrder() {
    try {
      const updated = await api.getOrder(orderId);
      if (!ctx.isCurrent()) return;
      renderSummary(updated);
      if (updated.status !== 'AWAITING_PAYMENT') renderClosed(updated);
    } catch {
      // keep the current view; the error message is already shown
    }
  }

  renderSummary(order);
  if (order.status === 'AWAITING_PAYMENT') renderForm(order);
  else renderClosed(order);
}
