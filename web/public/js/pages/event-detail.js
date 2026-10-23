import { api } from '../api.js';
import { clear, details, h } from '../dom.js';
import { formatDateTime, formatMoney } from '../format.js';
import { clearErrors, createField, createFormAlert, setFieldError, showApiError } from '../forms.js';
import {
  ageRatingLabel,
  HALF_PRICE_CATEGORY,
  label,
  SALES_STATUS,
  statusClass,
  TICKET_TYPE,
} from '../labels.js';
import { loginPath, navigate } from '../router.js';
import { isLoggedIn } from '../session.js';
import { loading, showPageError } from './common.js';

const QUOTE_DELAY_MS = 300;

function selectionKey(eventId) {
  return `bilheteria.selection.${eventId}`;
}

function readSelection(eventId) {
  try {
    const raw = sessionStorage.getItem(selectionKey(eventId));
    sessionStorage.removeItem(selectionKey(eventId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function itemDescription(item, sectorsById) {
  const sector = sectorsById.get(item.sectorId);
  const type = label(TICKET_TYPE, item.type);
  const category = item.halfPriceCategory ? ` (${label(HALF_PRICE_CATEGORY, item.halfPriceCategory)})` : '';
  return `${item.quantity}x ${sector ? sector.name : ''}, ${type}${category}`;
}

// Order values summary shared by the quote and the order pages.
export function valuesSummary(values, sectorsById) {
  return h(
    'div',
    {},
    h(
      'ul',
      { class: 'summary-lines', 'data-testid': 'summary-items' },
      (values.items || []).map((item) =>
        h(
          'li',
          { 'data-testid': 'summary-item' },
          `${itemDescription(item, sectorsById)}: ${formatMoney(item.unitPrice)} cada, total ${formatMoney(item.lineTotal)}`,
        ),
      ),
    ),
    details([
      ['Subtotal', formatMoney(values.subtotal), 'order-subtotal'],
      ['Desconto', formatMoney(values.discount), 'order-discount'],
      ['Taxa de serviço', formatMoney(values.serviceFee), 'service-fee'],
      ['Total', h('span', { class: 'summary-total' }, formatMoney(values.total)), 'order-total'],
    ]),
  );
}

function sectorDetails(sector) {
  return details([
    ['Inteira', formatMoney(sector.fullPrice), 'sector-full-price'],
    ['Meia-entrada', formatMoney(sector.halfPrice), 'sector-half-price'],
    ['Disponíveis', String(sector.available), 'sector-available'],
    ['Meias disponíveis', String(sector.halfAvailable), 'sector-half-available'],
  ]);
}

export async function eventDetailPage(ctx) {
  ctx.setTitle('Evento');
  const eventId = ctx.params.id;
  const indicator = loading(ctx.root);

  let event;
  try {
    event = await api.getEvent(eventId);
  } catch (error) {
    indicator.remove();
    showPageError(ctx.root, error);
    return;
  }
  if (!ctx.isCurrent()) return;
  indicator.remove();

  ctx.setTitle(event.name);
  const sectors = event.sectors || [];
  const sectorsById = new Map(sectors.map((sector) => [sector.id, sector]));

  ctx.root.append(
    h('p', { 'data-testid': 'event-description' }, event.description),
    details([
      ['Data', formatDateTime(event.startsAt), 'event-date'],
      ['Local', event.venue, 'event-venue'],
      ['Classificação', ageRatingLabel(event.ageRating), 'event-age-rating'],
      [
        'Situação',
        h('span', { class: statusClass(event.salesStatus) }, label(SALES_STATUS, event.salesStatus)),
        'event-status',
      ],
    ]),
    h('h2', {}, 'Setores'),
  );

  if (event.salesStatus !== 'ON_SALE') {
    ctx.root.append(
      h(
        'ul',
        { class: 'card-list', 'data-testid': 'sector-list' },
        sectors.map((sector) =>
          h(
            'li',
            { class: 'card', 'data-testid': 'sector-row', 'data-sector-id': sector.id },
            h('h3', { 'data-testid': 'sector-name' }, sector.name),
            sectorDetails(sector),
          ),
        ),
      ),
    );
    return;
  }

  renderOrderForm(ctx, event, sectors, sectorsById);
}

function renderOrderForm(ctx, event, sectors, sectorsById) {
  const alert = createFormAlert();
  const rows = [];
  const sectorList = h('ul', { class: 'card-list', 'data-testid': 'sector-list' });

  for (const sector of sectors) {
    const full = createField({
      label: 'Quantidade de inteira',
      name: `full-${sector.id}`,
      type: 'number',
      min: '0',
      step: '1',
      inputmode: 'numeric',
      value: '0',
      testId: 'full-quantity',
    });
    const half = createField({
      label: 'Quantidade de meia-entrada',
      name: `half-${sector.id}`,
      type: 'number',
      min: '0',
      step: '1',
      inputmode: 'numeric',
      value: '0',
      testId: 'half-quantity',
    });
    const category = createField({
      label: 'Categoria da meia-entrada',
      name: `category-${sector.id}`,
      control: 'select',
      options: [['', 'Selecione'], ...Object.entries(HALF_PRICE_CATEGORY)],
      testId: 'half-category',
    });
    rows.push({ sector, full, half, category });

    sectorList.append(
      h(
        'li',
        { class: 'card', 'data-testid': 'sector-row', 'data-sector-id': sector.id },
        h('h3', { 'data-testid': 'sector-name', id: `sector-${sector.id}` }, sector.name),
        sectorDetails(sector),
        h(
          'fieldset',
          {},
          h('legend', {}, `Ingressos do setor ${sector.name}`),
          h('div', { class: 'sector-inputs' }, full.wrapper, half.wrapper, category.wrapper),
        ),
      ),
    );
  }

  const coupon = createField({
    label: 'Cupom de desconto',
    name: 'couponCode',
    autocomplete: 'off',
    testId: 'coupon-code',
  });

  const summaryContent = h('div', { 'aria-live': 'polite', 'data-testid': 'order-summary' });
  const summary = h(
    'section',
    { class: 'summary', 'aria-labelledby': 'summary-title' },
    h('h2', { id: 'summary-title' }, 'Resumo do pedido'),
    summaryContent,
  );

  const submit = h('button', { type: 'submit' }, 'Reservar');
  const form = h(
    'form',
    { novalidate: true, 'aria-label': 'Escolha de ingressos', 'data-testid': 'order-form' },
    alert,
    sectorList,
    coupon.wrapper,
    summary,
    h('div', { class: 'actions' }, submit),
  );
  ctx.root.append(form);

  const restored = readSelection(event.id);
  if (restored) {
    for (const row of rows) {
      const saved = restored.sectors?.[row.sector.id];
      if (!saved) continue;
      row.full.input.value = saved.full ?? '0';
      row.half.input.value = saved.half ?? '0';
      row.category.input.value = saved.category ?? '';
    }
    coupon.input.value = restored.couponCode ?? '';
  }

  function allFields() {
    const fields = { couponCode: coupon };
    for (const row of rows) {
      fields[`full-${row.sector.id}`] = row.full;
      fields[`half-${row.sector.id}`] = row.half;
      fields[`category-${row.sector.id}`] = row.category;
    }
    return fields;
  }

  // Builds the request body and a map from API field paths to form fields.
  function buildRequest() {
    const items = [];
    const fieldMap = {};
    for (const row of rows) {
      const fullValue = row.full.input.value.trim();
      if (fullValue !== '' && Number(fullValue) !== 0) {
        const index = items.length;
        items.push({ sectorId: row.sector.id, type: 'FULL', quantity: Number(fullValue) });
        fieldMap[`items.${index}.quantity`] = row.full;
      }
      const halfValue = row.half.input.value.trim();
      if (halfValue !== '' && Number(halfValue) !== 0) {
        const index = items.length;
        const item = { sectorId: row.sector.id, type: 'HALF', quantity: Number(halfValue) };
        if (row.category.input.value) item.halfPriceCategory = row.category.input.value;
        items.push(item);
        fieldMap[`items.${index}.quantity`] = row.half;
        fieldMap[`items.${index}.halfPriceCategory`] = row.category;
      }
    }
    const body = { eventId: event.id, items };
    const couponCode = coupon.input.value;
    if (couponCode.trim() !== '') body.couponCode = couponCode;
    fieldMap.couponCode = coupon;
    return { body, fieldMap };
  }

  function showError(error, fieldMap) {
    if (error.code && error.code.startsWith('COUPON_')) {
      alert.textContent = error.message;
      setFieldError(coupon, error.message);
      return coupon;
    }
    return showApiError(error, { alert, fields: fieldMap });
  }

  function summaryHint(content) {
    clear(summaryContent);
    summaryContent.append(h('p', { class: 'muted', 'data-testid': 'summary-hint' }, content));
  }

  let quoteSequence = 0;
  let quoteTimer = null;

  async function runQuote() {
    const sequence = ++quoteSequence;
    const { body, fieldMap } = buildRequest();
    if (!isLoggedIn()) {
      summaryHint([
        'Para ver os valores, ',
        h('a', { href: loginPath(`/events/${event.id}`), onclick: saveSelection }, 'entre na sua conta'),
        '.',
      ]);
      return;
    }
    if (body.items.length === 0) {
      clearErrors({ alert, fields: allFields() });
      summaryHint('Escolha a quantidade de ingressos para ver os valores.');
      return;
    }
    try {
      const quote = await api.quoteOrder(body);
      if (sequence !== quoteSequence || !ctx.isCurrent()) return;
      clearErrors({ alert, fields: allFields() });
      clear(summaryContent);
      summaryContent.append(valuesSummary(quote || {}, sectorsById));
    } catch (error) {
      if (sequence !== quoteSequence || !ctx.isCurrent() || error.sessionExpired) return;
      clearErrors({ alert, fields: allFields() });
      clear(summaryContent);
      showError(error, fieldMap);
    }
  }

  function scheduleQuote() {
    window.clearTimeout(quoteTimer);
    quoteTimer = window.setTimeout(runQuote, QUOTE_DELAY_MS);
  }
  ctx.onCleanup(() => window.clearTimeout(quoteTimer));

  function saveSelection() {
    const saved = { sectors: {}, couponCode: coupon.input.value };
    for (const row of rows) {
      saved.sectors[row.sector.id] = {
        full: row.full.input.value,
        half: row.half.input.value,
        category: row.category.input.value,
      };
    }
    sessionStorage.setItem(selectionKey(event.id), JSON.stringify(saved));
  }

  form.addEventListener('input', scheduleQuote);
  form.addEventListener('change', scheduleQuote);

  form.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    window.clearTimeout(quoteTimer);
    quoteSequence += 1;
    if (!isLoggedIn()) {
      saveSelection();
      navigate(loginPath(`/events/${event.id}`));
      return;
    }
    clearErrors({ alert, fields: allFields() });
    const { body, fieldMap } = buildRequest();
    submit.disabled = true;
    try {
      const order = await api.createOrder(body);
      navigate(`/orders/${order.id}/pay`);
    } catch (error) {
      if (error.sessionExpired || !ctx.isCurrent()) return;
      const first = showError(error, fieldMap);
      if (first) first.input.focus();
    } finally {
      submit.disabled = false;
    }
  });

  runQuote();
}
