import { api } from '../api.js';
import { details, h } from '../dom.js';
import { formatDateTime, formatMoney } from '../format.js';
import { ageRatingLabel, label, SALES_STATUS, statusClass } from '../labels.js';
import { loading, showPageError } from './common.js';

export async function eventsPage(ctx) {
  ctx.setTitle('Eventos');
  const indicator = loading(ctx.root);

  let events;
  try {
    events = await api.listEvents();
  } catch (error) {
    indicator.remove();
    showPageError(ctx.root, error);
    return;
  }
  if (!ctx.isCurrent()) return;
  indicator.remove();

  if (!events || events.length === 0) {
    ctx.root.append(h('p', { 'data-testid': 'events-empty' }, 'Nenhum evento encontrado.'));
    return;
  }

  const list = h('ul', { class: 'card-list', 'data-testid': 'event-list' });
  for (const event of events) {
    list.append(
      h(
        'li',
        { class: 'card', 'data-testid': 'event-card', 'data-event-id': event.id },
        h('h2', {}, h('a', { href: `/events/${event.id}`, 'data-testid': 'event-name' }, event.name)),
        details([
          ['Data', formatDateTime(event.startsAt), 'event-date'],
          ['Local', event.venue, 'event-venue'],
          ['Classificação', ageRatingLabel(event.ageRating), 'event-age-rating'],
          ['A partir de', formatMoney(event.minPrice), 'event-min-price'],
          [
            'Situação',
            h('span', { class: statusClass(event.salesStatus) }, label(SALES_STATUS, event.salesStatus)),
            'event-status',
          ],
        ]),
      ),
    );
  }
  ctx.root.append(list);
}
