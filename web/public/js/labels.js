export const SALES_STATUS = {
  ON_SALE: 'À venda',
  UPCOMING: 'Em breve',
  SOLD_OUT: 'Esgotado',
  SALES_CLOSED: 'Vendas encerradas',
  HELD: 'Realizado',
  CANCELED: 'Cancelado',
};

export const ORDER_STATUS = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  FAILED: 'Pagamento recusado',
  EXPIRED: 'Expirado',
  CANCELED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export const TICKET_STATUS = {
  VALID: 'Válido',
  USED: 'Utilizado',
  CANCELED: 'Cancelado',
};

export const TICKET_TYPE = {
  FULL: 'Inteira',
  HALF: 'Meia-entrada',
};

export const HALF_PRICE_CATEGORY = {
  STUDENT: 'Estudante',
  SENIOR: 'Idoso',
  DISABLED: 'Pessoa com deficiência',
  LOW_INCOME_YOUTH: 'Jovem de baixa renda',
};

// Messages for the reason codes returned by the refund quote.
export const REFUND_REASON = {
  CANCELLATION_WINDOW: 'Cancelamento permitido até 2 dias antes da data do evento.',
  TICKET_USED_CANCELLATION: 'Pedido com ingresso utilizado não pode ser cancelado.',
  INVALID_ORDER_STATE: 'Operação não permitida para o pedido na situação atual.',
};

const STATUS_TONE = {
  ON_SALE: 'positive',
  UPCOMING: 'neutral',
  SOLD_OUT: 'negative',
  SALES_CLOSED: 'muted',
  HELD: 'muted',
  CANCELED: 'negative',
  AWAITING_PAYMENT: 'neutral',
  PAID: 'positive',
  FAILED: 'negative',
  EXPIRED: 'muted',
  REFUNDED: 'muted',
  VALID: 'positive',
  USED: 'muted',
};

export function statusClass(code) {
  return `status status-${STATUS_TONE[code] || 'muted'}`;
}

export function ageRatingLabel(rating) {
  if (rating === 'L') return 'Livre';
  return rating ? `${rating} anos` : '';
}

export function label(map, code) {
  return map[code] || code || '';
}
